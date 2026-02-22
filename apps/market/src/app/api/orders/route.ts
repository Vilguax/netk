import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { prisma } from "@netk/database";
import { esi } from "@netk/eve-api";

interface OrderWithUndercut {
  orderId: number;
  typeId: number;
  typeName: string;
  regionId: number;
  locationId: number;
  locationName: string;
  isBuyOrder: boolean;
  price: number;
  volumeTotal: number;
  volumeRemain: number;
  duration: number;
  issued: string;
  minVolume: number;
  characterId: string;
  characterName: string;
  // Undercut detection
  marketBestPrice: number | null; // best competing price
  isUndercut: boolean;
  undercutPrice: number | null; // price to set to be competitive
  escrowValue: number; // ISK locked in this order (buy orders)
}

/**
 * GET /api/orders
 *
 * Fetches active market orders for the user's EVE characters.
 * Syncs from ESI to DB, checks undercut status from market_prices.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const characters = await getUserCharacters(session.user.id);
    if (characters.length === 0) {
      return NextResponse.json({ orders: [], characters: [], totals: { sell: 0, buy: 0, escrow: 0, sellValue: 0 } });
    }

    const allOrders: OrderWithUndercut[] = [];

    const characterResults: Array<{
      characterId: string;
      characterName: string;
      status: "ok" | "no_token" | "error";
      orderCount: number;
    }> = [];

    for (const char of characters) {
      const charIdStr = char.characterId.toString();

      const accessToken = await getCharacterAccessToken(char.characterId);
      if (!accessToken) {
        characterResults.push({
          characterId: charIdStr,
          characterName: char.characterName,
          status: "no_token",
          orderCount: 0,
        });
        continue;
      }

      try {
        const esiOrders = await esi.getCharacterOrders(
          Number(char.characterId),
          accessToken
        );

        // Sync to DB
        for (const order of esiOrders) {
          await prisma.marketCharacterOrder.upsert({
            where: { orderId: BigInt(order.order_id) },
            update: {
              price: order.price,
              volumeRemain: order.volume_remain,
              state: "active",
            },
            create: {
              characterId: char.characterId,
              orderId: BigInt(order.order_id),
              typeId: order.type_id,
              regionId: BigInt(order.region_id),
              locationId: BigInt(order.location_id),
              isBuyOrder: order.is_buy_order,
              price: order.price,
              volumeTotal: order.volume_total,
              volumeRemain: order.volume_remain,
              duration: order.duration,
              issued: new Date(order.issued),
              minVolume: order.min_volume,
              state: "active",
            },
          });
        }

        // Mark orders no longer in ESI as expired
        const activeOrderIds = esiOrders.map((o) => BigInt(o.order_id));
        if (activeOrderIds.length > 0) {
          await prisma.marketCharacterOrder.updateMany({
            where: {
              characterId: char.characterId,
              state: "active",
              orderId: { notIn: activeOrderIds },
            },
            data: { state: "expired" },
          });
        } else {
          await prisma.marketCharacterOrder.updateMany({
            where: { characterId: char.characterId, state: "active" },
            data: { state: "expired" },
          });
        }

        // Resolve type names
        const typeIds = [...new Set(esiOrders.map((o) => o.type_id))];
        const typeNames = await prisma.eveType.findMany({
          where: { id: { in: typeIds } },
          select: { id: true, name: true },
        });
        const typeNameMap = new Map(typeNames.map((t) => [t.id, t.name]));

        // Get market prices for undercut detection
        const marketPrices = await prisma.marketPrice.findMany({
          where: {
            typeId: { in: typeIds },
          },
          select: { typeId: true, regionId: true, sellPrice: true, buyPrice: true },
        });

        // Build lookup: typeId+regionId -> { sellPrice, buyPrice }
        const priceMap = new Map<string, { sellPrice: number; buyPrice: number }>();
        for (const mp of marketPrices) {
          const key = `${mp.typeId}-${mp.regionId}`;
          priceMap.set(key, {
            sellPrice: Number(mp.sellPrice),
            buyPrice: Number(mp.buyPrice),
          });
        }

        // Resolve location names
        const locationIds = [...new Set(esiOrders.map((o) => o.location_id))];
        const locationNameMap = new Map<number, string>();
        for (const locId of locationIds) {
          const name = await esi.getLocationName(locId, accessToken);
          locationNameMap.set(locId, name);
        }

        for (const order of esiOrders) {
          const priceKey = `${order.type_id}-${order.region_id}`;
          const mp = priceMap.get(priceKey);

          let marketBestPrice: number | null = null;
          let isUndercut = false;
          let undercutPrice: number | null = null;

          if (mp) {
            if (order.is_buy_order) {
              // Buy order: undercut if someone is offering a higher buy price
              marketBestPrice = mp.buyPrice;
              isUndercut = mp.buyPrice > order.price;
              undercutPrice = isUndercut ? Math.round((mp.buyPrice + 0.01) * 100) / 100 : null;
            } else {
              // Sell order: undercut if someone is selling cheaper
              marketBestPrice = mp.sellPrice;
              isUndercut = mp.sellPrice > 0 && mp.sellPrice < order.price;
              undercutPrice = isUndercut ? Math.round((mp.sellPrice - 0.01) * 100) / 100 : null;
            }
          }

          allOrders.push({
            orderId: order.order_id,
            typeId: order.type_id,
            typeName: typeNameMap.get(order.type_id) || `Type #${order.type_id}`,
            regionId: order.region_id,
            locationId: order.location_id,
            locationName: locationNameMap.get(order.location_id) || `Location #${order.location_id}`,
            isBuyOrder: order.is_buy_order,
            price: order.price,
            volumeTotal: order.volume_total,
            volumeRemain: order.volume_remain,
            duration: order.duration,
            issued: order.issued,
            minVolume: order.min_volume,
            characterId: charIdStr,
            characterName: char.characterName,
            marketBestPrice,
            isUndercut,
            undercutPrice,
            escrowValue: order.is_buy_order ? order.price * order.volume_remain : 0,
          });
        }

        characterResults.push({
          characterId: charIdStr,
          characterName: char.characterName,
          status: "ok",
          orderCount: esiOrders.length,
        });
      } catch (error) {
        console.error(`[Orders] ESI error for ${char.characterName}:`, error);
        characterResults.push({
          characterId: charIdStr,
          characterName: char.characterName,
          status: "error",
          orderCount: 0,
        });
      }
    }

    // Sort: undercut first, then sell before buy, then by price desc
    allOrders.sort((a, b) => {
      if (a.isUndercut !== b.isUndercut) return a.isUndercut ? -1 : 1;
      if (a.isBuyOrder !== b.isBuyOrder) return a.isBuyOrder ? 1 : -1;
      return b.price - a.price;
    });

    const totalEscrow = allOrders.filter((o) => o.isBuyOrder).reduce((s, o) => s + o.escrowValue, 0);
    const totalSellValue = allOrders.filter((o) => !o.isBuyOrder).reduce((s, o) => s + o.price * o.volumeRemain, 0);

    return NextResponse.json({
      orders: allOrders,
      characters: characterResults,
      totalOrders: allOrders.length,
      totalSellOrders: allOrders.filter((o) => !o.isBuyOrder).length,
      totalBuyOrders: allOrders.filter((o) => o.isBuyOrder).length,
      totalUndercut: allOrders.filter((o) => o.isUndercut).length,
      totals: {
        sell: allOrders.filter((o) => !o.isBuyOrder).length,
        buy: allOrders.filter((o) => o.isBuyOrder).length,
        escrow: totalEscrow,
        sellValue: totalSellValue,
      },
    });
  } catch (error) {
    console.error("[Orders] Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
