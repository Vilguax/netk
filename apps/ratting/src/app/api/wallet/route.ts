import { NextResponse, NextRequest } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { redis, isRedisAvailable } from "@netk/database/redis";

// Format date as YYYY-MM-DD in local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface WalletJournalEntry {
  id: number;
  date: string;
  ref_type: string;
  amount: number;
  balance: number;
  description: string;
  first_party_id?: number;
  second_party_id?: number;
  reason?: string;
}

interface BountyEntry {
  id: number;
  date: string;
  amount: number;
  description: string;
  characterId: string;
  characterName: string;
  isEss?: boolean;
}

interface CharacterFetchResult {
  characterId: string;
  characterName: string;
  bounties: BountyEntry[];
  status: "ok" | "no_token" | "esi_error" | "error";
  errorCode?: number;
  cacheExpires?: string;
  latestBountyDate?: string;
}

async function fetchCharacterWallet(
  characterId: string,
  characterName: string
): Promise<CharacterFetchResult> {
  const accessToken = await getCharacterAccessToken(BigInt(characterId));
  if (!accessToken) {
    console.log(`[Wallet] No access token for character ${characterId} (${characterName})`);
    return {
      characterId,
      characterName,
      bounties: [],
      status: "no_token",
    };
  }

  try {
    const response = await fetch(
      `https://esi.evetech.net/latest/characters/${characterId}/wallet/journal/?datasource=tranquility`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        // Force fresh data from ESI, bypass Next.js cache
        cache: "no-store",
      }
    );

    // Log ESI cache headers for debugging
    const cacheExpires = response.headers.get("expires");

    if (!response.ok) {
      console.log(`[Wallet] ESI error for ${characterName}: ${response.status}`);
      return {
        characterId,
        characterName,
        bounties: [],
        status: "esi_error",
        errorCode: response.status,
        cacheExpires: cacheExpires || undefined,
      };
    }

    console.log(`[Wallet] ${characterName} - ESI cache expires: ${cacheExpires}`);

    const journal: WalletJournalEntry[] = await response.json();

    // Include both regular bounties and ESS payouts
    const validTypes = ["bounty_prizes", "ess_escrow_transfer"];

    const bounties = journal
      .filter((entry) => validTypes.includes(entry.ref_type) && entry.amount > 0)
      .map((entry) => ({
        id: entry.id,
        date: entry.date,
        amount: entry.amount,
        description: entry.ref_type === "ess_escrow_transfer"
          ? "ESS Payout"
          : entry.description || "Bounty Prize",
        characterId,
        characterName,
        isEss: entry.ref_type === "ess_escrow_transfer",
      }));

    console.log(`[Wallet] ${characterName}: ${bounties.length} bounties found, latest: ${bounties[0]?.date || "none"}`);

    return {
      characterId,
      characterName,
      bounties,
      status: "ok",
      cacheExpires: cacheExpires || undefined,
      latestBountyDate: bounties[0]?.date,
    };
  } catch (error) {
    console.error(`[Wallet] Error fetching for ${characterName}:`, error);
    return {
      characterId,
      characterName,
      bounties: [],
      status: "error",
    };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d";
  const characterIdsParam = searchParams.get("characterIds");
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    // Get user's characters
    const userCharacters = await getUserCharacters(session.user.id);

    // Determine which characters to fetch
    let targetCharacterIds: string[];
    if (characterIdsParam) {
      // Filter to only include characters that belong to the user
      const requestedIds = characterIdsParam.split(",");
      const userCharacterIds = userCharacters.map((c) => c.characterId.toString());
      targetCharacterIds = requestedIds.filter((id) => userCharacterIds.includes(id));
    } else {
      // Default to all user's characters
      targetCharacterIds = userCharacters.map((c) => c.characterId.toString());
    }

    if (targetCharacterIds.length === 0) {
      return NextResponse.json({ error: "Aucun personnage valide" }, { status: 400 });
    }

    // Fetch wallet data for all selected characters in parallel
    const characterMap = new Map(
      userCharacters.map((c) => [c.characterId.toString(), c.characterName])
    );

    const bountyPromises = targetCharacterIds.map((id) =>
      fetchCharacterWallet(id, characterMap.get(id) || "Unknown")
    );

    const fetchResults = await Promise.all(bountyPromises);

    // Extract bounties from results and track fetch status per character
    const characterFetchStatus = fetchResults.map((result) => ({
      characterId: result.characterId,
      characterName: result.characterName,
      status: result.status,
      errorCode: result.errorCode,
      cacheExpires: result.cacheExpires,
      latestBountyDate: result.latestBountyDate,
      bountyCount: result.bounties.length,
    }));

    // Log fetch summary (not full details)
    const okCount = characterFetchStatus.filter((c) => c.status === "ok").length;
    const errorCount = characterFetchStatus.length - okCount;
    console.log(`[Wallet] Fetched ${okCount}/${characterFetchStatus.length} characters${errorCount > 0 ? ` (${errorCount} errors)` : ""}`);

    // Get fresh bounties from ESI
    const freshBounties = fetchResults.flatMap((result) => result.bounties);

    // Merge with cached bounties to handle ESI delays
    // Cache key per user to accumulate bounties across all characters
    const cacheKey = `bounties:${session.user.id}`;
    const CACHE_TTL = 24 * 60 * 60; // 24 hours

    let bounties: BountyEntry[] = freshBounties;

    const redisAvailable = await isRedisAvailable();
    if (redisAvailable) {
      try {
        // Get cached bounties
        const cachedData = await redis.get(cacheKey);
        const cachedBounties: BountyEntry[] = cachedData ? JSON.parse(cachedData) : [];

        // Merge: use Map to dedupe by bounty ID
        const bountyMap = new Map<number, BountyEntry>();

        // Add cached bounties first
        for (const bounty of cachedBounties) {
          bountyMap.set(bounty.id, bounty);
        }

        // Overwrite/add fresh bounties (they have the latest data)
        for (const bounty of freshBounties) {
          bountyMap.set(bounty.id, bounty);
        }

        bounties = Array.from(bountyMap.values());

        // Only keep bounties from last 30 days to prevent unbounded growth
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        bounties = bounties.filter((b) => new Date(b.date) >= thirtyDaysAgo);

        // Store merged bounties back to cache
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(bounties));

        console.log(`[Wallet] Cache: ${cachedBounties.length} cached + ${freshBounties.length} fresh = ${bounties.length} merged`);
      } catch (err) {
        console.error("[Wallet] Cache error:", err);
        // Fall back to fresh bounties only
        bounties = freshBounties;
      }
    }

    // Sort by date descending
    bounties.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Determine period start based on parameter
    const periodDays = period === "30d" ? 30 : period === "all" ? 365 : 7;
    const periodStart = new Date(todayStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const todayBounties = bounties.filter(
      (b) => new Date(b.date) >= todayStart
    );
    const yesterdayBounties = bounties.filter(
      (b) => new Date(b.date) >= yesterdayStart && new Date(b.date) < todayStart
    );
    const periodBounties = bounties.filter(
      (b) => new Date(b.date) >= periodStart
    );

    const todayTotal = todayBounties.reduce((sum, b) => sum + b.amount, 0);
    const yesterdayTotal = yesterdayBounties.reduce((sum, b) => sum + b.amount, 0);
    const periodTotal = periodBounties.reduce((sum, b) => sum + b.amount, 0);

    // Group bounties into "ticks" - bounties within 5 minutes are the same tick
    // EVE pays all fleet members at the same server tick (~20 min intervals)
    // ESI cache can delay visibility by up to 5 minutes per character
    // Using 5-minute window with sliding comparison to handle ESI delays
    const TICK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes to handle ESI cache delays
    const groupedTicks: { timestamp: Date; latestTime: number; total: number; bounties: BountyEntry[] }[] = [];

    const sortedPeriodBounties = [...periodBounties].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedPeriodBounties.forEach((bounty) => {
      const bountyTime = new Date(bounty.date).getTime();
      const lastTick = groupedTicks[groupedTicks.length - 1];

      // Use sliding window: compare to LATEST bounty in the tick, not the first
      // This ensures bounties that arrive in sequence due to ESI delays get grouped
      if (lastTick && bountyTime - lastTick.latestTime < TICK_WINDOW_MS) {
        // Same tick - add to existing group and update latest time
        lastTick.total += bounty.amount;
        lastTick.bounties.push(bounty);
        lastTick.latestTime = Math.max(lastTick.latestTime, bountyTime);
      } else {
        // New tick
        groupedTicks.push({
          timestamp: new Date(bounty.date),
          latestTime: bountyTime,
          total: bounty.amount,
          bounties: [bounty],
        });
      }
    });

    // Calculate ISK/hour for today based on grouped ticks
    const todayGroupedTicks = groupedTicks.filter(
      (t) => t.timestamp >= todayStart
    );
    const hoursActive = todayGroupedTicks.length > 0
      ? Math.max(
          1,
          (now.getTime() - todayGroupedTicks[0].timestamp.getTime()) /
            (1000 * 60 * 60)
        )
      : 1;
    const iskPerHour = todayTotal / hoursActive;

    // Average tick = total ISK / number of grouped ticks
    const avgTick = groupedTicks.length > 0
      ? periodTotal / groupedTicks.length
      : 0;

    // Best tick = highest grouped tick total
    const bestTick = groupedTicks.length > 0
      ? Math.max(...groupedTicks.map((t) => t.total))
      : 0;

    // Actual tick count (grouped)
    const tickCount = groupedTicks.length;

    // Trend vs yesterday
    const trend =
      yesterdayTotal > 0
        ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
        : 0;

    // Group by day for chart (using local date from bounty timestamp)
    const dailyData: Record<string, number> = {};
    periodBounties.forEach((b) => {
      const bountyDate = new Date(b.date);
      const day = formatLocalDate(bountyDate);
      dailyData[day] = (dailyData[day] || 0) + b.amount;
    });

    // Fill missing days (based on period, today being the last)
    const chartData = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = formatLocalDate(date);
      chartData.push({
        date: dateStr,
        amount: dailyData[dateStr] || 0,
      });
    }

    // Calculate per-character breakdown
    const characterBreakdown: Record<string, { characterId: string; characterName: string; total: number; tickCount: number }> = {};
    periodBounties.forEach((b) => {
      if (!characterBreakdown[b.characterId]) {
        characterBreakdown[b.characterId] = {
          characterId: b.characterId,
          characterName: b.characterName,
          total: 0,
          tickCount: 0,
        };
      }
      characterBreakdown[b.characterId].total += b.amount;
      characterBreakdown[b.characterId].tickCount += 1;
    });

    // Calculate hourly breakdown for heatmap (hour of day)
    const hourlyData: Record<number, number> = {};
    periodBounties.forEach((b) => {
      const hour = new Date(b.date).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + b.amount;
    });

    // Calculate day of week breakdown
    const dayOfWeekData: Record<number, number> = {};
    periodBounties.forEach((b) => {
      const day = new Date(b.date).getDay();
      dayOfWeekData[day] = (dayOfWeekData[day] || 0) + b.amount;
    });

    return NextResponse.json({
      stats: {
        todayTotal,
        yesterdayTotal,
        periodTotal,
        iskPerHour,
        avgTick,
        bestTick,
        trend,
        tickCount,
        periodDays,
      },
      chartData,
      recentBounties: periodBounties.slice(0, 50),
      characterBreakdown: Object.values(characterBreakdown),
      hourlyData,
      dayOfWeekData,
      // Debug info for multi-character fetch status
      characterFetchStatus,
    });
  } catch (error) {
    console.error("Wallet API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

