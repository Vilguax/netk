import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@netk/database";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

interface PricingData {
  [typeId: string]: { buy: number; sell: number };
}

interface ItemData {
  name: string;
  quantity: number;
  typeId: number | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get appraisal with revisions
    const appraisal = await prisma.appraisal.findUnique({
      where: { id },
      include: {
        revisions: {
          orderBy: { revision: "desc" },
          take: 10, // Last 10 revisions
        }
      }
    });

    if (!appraisal) {
      return NextResponse.json(
        { error: "Appraisal non trouve" },
        { status: 404 }
      );
    }

    // Check if appraisal has expired
    if (appraisal.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Appraisal expire" },
        { status: 410 }
      );
    }

    // Check if we need to update prices (older than 2 hours)
    const lastCheck = appraisal.lastPriceCheck?.getTime() || 0;
    const needsUpdate = Date.now() - lastCheck > TWO_HOURS_MS;

    let currentPricing = appraisal.pricingData as PricingData;
    let totalBuy = Number(appraisal.totalBuy);
    let totalSell = Number(appraisal.totalSell);
    let priceChanges: Record<string, { buyDiff: number; sellDiff: number; buyPct: number; sellPct: number }> = {};

    if (needsUpdate) {
      // Get fresh prices from DB
      const items = appraisal.items as unknown as ItemData[];
      const typeIds = items
        .map(i => i.typeId)
        .filter((id): id is number => id !== null);

      const freshPrices = await prisma.marketPrice.findMany({
        where: {
          typeId: { in: typeIds },
          regionId: appraisal.regionId
        }
      });

      const priceByTypeId = new Map(
        freshPrices.map(p => [p.typeId, p])
      );

      // Calculate new totals and changes
      const newPricing: PricingData = {};
      let newTotalBuy = 0;
      let newTotalSell = 0;

      for (const item of items) {
        if (!item.typeId) continue;

        const price = priceByTypeId.get(item.typeId);
        const oldPrice = currentPricing[item.typeId.toString()];

        const buyPrice = price ? Number(price.buyPrice) : 0;
        const sellPrice = price ? Number(price.sellPrice) : 0;

        newPricing[item.typeId.toString()] = { buy: buyPrice, sell: sellPrice };
        newTotalBuy += buyPrice * item.quantity;
        newTotalSell += sellPrice * item.quantity;

        // Calculate price change
        if (oldPrice) {
          const buyDiff = buyPrice - oldPrice.buy;
          const sellDiff = sellPrice - oldPrice.sell;
          const buyPct = oldPrice.buy > 0 ? (buyDiff / oldPrice.buy) * 100 : 0;
          const sellPct = oldPrice.sell > 0 ? (sellDiff / oldPrice.sell) * 100 : 0;

          if (Math.abs(buyDiff) > 0.01 || Math.abs(sellDiff) > 0.01) {
            priceChanges[item.typeId.toString()] = {
              buyDiff,
              sellDiff,
              buyPct,
              sellPct
            };
          }
        }
      }

      // If prices changed, create a new revision
      const hasChanges = Object.keys(priceChanges).length > 0;
      if (hasChanges) {
        const newRevision = appraisal.revision + 1;

        // Update appraisal
        await prisma.appraisal.update({
          where: { id },
          data: {
            pricingData: newPricing,
            totalBuy: newTotalBuy,
            totalSell: newTotalSell,
            revision: newRevision,
            lastPriceCheck: new Date(),
          }
        });

        // Create revision record
        await prisma.appraisalRevision.create({
          data: {
            appraisalId: id,
            revision: newRevision,
            pricingData: newPricing,
            totalBuy: newTotalBuy,
            totalSell: newTotalSell,
            priceChanges,
          }
        });

        currentPricing = newPricing;
        totalBuy = newTotalBuy;
        totalSell = newTotalSell;
      } else {
        // Just update last check time
        await prisma.appraisal.update({
          where: { id },
          data: { lastPriceCheck: new Date() }
        });
      }
    }

    // Build response with item details
    const items = appraisal.items as unknown as ItemData[];
    const typeIds = items
      .map(i => i.typeId)
      .filter((id): id is number => id !== null);

    const eveTypes = await prisma.eveType.findMany({
      where: { id: { in: typeIds } }
    });

    const typeById = new Map(eveTypes.map(t => [t.id, t]));

    let totalSplit = 0;
    const appraisedItems = items.map(item => {
      const eveType = item.typeId ? typeById.get(item.typeId) : null;
      const pricing = item.typeId ? currentPricing[item.typeId.toString()] : null;

      const buyPrice = pricing?.buy || 0;
      const sellPrice = pricing?.sell || 0;
      const splitPrice = (buyPrice + sellPrice) / 2;
      const volume = eveType?.volume || 0;

      const splitTotal = splitPrice * item.quantity;
      totalSplit += splitTotal;

      return {
        typeId: item.typeId,
        name: item.name,
        quantity: item.quantity,
        buyPrice,
        splitPrice,
        sellPrice,
        buyTotal: buyPrice * item.quantity,
        splitTotal,
        sellTotal: sellPrice * item.quantity,
        volume: volume * item.quantity,
        found: !!eveType,
      };
    });

    // Format revisions for response
    const revisions = appraisal.revisions.map(rev => ({
      revision: rev.revision,
      totalBuy: Number(rev.totalBuy),
      totalSell: Number(rev.totalSell),
      priceChanges: rev.priceChanges,
      createdAt: rev.createdAt,
    }));

    return NextResponse.json({
      id: appraisal.id,
      items: appraisedItems,
      totals: {
        buy: totalBuy,
        split: totalSplit,
        sell: totalSell,
        volume: Number(appraisal.totalVolume),
        itemCount: appraisal.itemCount,
      },
      region: getRegionSlug(appraisal.regionId),
      rawInput: appraisal.rawInput,
      revision: appraisal.revision,
      revisions,
      priceChanges: needsUpdate ? priceChanges : {},
      createdAt: appraisal.createdAt,
      updatedAt: appraisal.updatedAt,
      expiresAt: appraisal.expiresAt,
    });

  } catch (error) {
    console.error("Get appraisal error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

function getRegionSlug(regionId: bigint): string {
  const regionMap: Record<string, string> = {
    "10000002": "the-forge",
    "10000043": "domain",
    "10000030": "heimatar",
    "10000032": "sinq-laison",
  };
  return regionMap[regionId.toString()] || "the-forge";
}
