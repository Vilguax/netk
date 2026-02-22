import { NextRequest, NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getUserCharacters } from "@netk/auth/eve";
import { prisma } from "@netk/database";
import { Decimal } from "@prisma/client/runtime/library";

interface ProfitByItem {
  typeId: number;
  typeName: string;
  totalQuantity: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  totalProfit: number;
  totalTaxes: number;
  transactionCount: number;
}

/**
 * GET /api/profits?days=30&characterId=xxx
 *
 * Runs FIFO matching on transactions, stores results in market_profit_entries,
 * then returns aggregated profit per item.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const filterCharacterId = searchParams.get("characterId");

    const characters = await getUserCharacters(session.user.id);
    if (characters.length === 0) {
      return NextResponse.json({ profits: [], summary: { totalProfit: 0, totalRevenue: 0, totalCost: 0, totalTaxes: 0 } });
    }

    const characterIds = filterCharacterId
      ? [BigInt(filterCharacterId)]
      : characters.map((c) => c.characterId);

    // Get user's tax settings
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });
    const settings = prefs?.settings as Record<string, unknown> | null;
    const salesTaxRate = ((settings?.marketSalesTax as number) ?? 3.6) / 100;
    const brokerFeeRate = ((settings?.marketBrokerFee as number) ?? 3.0) / 100;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Run FIFO matching for each character
    for (const charId of characterIds) {
      await runFifoMatching(charId, salesTaxRate, brokerFeeRate);
    }

    // Fetch profit entries for the period
    const profitEntries = await prisma.marketProfitEntry.findMany({
      where: {
        characterId: { in: characterIds },
        matchedAt: { gte: since },
      },
      orderBy: { matchedAt: "desc" },
    });

    // Resolve type names
    const typeIds = [...new Set(profitEntries.map((e) => e.typeId))];
    const types = await prisma.eveType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, name: true },
    });
    const typeNameMap = new Map(types.map((t) => [t.id, t.name]));

    // Aggregate by item
    const byItem = new Map<number, ProfitByItem>();
    for (const entry of profitEntries) {
      const existing = byItem.get(entry.typeId);
      const profit = Number(entry.profit);
      const taxes = Number(entry.taxes);
      const buyPrice = Number(entry.buyPrice);
      const sellPrice = Number(entry.sellPrice);

      if (existing) {
        existing.totalQuantity += entry.quantity;
        existing.totalProfit += profit;
        existing.totalTaxes += taxes;
        existing.avgBuyPrice =
          (existing.avgBuyPrice * (existing.transactionCount) + buyPrice) /
          (existing.transactionCount + 1);
        existing.avgSellPrice =
          (existing.avgSellPrice * (existing.transactionCount) + sellPrice) /
          (existing.transactionCount + 1);
        existing.transactionCount += 1;
      } else {
        byItem.set(entry.typeId, {
          typeId: entry.typeId,
          typeName: typeNameMap.get(entry.typeId) || `Type #${entry.typeId}`,
          totalQuantity: entry.quantity,
          avgBuyPrice: buyPrice,
          avgSellPrice: sellPrice,
          totalProfit: profit,
          totalTaxes: taxes,
          transactionCount: 1,
        });
      }
    }

    const profits = [...byItem.values()].sort((a, b) => b.totalProfit - a.totalProfit);

    // Daily profit timeline
    const dailyProfitMap = new Map<string, number>();
    for (const entry of profitEntries) {
      const day = entry.matchedAt.toISOString().slice(0, 10);
      dailyProfitMap.set(day, (dailyProfitMap.get(day) || 0) + Number(entry.profit));
    }

    const timeline = [...dailyProfitMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, profit]) => ({ date, profit }));

    // Cumulative timeline
    let cumulative = 0;
    const cumulativeTimeline = timeline.map((t) => {
      cumulative += t.profit;
      return { date: t.date, profit: t.profit, cumulative };
    });

    const summary = {
      totalProfit: profits.reduce((s, p) => s + p.totalProfit, 0),
      totalRevenue: profitEntries.reduce((s, e) => s + Number(e.sellPrice) * e.quantity, 0),
      totalCost: profitEntries.reduce((s, e) => s + Number(e.buyPrice) * e.quantity, 0),
      totalTaxes: profits.reduce((s, p) => s + p.totalTaxes, 0),
      itemCount: profits.length,
      transactionCount: profitEntries.length,
    };

    return NextResponse.json({
      profits,
      timeline: cumulativeTimeline,
      summary,
      period: { days, since: since.toISOString() },
    });
  } catch (error) {
    console.error("[Profits] Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

/**
 * FIFO Matching Algorithm
 *
 * For each item type, matches sells to buys in chronological order (FIFO).
 * Only processes sell transactions that haven't been matched yet.
 */
