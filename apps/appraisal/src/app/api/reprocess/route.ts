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

const BASE_REPROCESS_EFFICIENCY = 0.5;
const MAX_ITEMS = 1000;

interface ReprocessInput {
  items: Array<{
    typeId: number;
    quantity: number;
  }>;
  region?: string;
  efficiency?: number;
}

interface MaterialOutput {
  typeId: number;
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyTotal: number;
  sellTotal: number;
}

export async function POST(request: NextRequest) {
  try {
    const bodyTooLarge = enforceMaxBodySize(request, 256 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "appraisal:reprocess",
      limit: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body: ReprocessInput = await request.json();
    const { items, region = "the-forge", efficiency = BASE_REPROCESS_EFFICIENCY } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Too many items (max ${MAX_ITEMS})` }, { status: 400 });
    }

    if (typeof efficiency !== "number" || efficiency < 0 || efficiency > 1) {
      return NextResponse.json({ error: "Invalid efficiency (0-1)" }, { status: 400 });
    }

    for (const item of items) {
      if (
        typeof item.typeId !== "number" ||
        !Number.isInteger(item.typeId) ||
        item.typeId <= 0 ||
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 1_000_000_000
      ) {
        return NextResponse.json({ error: "Invalid items payload" }, { status: 400 });
      }
    }

    const regionId = TRADE_HUB_REGIONS[region];
    if (!regionId) {
      return NextResponse.json({ error: "Invalid region" }, { status: 400 });
    }

    const typeIds = items.map((i) => i.typeId).filter((id) => id != null);

    const reprocessMaterials = await prisma.reprocessMaterial.findMany({
      where: {
        typeId: { in: typeIds },
      },
    });

    if (reprocessMaterials.length === 0) {
      return NextResponse.json({
        materials: [],
        totals: { buy: 0, sell: 0 },
        message: "No reprocessable items found",
      });
    }

    const materialQuantities: Record<number, number> = {};

    for (const item of items) {
      const itemMaterials = reprocessMaterials.filter((m) => m.typeId === item.typeId);
      for (const mat of itemMaterials) {
        const outputQty = Math.floor(mat.quantity * item.quantity * efficiency);
        materialQuantities[mat.materialTypeId] = (materialQuantities[mat.materialTypeId] || 0) + outputQty;
      }
    }

    const mineralTypeIds = Object.keys(materialQuantities).map(Number);

    const [mineralTypes, mineralPrices] = await Promise.all([
      prisma.eveType.findMany({
        where: { id: { in: mineralTypeIds } },
      }),
      prisma.marketPrice.findMany({
        where: {
          typeId: { in: mineralTypeIds },
          regionId,
        },
      }),
    ]);

    const typeNameMap = new Map(mineralTypes.map((t) => [t.id, t.name]));
    const priceMap = new Map(mineralPrices.map((p) => [p.typeId, p]));

    const materials: MaterialOutput[] = [];
    let totalBuy = 0;
    let totalSell = 0;

    for (const [typeIdStr, quantity] of Object.entries(materialQuantities)) {
      const typeId = parseInt(typeIdStr, 10);
      const price = priceMap.get(typeId);
      const buyPrice = price ? Number(price.buyPrice) : 0;
      const sellPrice = price ? Number(price.sellPrice) : 0;
      const buyTotal = buyPrice * quantity;
      const sellTotal = sellPrice * quantity;

      materials.push({
        typeId,
        name: typeNameMap.get(typeId) || `Unknown (${typeId})`,
        quantity,
        buyPrice,
        sellPrice,
        buyTotal,
        sellTotal,
      });

      totalBuy += buyTotal;
      totalSell += sellTotal;
    }

    materials.sort((a, b) => b.sellTotal - a.sellTotal);

    return NextResponse.json({
      materials,
      totals: {
        buy: totalBuy,
        sell: totalSell,
      },
      efficiency,
      itemCount: items.length,
      materialCount: materials.length,
    });
  } catch (error) {
    console.error("Reprocess calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate reprocess value" },
      { status: 500 }
    );
  }
}


