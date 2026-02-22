// SECURITY_CSRF_EXEMPT: public compute endpoint
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@netk/database";
import { auth } from "@netk/auth";
import { parseClipboard } from "@/lib/parser";
import { nanoid } from "nanoid";
import { enforceMaxBodySize, enforceRateLimit } from "@netk/auth/security";

const TRADE_HUB_REGIONS: Record<string, bigint> = {
  "the-forge": BigInt(10000002),
  domain: BigInt(10000043),
  heimatar: BigInt(10000030),
  "sinq-laison": BigInt(10000032),
};

const REGION_NAMES: Record<string, string> = {
  "the-forge": "Jita",
  domain: "Amarr",
  heimatar: "Rens",
  "sinq-laison": "Dodixie",
};

const MAX_RAW_TEXT_CHARS = 60_000;
const MAX_LINES = 2_000;
const MAX_ITEMS_AUTH = 1_000;
const MAX_ITEMS_ANON = 300;

interface AppraisedItem {
  typeId: number | null;
  name: string;
  quantity: number;
  buyPrice: number;
  splitPrice: number;
  sellPrice: number;
  buyTotal: number;
  splitTotal: number;
  sellTotal: number;
  volume: number;
  found: boolean;
}

interface RegionPrices {
  buy: number;
  split: number;
  sell: number;
  diff: number;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    const bodyTooLarge = enforceMaxBodySize(request, 1024 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "appraisal:appraise",
      limit: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { text, region = "the-forge" } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Texte requis" }, { status: 400 });
    }

    if (text.length > MAX_RAW_TEXT_CHARS) {
      return NextResponse.json(
        { error: `Texte trop long (max ${MAX_RAW_TEXT_CHARS} caractères)` },
        { status: 400 }
      );
    }

    const lineCount = text.split(/\r?\n/).length;
    if (lineCount > MAX_LINES) {
      return NextResponse.json(
        { error: `Trop de lignes (max ${MAX_LINES})` },
        { status: 400 }
      );
    }

    const regionId = TRADE_HUB_REGIONS[region];
    if (!regionId) {
      return NextResponse.json({ error: "Region invalide" }, { status: 400 });
    }