async function runFifoMatching(
  characterId: bigint,
  salesTaxRate: number,
  brokerFeeRate: number
): Promise<void> {
  // Get all sell transactions that haven't been fully matched
  const alreadyMatchedSellIds = await prisma.marketProfitEntry.findMany({
    where: { characterId },
    select: { sellTransactionId: true },
  });
  const matchedSellIdSet = new Set(alreadyMatchedSellIds.map((e) => e.sellTransactionId));

  // Get unmatched sell transactions
  const sellTransactions = await prisma.marketTransaction.findMany({
    where: {
      characterId,
      isBuy: false,
    },
    orderBy: { date: "asc" },
  });

  const unmatchedSells = sellTransactions.filter((s) => !matchedSellIdSet.has(s.id));
  if (unmatchedSells.length === 0) return;

  // Get all type IDs from unmatched sells
  const typeIds = [...new Set(unmatchedSells.map((s) => s.typeId))];

  // For each type, run FIFO
  for (const typeId of typeIds) {
    const sells = unmatchedSells.filter((s) => s.typeId === typeId);

    // Get buy transactions for this type (ordered by date for FIFO)
    const buys = await prisma.marketTransaction.findMany({
      where: {
        characterId,
        typeId,
        isBuy: true,
      },
      orderBy: { date: "asc" },
    });

    // Get already consumed buy quantities
    const buyConsumption = await prisma.marketProfitEntry.groupBy({
      by: ["buyTransactionId"],
      where: {
        characterId,
        typeId,
        buyTransactionId: { not: null },
      },
      _sum: { quantity: true },
    });

    const consumedMap = new Map<string, number>();
    for (const c of buyConsumption) {
      if (c.buyTransactionId) {
        consumedMap.set(c.buyTransactionId, c._sum.quantity || 0);
      }
    }

    // Build FIFO queue of available buy quantities
    const buyQueue: Array<{
      id: string;
      unitPrice: Decimal;
      remaining: number;
    }> = [];

    for (const buy of buys) {
      const consumed = consumedMap.get(buy.id) || 0;
      const remaining = buy.quantity - consumed;
      if (remaining > 0) {
        buyQueue.push({
          id: buy.id,
          unitPrice: buy.unitPrice,
          remaining,
        });
      }
    }

    // Match each sell against buy queue
    for (const sell of sells) {
      let sellRemaining = sell.quantity;
      const sellPrice = Number(sell.unitPrice);

      while (sellRemaining > 0 && buyQueue.length > 0) {
        const buy = buyQueue[0];
        const matchQty = Math.min(sellRemaining, buy.remaining);
        const buyPrice = Number(buy.unitPrice);

        // Calculate taxes on this portion
        const revenue = sellPrice * matchQty;
        const taxes = revenue * (salesTaxRate + brokerFeeRate);
        const profit = (sellPrice - buyPrice) * matchQty - taxes;

        await prisma.marketProfitEntry.create({
          data: {
            characterId,
            typeId,
            buyTransactionId: buy.id,
            sellTransactionId: sell.id,
            quantity: matchQty,
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            taxes: taxes,
            profit: profit,
          },
        });

        buy.remaining -= matchQty;
        sellRemaining -= matchQty;

        if (buy.remaining <= 0) {
          buyQueue.shift();
        }
      }

      // If no buy matches (items acquired through other means), match with 0 buy price
      if (sellRemaining > 0) {
        const revenue = sellPrice * sellRemaining;
        const taxes = revenue * (salesTaxRate + brokerFeeRate);
        const profit = sellPrice * sellRemaining - taxes;

        await prisma.marketProfitEntry.create({
          data: {
            characterId,
            typeId,
            buyTransactionId: null,
            sellTransactionId: sell.id,
            quantity: sellRemaining,
            buyPrice: 0,
            sellPrice: sellPrice,
            taxes: taxes,
            profit: profit,
          },
        });
      }
    }
  }
}
