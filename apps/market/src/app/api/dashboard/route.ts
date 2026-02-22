import { NextRequest, NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { prisma } from "@netk/database";

/**
 * GET /api/dashboard?days=30
 *
 * Returns aggregated trading KPIs with configurable period.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const characters = await getUserCharacters(session.user.id);
    if (characters.length === 0) {
      return NextResponse.json({
        wallet: 0,
        orders: { sell: 0, buy: 0, total: 0, escrow: 0, sellValue: 0 },
        profit: { today: 0, period: 0, avgPerDay: 0 },
        topItems: [],
        volume: { bought: 0, sold: 0, txCount: 0 },
        profitChart: [],
        characters: [],
        alerts: [],
      });
    }

    const characterIds = characters.map((c) => c.characterId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // ---- Wallet balance ----
    let totalBalance = 0;
    const characterInfo: Array<{
      characterId: string;
      characterName: string;
      balance: number;
    }> = [];

    for (const char of characters) {
      const accessToken = await getCharacterAccessToken(char.characterId);
      if (!accessToken) continue;

      try {
        const res = await fetch(
          `https://esi.evetech.net/latest/characters/${char.characterId}/wallet/?datasource=tranquility`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (res.ok) {
          const balance = await res.json();
          totalBalance += balance;
          characterInfo.push({
            characterId: char.characterId.toString(),
            characterName: char.characterName,
            balance,
          });
        }
      } catch {
        // Skip
      }
    }

    // ---- Active orders + escrow + sell value ----
    const activeOrders = await prisma.marketCharacterOrder.findMany({
      where: {
        characterId: { in: characterIds },
        state: "active",
      },
      select: { isBuyOrder: true, price: true, volumeRemain: true },
    });

    let sellCount = 0;
    let buyCount = 0;
    let escrow = 0;
    let sellValue = 0;

    for (const o of activeOrders) {
      const orderValue = Number(o.price) * o.volumeRemain;
      if (o.isBuyOrder) {
        buyCount++;
        escrow += orderValue;
      } else {
        sellCount++;
        sellValue += orderValue;
      }
    }

    // ---- Profit ----
    const [profitToday, profitPeriod] = await Promise.all([
      prisma.marketProfitEntry.aggregate({
        where: { characterId: { in: characterIds }, matchedAt: { gte: todayStart } },
        _sum: { profit: true },
      }),
      prisma.marketProfitEntry.aggregate({
        where: { characterId: { in: characterIds }, matchedAt: { gte: periodStart } },
        _sum: { profit: true },
      }),
    ]);

    const periodProfit = Number(profitPeriod._sum.profit || 0);
    const avgPerDay = days > 0 ? periodProfit / days : 0;

    // ---- Top 5 profitable items ----
    const topItemsRaw = await prisma.marketProfitEntry.groupBy({
      by: ["typeId"],
      where: {
        characterId: { in: characterIds },
        matchedAt: { gte: periodStart },
      },
      _sum: { profit: true, quantity: true },
      orderBy: { _sum: { profit: "desc" } },
      take: 5,
    });

    const topTypeIds = topItemsRaw.map((t) => t.typeId);
    const topTypes = topTypeIds.length > 0
      ? await prisma.eveType.findMany({
          where: { id: { in: topTypeIds } },
          select: { id: true, name: true },
        })
      : [];
    const topTypeNameMap = new Map(topTypes.map((t) => [t.id, t.name]));

    const topItems = topItemsRaw.map((item) => ({
      typeId: item.typeId,
      typeName: topTypeNameMap.get(item.typeId) || `Type #${item.typeId}`,
      totalProfit: Number(item._sum.profit || 0),
      totalQuantity: item._sum.quantity || 0,
    }));

    // ---- Transaction volume ----
    const buyTxs = await prisma.marketTransaction.findMany({
      where: { characterId: { in: characterIds }, date: { gte: periodStart }, isBuy: true },
      select: { unitPrice: true, quantity: true },
    });
    const sellTxs = await prisma.marketTransaction.findMany({
      where: { characterId: { in: characterIds }, date: { gte: periodStart }, isBuy: false },
      select: { unitPrice: true, quantity: true },
    });

    const totalBought = buyTxs.reduce((s, t) => s + Number(t.unitPrice) * t.quantity, 0);
    const totalSold = sellTxs.reduce((s, t) => s + Number(t.unitPrice) * t.quantity, 0);
    const txCount = buyTxs.length + sellTxs.length;

    // ---- Daily profit chart ----
    const profitEntries = await prisma.marketProfitEntry.findMany({
      where: {
        characterId: { in: characterIds },
        matchedAt: { gte: periodStart },
      },
      select: { profit: true, matchedAt: true },
      orderBy: { matchedAt: "asc" },
    });

    const dailyMap = new Map<string, number>();
    for (const entry of profitEntries) {
      const day = entry.matchedAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(entry.profit));
    }

    let cumulative = 0;
    const profitChart = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, profit]) => {
        cumulative += profit;
        return { date, profit, cumulative };
      });

    // ---- Alerts: recently expired orders ----
    const recentlyExpired = await prisma.marketCharacterOrder.findMany({
      where: {
        characterId: { in: characterIds },
        state: "expired",
        updatedAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }, // last 3 days
      },
      select: { typeId: true, price: true, isBuyOrder: true, volumeRemain: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const alertTypeIds = [...new Set(recentlyExpired.map((o) => o.typeId))];
    const alertTypes = alertTypeIds.length > 0
      ? await prisma.eveType.findMany({
          where: { id: { in: alertTypeIds } },
          select: { id: true, name: true },
        })
      : [];
    const alertTypeMap = new Map(alertTypes.map((t) => [t.id, t.name]));

    const alerts = recentlyExpired.map((o) => ({
      type: "expired" as const,
      typeName: alertTypeMap.get(o.typeId) || `Type #${o.typeId}`,
      typeId: o.typeId,
      isBuyOrder: o.isBuyOrder,
      price: Number(o.price),
      volumeRemain: o.volumeRemain,
      date: o.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      wallet: totalBalance,
      orders: { sell: sellCount, buy: buyCount, total: sellCount + buyCount, escrow, sellValue },
      profit: {
        today: Number(profitToday._sum.profit || 0),
        period: periodProfit,
        avgPerDay,
      },
      topItems,
      volume: { bought: totalBought, sold: totalSold, txCount },
      profitChart,
      characters: characterInfo,
      alerts,
      period: days,
    });
  } catch (error) {
    console.error("[Dashboard] Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
