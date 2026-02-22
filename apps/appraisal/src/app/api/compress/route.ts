// SECURITY_CSRF_EXEMPT: public compute endpoint
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@netk/database";
import { enforceMaxBodySize, enforceRateLimit } from "@netk/auth/security";

const TRADE_HUB_REGIONS: Record<string, bigint> = {
  "the-forge": BigInt(10000002),
  domain: BigInt(10000043),
  heimatar: BigInt(10000030),
  "sinq-laison": BigInt(10000032),
};

const MAX_ITEMS = 1000;

interface CompressInput {
  items: Array<{
    typeId: number;
    name: string;
    quantity: number;
    volume: number;
    sellPrice: number;
    sellTotal: number;
  }>;
  region?: string;
}

interface CompressedItem {
  originalTypeId: number;
  originalName: string;
  originalQuantity: number;
  originalVolume: number;
  compressedTypeId: number;
  compressedName: string;
  compressedQuantity: number;
  compressedVolume: number;
  ratio: number;
  originalSellPrice: number;
  originalSellTotal: number;
  compressedSellPrice: number;
  compressedSellTotal: number;
  priceDiff: number;
  priceDiffPct: number;
}

export async function POST(request: NextRequest) {
  try {
    const bodyTooLarge = enforceMaxBodySize(request, 512 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "appraisal:compress",
      limit: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body: CompressInput = await request.json();
    const { items, region = "the-forge" } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Too many items (max ${MAX_ITEMS})` }, { status: 400 });
    }

    for (const item of items) {
      if (
        typeof item.typeId !== "number" ||
        !Number.isInteger(item.typeId) ||
        item.typeId <= 0 ||
        typeof item.name !== "string" ||
        item.name.length === 0 ||
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        typeof item.volume !== "number" ||
        item.volume < 0 ||
        typeof item.sellPrice !== "number" ||
        item.sellPrice < 0 ||
        typeof item.sellTotal !== "number" ||
        item.sellTotal < 0
      ) {
        return NextResponse.json({ error: "Invalid items payload" }, { status: 400 });
      }
    }

    const regionId = TRADE_HUB_REGIONS[region];
    if (!regionId) {
      return NextResponse.json({ error: "Invalid region" }, { status: 400 });
    }

    const typeIds = items.map((i) => i.typeId).filter((id) => id != null);

    const compressionMappings = await prisma.compressionMapping.findMany({
      where: {
        oreTypeId: { in: typeIds },
      },
    });

    const compressedTypeIds = items.map((i) => i.typeId);
    const reverseMappings = await prisma.compressionMapping.findMany({
      where: {
        compressedTypeId: { in: compressedTypeIds },
      },
    });

    const allCompressedTypeIds = compressionMappings.map((m) => m.compressedTypeId);
    const allOreTypeIds = reverseMappings.map((m) => m.oreTypeId);
    const allTypeIdsForPrices = [...new Set([...allCompressedTypeIds, ...allOreTypeIds])];

    const compressedPrices = await prisma.marketPrice.findMany({
      where: {
        typeId: { in: allTypeIdsForPrices },
        regionId,
      },
    });

    const compressedTypes = await prisma.eveType.findMany({
      where: {
        id: { in: allTypeIdsForPrices },
      },
    });

    const mappingByOreId = new Map(compressionMappings.map((m) => [m.oreTypeId, m]));
    const mappingByCompressedId = new Map(reverseMappings.map((m) => [m.compressedTypeId, m]));
    const priceMap = new Map(compressedPrices.map((p) => [p.typeId, p]));
    const typeMap = new Map(compressedTypes.map((t) => [t.id, t]));

    const compressedItems: CompressedItem[] = [];
    const nonCompressibleItems: typeof items = [];
    let totalOriginalVolume = 0;
    let totalCompressedVolume = 0;
    let totalOriginalSell = 0;
    let totalCompressedSell = 0;

    for (const item of items) {
      const mapping = mappingByOreId.get(item.typeId);

      if (mapping) {
        const compressedQuantity = Math.floor(item.quantity / mapping.ratio);
        const compressedType = typeMap.get(mapping.compressedTypeId);
        const compressedPrice = priceMap.get(mapping.compressedTypeId);

        const compressedSellPrice = compressedPrice ? Number(compressedPrice.sellPrice) : 0;
        const compressedSellTotal = compressedSellPrice * compressedQuantity;
        const compressedVolume = (compressedType?.volume || 0.1) * compressedQuantity;

        const priceDiff = compressedSellTotal - item.sellTotal;
        const priceDiffPct = item.sellTotal > 0 ? (priceDiff / item.sellTotal) * 100 : 0;

        compressedItems.push({
          originalTypeId: item.typeId,
          originalName: item.name,
          originalQuantity: item.quantity,
          originalVolume: item.volume,
          compressedTypeId: mapping.compressedTypeId,
          compressedName: mapping.compressedName,
          compressedQuantity,
          compressedVolume,
          ratio: mapping.ratio,
          originalSellPrice: item.sellPrice,
          originalSellTotal: item.sellTotal,
          compressedSellPrice,
          compressedSellTotal,
          priceDiff,
          priceDiffPct,
        });

        totalOriginalVolume += item.volume;
        totalCompressedVolume += compressedVolume;
        totalOriginalSell += item.sellTotal;
        totalCompressedSell += compressedSellTotal;
      } else {
        const reverseMapping = mappingByCompressedId.get(item.typeId);
        if (reverseMapping) {
          compressedItems.push({
            originalTypeId: item.typeId,
            originalName: item.name,
            originalQuantity: item.quantity,
            originalVolume: item.volume,
            compressedTypeId: item.typeId,
            compressedName: item.name,
            compressedQuantity: item.quantity,
            compressedVolume: item.volume,
            ratio: 1,
            originalSellPrice: item.sellPrice,
            originalSellTotal: item.sellTotal,
            compressedSellPrice: item.sellPrice,
            compressedSellTotal: item.sellTotal,
            priceDiff: 0,
            priceDiffPct: 0,
          });

          totalOriginalVolume += item.volume;
          totalCompressedVolume += item.volume;
          totalOriginalSell += item.sellTotal;
          totalCompressedSell += item.sellTotal;
        } else {
          nonCompressibleItems.push(item);
          totalOriginalVolume += item.volume;
          totalCompressedVolume += item.volume;
          totalOriginalSell += item.sellTotal;
          totalCompressedSell += item.sellTotal;
        }
      }
    }

    compressedItems.sort((a, b) => b.originalSellTotal - a.originalSellTotal);

    const volumeSaved = totalOriginalVolume - totalCompressedVolume;
    const volumeSavedPct = totalOriginalVolume > 0 ? (volumeSaved / totalOriginalVolume) * 100 : 0;
    const priceDiff = totalCompressedSell - totalOriginalSell;
    const priceDiffPct = totalOriginalSell > 0 ? (priceDiff / totalOriginalSell) * 100 : 0;

    return NextResponse.json({
      items: compressedItems,
      nonCompressible: nonCompressibleItems,
      totals: {
        originalVolume: totalOriginalVolume,
        compressedVolume: totalCompressedVolume,
        volumeSaved,
        volumeSavedPct,
        originalSell: totalOriginalSell,
        compressedSell: totalCompressedSell,
        priceDiff,
        priceDiffPct,
      },
      compressibleCount: compressedItems.length,
      nonCompressibleCount: nonCompressibleItems.length,
    });
  } catch (error) {
    console.error("Compress calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate compressed value" },
      { status: 500 }
    );
  }
}


