import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@netk/database";

const REGION_NAMES: Record<string, string> = {
  "10000002": "The Forge",
  "10000043": "Domain",
  "10000030": "Heimatar",
  "10000032": "Sinq Laison",
  "10000042": "Metropolis",
};

const REGION_HUBS: Record<string, string> = {
  "10000002": "Jita",
  "10000043": "Amarr",
  "10000030": "Rens",
  "10000032": "Dodixie",
  "10000042": "Hek",
};

/**
 * GET /api/market/[typeId]?days=30
 *
 * Returns current prices across all regions + price history for an item.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  const { typeId: typeIdStr } = await params;
  const typeId = parseInt(typeIdStr, 10);
  if (isNaN(typeId)) {
    return NextResponse.json({ error: "typeId invalide" }, { status: 400 });
  }

  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
    365
  );

  // Get type info
  const typeInfo = await prisma.eveType.findUnique({
    where: { id: typeId },
    select: { id: true, name: true, iconId: true, volume: true, groupId: true, categoryId: true },
  });

  if (!typeInfo) {
    return NextResponse.json({ error: "Type introuvable" }, { status: 404 });
  }

  // Get current prices across all regions
  const currentPrices = await prisma.marketPrice.findMany({
    where: { typeId },
    select: {
      regionId: true,
      buyPrice: true,
      sellPrice: true,
      buyVolume: true,
      sellVolume: true,
      updatedAt: true,
    },
  });

  const prices = currentPrices.map((p) => {
    const rid = p.regionId.toString();
    return {
      regionId: rid,
      regionName: REGION_NAMES[rid] || `Region ${rid}`,
      hub: REGION_HUBS[rid] || "Unknown",
      buyPrice: Number(p.buyPrice),
      sellPrice: Number(p.sellPrice),
      buyVolume: Number(p.buyVolume),
      sellVolume: Number(p.sellVolume),
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  // Get price history
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const history = await prisma.marketPriceHistory.findMany({
    where: {
      typeId,
      recordedAt: { gte: cutoff },
    },
    select: {
      regionId: true,
      buyPrice: true,
      sellPrice: true,
      buyVolume: true,
      sellVolume: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: "asc" },
  });

  // Group history by region
  const historyByRegion: Record<
    string,
    Array<{
      date: string;
      buyPrice: number;
      sellPrice: number;
      buyVolume: number;
      sellVolume: number;
    }>
  > = {};

  for (const h of history) {
    const rid = h.regionId.toString();
    if (!historyByRegion[rid]) historyByRegion[rid] = [];
    historyByRegion[rid].push({
      date: h.recordedAt.toISOString(),
      buyPrice: Number(h.buyPrice),
      sellPrice: Number(h.sellPrice),
      buyVolume: Number(h.buyVolume),
      sellVolume: Number(h.sellVolume),
    });
  }

  return NextResponse.json({
    type: typeInfo,
    prices,
    history: historyByRegion,
  });
}