    const parsed = parseClipboard(text);
    if (parsed.items.length === 0) {
      return NextResponse.json(
        { error: "Aucun item reconnu dans le texte" },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session?.user?.id || null;
    } catch {
      userId = null;
    }

    if (!userId) {
      const anonBurstLimit = await enforceRateLimit(request, {
        bucket: "appraisal:appraise:anon",
        limit: 10,
        windowSeconds: 60,
      });
      if (anonBurstLimit) return anonBurstLimit;

      const anonDailyLimit = await enforceRateLimit(request, {
        bucket: "appraisal:appraise:anon:day",
        limit: 200,
        windowSeconds: 24 * 60 * 60,
      });
      if (anonDailyLimit) return anonDailyLimit;
    }

    const maxItems = userId ? MAX_ITEMS_AUTH : MAX_ITEMS_ANON;
    if (parsed.items.length > maxItems) {
      return NextResponse.json(
        { error: `Trop d'items (max ${maxItems} pour ce mode)` },
        { status: 400 }
      );
    }

    const itemNames = parsed.items.map((item) => item.name);
    const eveTypes = await prisma.eveType.findMany({
      where: {
        name: { in: itemNames, mode: "insensitive" },
      },
    });

    const typeByName = new Map(eveTypes.map((t) => [t.name.toLowerCase(), t]));

    const typeIds = eveTypes.map((t) => t.id);
    const allRegionIds = Object.values(TRADE_HUB_REGIONS);

    const allPrices = await prisma.marketPrice.findMany({
      where: {
        typeId: { in: typeIds },
        regionId: { in: allRegionIds },
      },
    });

    const pricesByRegion = new Map<string, Map<number, { buy: number; sell: number }>>();

    for (const [regionSlug, regId] of Object.entries(TRADE_HUB_REGIONS)) {
      const regionPrices = new Map<number, { buy: number; sell: number }>();

      for (const price of allPrices) {
        if (price.regionId === regId) {
          regionPrices.set(price.typeId, {
            buy: Number(price.buyPrice),
            sell: Number(price.sellPrice),
          });
        }
      }

      pricesByRegion.set(regionSlug, regionPrices);
    }

    const selectedRegionPrices = pricesByRegion.get(region) || new Map();

    const appraisedItems: AppraisedItem[] = [];
    const pricingData: Record<number, { buy: number; sell: number; split: number }> = {};

    let totalBuy = 0;
    let totalSplit = 0;
    let totalSell = 0;
    let totalVolume = 0;

    for (const item of parsed.items) {
      const eveType = typeByName.get(item.name.toLowerCase());
      const price = eveType ? selectedRegionPrices.get(eveType.id) : null;

      const buyPrice = price?.buy || 0;
      const sellPrice = price?.sell || 0;
      const splitPrice = (buyPrice + sellPrice) / 2;
      const volume = eveType?.volume || 0;

      const buyTotal = buyPrice * item.quantity;
      const splitTotal = splitPrice * item.quantity;
      const sellTotal = sellPrice * item.quantity;
      const itemVolume = volume * item.quantity;

      appraisedItems.push({
        typeId: eveType?.id || null,
        name: item.name,
        quantity: item.quantity,
        buyPrice,
        splitPrice,
        sellPrice,
        buyTotal,
        splitTotal,
        sellTotal,
        volume: itemVolume,
        found: !!eveType,
      });

      if (eveType) {
        pricingData[eveType.id] = { buy: buyPrice, sell: sellPrice, split: splitPrice };
      }

      totalBuy += buyTotal;
      totalSplit += splitTotal;
      totalSell += sellTotal;
      totalVolume += itemVolume;
    }

    const regionComparison: Record<string, RegionPrices> = {};
    const baseRegionSell = totalSell;

    for (const [regionSlug, regPrices] of pricesByRegion) {
      let regBuy = 0;
      let regSell = 0;

      for (const item of parsed.items) {
        const eveType = typeByName.get(item.name.toLowerCase());
        if (eveType) {
          const price = regPrices.get(eveType.id);
          if (price) {
            regBuy += price.buy * item.quantity;
            regSell += price.sell * item.quantity;
          }
        }
      }

      const regSplit = (regBuy + regSell) / 2;
      const diff = baseRegionSell > 0 ? ((regSell - baseRegionSell) / baseRegionSell) * 100 : 0;

      regionComparison[regionSlug] = {
        buy: regBuy,
        split: regSplit,
        sell: regSell,
        diff: regionSlug === region ? 0 : diff,
        name: REGION_NAMES[regionSlug],
      };
    }

    const expiresAt = new Date();
    if (userId) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    const appraisal = await prisma.appraisal.create({
      data: {
        id: nanoid(10),
        userId,
        regionId,
        rawInput: text,
        items: parsed.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          typeId: typeByName.get(i.name.toLowerCase())?.id || null,
        })),
        pricingData,
        totalBuy,
        totalSell,
        totalVolume,
        itemCount: parsed.items.length,
        expiresAt,
        lastPriceCheck: new Date(),
      },
    });

    await prisma.appraisalRevision.create({
      data: {
        appraisalId: appraisal.id,
        revision: 1,
        pricingData,
        totalBuy,
        totalSell,
        priceChanges: {},
      },
    });

    return NextResponse.json({
      id: appraisal.id,
      items: appraisedItems,
      totals: {
        buy: totalBuy,
        split: totalSplit,
        sell: totalSell,
        volume: totalVolume,
        itemCount: parsed.items.length,
        totalQuantity: parsed.totalItems,
      },
      region,
      regionComparison,
      rawInput: text,
      createdAt: appraisal.createdAt,
      parseErrors: parsed.parseErrors,
    });
  } catch (error) {
    console.error("Appraise error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}


