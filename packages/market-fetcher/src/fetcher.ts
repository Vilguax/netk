import { PrismaClient } from "@prisma/client";
import IORedis from "ioredis";
import type { ESIMarketOrder, AggregatedPrice, TradeHubRegion, ESITypeInfo, ESIGroupInfo } from "./types.js";

// Create Prisma client directly (avoids ESM monorepo issues)
const prisma = new PrismaClient();

// Create Redis client for progress updates
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const Redis = (IORedis as unknown as { default: typeof IORedis }).default || IORedis;
const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
let redisConnected = false;

redis.on("connect", () => { redisConnected = true; });
redis.on("error", () => { redisConnected = false; });

async function isRedisAvailable(): Promise<boolean> {
  if (!redisConnected) {
    try {
      await redis.connect();
      redisConnected = true;
    } catch {
      return false;
    }
  }
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}

const ESI_BASE_URL = "https://esi.evetech.net/latest";
const RATE_LIMIT_DELAY = 100; // ms between requests to avoid ESI rate limits
const PROGRESS_KEY = "netk:market-fetcher:progress";
const PROGRESS_TTL = 3600; // 1 hour
const FRESHNESS_MS = 2.5 * 60 * 60 * 1000; // 2h30 — skip fetch if data is newer than this

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Progress state
interface FetchProgress {
  jobId: string;
  regionId: string;
  regionName: string;
  status: "fetching_orders" | "processing_types" | "completed" | "failed";
  currentPage: number;
  totalPages: number;
  currentType: number;
  totalTypes: number;
  successCount: number;
  errorCount: number;
  startedAt: string;
  updatedAt: string;
}

// Region ID to name mapping
const REGION_NAMES: Record<string, string> = {
  "10000002": "The Forge",
  "10000043": "Domain",
  "10000030": "Heimatar",
  "10000032": "Sinq Laison",
  "10000042": "Metropolis",
};

// Publish progress to Redis
async function publishProgress(progress: FetchProgress): Promise<void> {
  try {
    if (await isRedisAvailable()) {
      await redis.setex(PROGRESS_KEY, PROGRESS_TTL, JSON.stringify(progress));
    }
  } catch {
    // Ignore Redis errors - progress is nice-to-have
  }
}

// Clear progress from Redis
async function clearProgress(): Promise<void> {
  try {
    if (await isRedisAvailable()) {
      await redis.del(PROGRESS_KEY);
    }
  } catch {
    // Ignore
  }
}

// Fetch all pages of market orders for a region
async function fetchAllMarketOrders(
  regionId: bigint,
  progress: FetchProgress
): Promise<ESIMarketOrder[]> {
  const orders: ESIMarketOrder[] = [];
  let page = 1;
  let totalPages = 1;

  console.log(`[MarketFetcher] Fetching orders for region ${regionId}...`);

  while (page <= totalPages) {
    const url = `${ESI_BASE_URL}/markets/${regionId}/orders/?datasource=tranquility&order_type=all&page=${page}`;

    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      if (response.status === 420) {
        // Rate limited - wait and retry
        console.log(`[MarketFetcher] Rate limited, waiting 60s...`);
        await delay(60000);
        continue;
      }
      throw new Error(`ESI error: ${response.status} ${response.statusText}`);
    }

    // Get total pages from header
    const xPages = response.headers.get("x-pages");
    if (xPages && page === 1) {
      totalPages = parseInt(xPages, 10);
      progress.totalPages = totalPages;
      console.log(`[MarketFetcher] Total pages: ${totalPages}`);
    }

    const pageOrders: ESIMarketOrder[] = await response.json();
    orders.push(...pageOrders);

    // Update progress
    progress.currentPage = page;
    progress.updatedAt = new Date().toISOString();
    await publishProgress(progress);

    console.log(`[MarketFetcher] Page ${page}/${totalPages}: ${pageOrders.length} orders`);
    page++;

    // Rate limit protection
    await delay(RATE_LIMIT_DELAY);
  }

  return orders;
}

// Aggregate orders into best buy/sell prices per type
function aggregateOrders(orders: ESIMarketOrder[]): Map<number, AggregatedPrice> {
  const priceMap = new Map<number, AggregatedPrice>();

  for (const order of orders) {
    const existing = priceMap.get(order.type_id);

    if (!existing) {
      priceMap.set(order.type_id, {
        typeId: order.type_id,
        buyPrice: order.is_buy_order ? order.price : 0,
        sellPrice: order.is_buy_order ? Infinity : order.price,
        buyVolume: order.is_buy_order ? order.volume_remain : 0,
        sellVolume: order.is_buy_order ? 0 : order.volume_remain,
      });
    } else {
      if (order.is_buy_order) {
        // Buy order - we want the highest price
        if (order.price > existing.buyPrice) {
          existing.buyPrice = order.price;
        }
        existing.buyVolume += order.volume_remain;
      } else {
        // Sell order - we want the lowest price
        if (order.price < existing.sellPrice) {
          existing.sellPrice = order.price;
        }
        existing.sellVolume += order.volume_remain;
      }
    }
  }

  // Clean up Infinity values (no sell orders)
  for (const [typeId, price] of priceMap) {
    if (price.sellPrice === Infinity) {
      price.sellPrice = 0;
    }
  }

  return priceMap;
}

// Fetch type info from ESI if not in DB
async function ensureTypeExists(typeId: number): Promise<boolean> {
  const existing = await prisma.eveType.findUnique({ where: { id: typeId } });
  if (existing) return true;

  try {
    // Fetch type info
    const typeResponse = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/?datasource=tranquility`);
    if (!typeResponse.ok) return false;

    const typeInfo: ESITypeInfo = await typeResponse.json();

    // Fetch group info for category_id
    const groupResponse = await fetch(`${ESI_BASE_URL}/universe/groups/${typeInfo.group_id}/?datasource=tranquility`);
    if (!groupResponse.ok) return false;

    const groupInfo: ESIGroupInfo = await groupResponse.json();

    // Create type in DB
    await prisma.eveType.create({
      data: {
        id: typeInfo.type_id,
        name: typeInfo.name,
        groupId: typeInfo.group_id,
        categoryId: groupInfo.category_id,
        volume: typeInfo.volume || 0,
        packagedVolume: typeInfo.packaged_volume,
        portionSize: typeInfo.portion_size || 1,
        iconId: typeInfo.icon_id,
      }
    });

    return true;
  } catch (error) {
    console.error(`[MarketFetcher] Failed to fetch type ${typeId}:`, error);
    return false;
  }
}

// Check if a region's data is still fresh (last successful fetch < FRESHNESS_MS ago)
export async function isRegionFresh(regionId: TradeHubRegion): Promise<boolean> {
  const lastJob = await prisma.marketFetchJob.findFirst({
    where: {
      regionId: BigInt(regionId),
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  if (!lastJob?.completedAt) return false;

  const age = Date.now() - lastJob.completedAt.getTime();
  return age < FRESHNESS_MS;
}

// Main fetch function for a region
export async function fetchMarketPrices(regionId: TradeHubRegion): Promise<void> {
  const regionIdBigInt = BigInt(regionId);
  const regionIdStr = regionId.toString();

  // Create job record
  const job = await prisma.marketFetchJob.create({
    data: {
      regionId: regionIdBigInt,
      status: "running",
      startedAt: new Date(),
    }
  });

  // Initialize progress
  const progress: FetchProgress = {
    jobId: job.id,
    regionId: regionIdStr,
    regionName: REGION_NAMES[regionIdStr] || `Region ${regionIdStr}`,
    status: "fetching_orders",
    currentPage: 0,
    totalPages: 0,
    currentType: 0,
    totalTypes: 0,
    successCount: 0,
    errorCount: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await publishProgress(progress);

  try {
    console.log(`[MarketFetcher] Starting fetch for region ${regionId}`);

    // Fetch all orders
    const orders = await fetchAllMarketOrders(regionIdBigInt, progress);
    console.log(`[MarketFetcher] Total orders fetched: ${orders.length}`);

    // Aggregate prices
    const prices = aggregateOrders(orders);
    console.log(`[MarketFetcher] Unique types: ${prices.size}`);

    // Update progress for processing phase
    progress.status = "processing_types";
    progress.totalTypes = prices.size;
    progress.currentType = 0;
    await publishProgress(progress);

    // Update database
    let successCount = 0;
    let errorCount = 0;
    let processedCount = 0;

    for (const [typeId, price] of prices) {
      try {
        // Ensure type exists
        const typeExists = await ensureTypeExists(typeId);
        if (!typeExists) {
          errorCount++;
          processedCount++;
          continue;
        }

        // Upsert current price
        await prisma.marketPrice.upsert({
          where: {
            typeId_regionId: {
              typeId,
              regionId: regionIdBigInt,
            }
          },
          update: {
            buyPrice: price.buyPrice,
            sellPrice: price.sellPrice,
            buyVolume: BigInt(price.buyVolume),
            sellVolume: BigInt(price.sellVolume),
          },
          create: {
            typeId,
            regionId: regionIdBigInt,
            buyPrice: price.buyPrice,
            sellPrice: price.sellPrice,
            buyVolume: BigInt(price.buyVolume),
            sellVolume: BigInt(price.sellVolume),
          }
        });

        // Add to history
        await prisma.marketPriceHistory.create({
          data: {
            typeId,
            regionId: regionIdBigInt,
            buyPrice: price.buyPrice,
            sellPrice: price.sellPrice,
            buyVolume: BigInt(price.buyVolume),
            sellVolume: BigInt(price.sellVolume),
          }
        });

        successCount++;
        processedCount++;

        // Update progress every 100 types
        if (processedCount % 100 === 0) {
          progress.currentType = processedCount;
          progress.successCount = successCount;
          progress.errorCount = errorCount;
          progress.updatedAt = new Date().toISOString();
          await publishProgress(progress);
        }
      } catch (error) {
        console.error(`[MarketFetcher] Error processing type ${typeId}:`, error);
        errorCount++;
        processedCount++;
      }
    }

    // Update job as completed
    await prisma.marketFetchJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        itemsCount: successCount,
        completedAt: new Date(),
      }
    });

    // Final progress update
    progress.status = "completed";
    progress.currentType = processedCount;
    progress.successCount = successCount;
    progress.errorCount = errorCount;
    progress.updatedAt = new Date().toISOString();
    await publishProgress(progress);

    console.log(`[MarketFetcher] Completed: ${successCount} types updated, ${errorCount} errors`);

    // Clear progress after 30 seconds
    setTimeout(() => clearProgress(), 30000);

  } catch (error) {
    // Update job as failed
    await prisma.marketFetchJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      }
    });

    // Update progress as failed
    progress.status = "failed";
    progress.updatedAt = new Date().toISOString();
    await publishProgress(progress);

    console.error(`[MarketFetcher] Failed:`, error);
    throw error;
  }
}

// Fetch all trade hub regions (skips regions with fresh data)
export async function fetchAllRegions(): Promise<void> {
  const { TRADE_HUB_REGIONS } = await import("./types.js");

  for (const [name, regionId] of Object.entries(TRADE_HUB_REGIONS)) {
    const rid = regionId as TradeHubRegion;
    const fresh = await isRegionFresh(rid);
    if (fresh) {
      console.log(`[MarketFetcher] ${name} — data is fresh, skipping`);
      continue;
    }

    console.log(`\n[MarketFetcher] ========== ${name} ==========`);
    try {
      await fetchMarketPrices(rid);
    } catch (error) {
      console.error(`[MarketFetcher] Failed to fetch ${name}:`, error);
      // Continue with next region
    }
    // Wait between regions to avoid rate limits
    await delay(5000);
  }
}

// Backfill 1 year of history from ESI for all types across all regions
export async function backfillHistory(): Promise<void> {
  const { TRADE_HUB_REGIONS } = await import("./types.js");

  // Get all types that have current market prices (= types we care about)
  const typesWithPrices = await prisma.marketPrice.findMany({
    select: { typeId: true, regionId: true },
  });

  // Group by region
  const typesByRegion = new Map<bigint, number[]>();
  for (const tp of typesWithPrices) {
    const types = typesByRegion.get(tp.regionId) || [];
    types.push(tp.typeId);
    typesByRegion.set(tp.regionId, types);
  }

  const regionIds = Object.values(TRADE_HUB_REGIONS) as bigint[];

  // Initialize progress
  const totalTypes = Array.from(typesByRegion.values()).reduce((sum, arr) => sum + arr.length, 0);
  const progress: FetchProgress = {
    jobId: "backfill-history",
    regionId: "all",
    regionName: "Backfill historique (1 an)",
    status: "processing_types",
    currentPage: 0,
    totalPages: 0,
    currentType: 0,
    totalTypes: totalTypes,
    successCount: 0,
    errorCount: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await publishProgress(progress);
  console.log(`[Backfill] Starting history backfill for ${totalTypes} type-region pairs`);

  let globalProcessed = 0;

  for (const regionId of regionIds) {
    const types = typesByRegion.get(regionId);
    if (!types || types.length === 0) continue;

    const regionName = REGION_NAMES[regionId.toString()] || `Region ${regionId}`;
    console.log(`[Backfill] Region ${regionName}: ${types.length} types`);

    for (const typeId of types) {
      try {
        const url = `${ESI_BASE_URL}/markets/${regionId}/history/?datasource=tranquility&type_id=${typeId}`;
        const response = await fetch(url, { headers: { Accept: "application/json" } });

        if (response.status === 420) {
          console.log(`[Backfill] Rate limited, waiting 60s...`);
          await delay(60000);
          // Retry once
          const retry = await fetch(url, { headers: { Accept: "application/json" } });
          if (!retry.ok) {
            progress.errorCount++;
            globalProcessed++;
            continue;
          }
          const retryData = await retry.json();
          await insertHistoryRows(typeId, regionId, retryData);
          progress.successCount++;
        } else if (!response.ok) {
          progress.errorCount++;
        } else {
          const data: Array<{
            date: string;
            average: number;
            highest: number;
            lowest: number;
            order_count: number;
            volume: number;
          }> = await response.json();

          await insertHistoryRows(typeId, regionId, data);
          progress.successCount++;
        }
      } catch (err) {
        console.error(`[Backfill] Error type=${typeId} region=${regionId}:`, err);
        progress.errorCount++;
      }

      globalProcessed++;
      progress.currentType = globalProcessed;
      progress.updatedAt = new Date().toISOString();

      if (globalProcessed % 100 === 0) {
        await publishProgress(progress);
        console.log(`[Backfill] Progress: ${globalProcessed}/${totalTypes} (${progress.successCount} ok, ${progress.errorCount} err)`);
      }

      // Rate limit protection
      await delay(RATE_LIMIT_DELAY);
    }
  }

  progress.status = "completed";
  progress.updatedAt = new Date().toISOString();
  await publishProgress(progress);
  console.log(`[Backfill] Done: ${progress.successCount} ok, ${progress.errorCount} errors`);
  setTimeout(() => clearProgress(), 30000);
}

// Insert ESI history rows, skipping dates that already exist
async function insertHistoryRows(
  typeId: number,
  regionId: bigint,
  data: Array<{ date: string; average: number; highest: number; lowest: number; volume: number; order_count: number }>
): Promise<void> {
  if (data.length === 0) return;

  // Get existing dates for this type+region to avoid duplicates
  const existing = await prisma.marketPriceHistory.findMany({
    where: { typeId, regionId },
    select: { recordedAt: true },
  });

  const existingDates = new Set(
    existing.map((e) => e.recordedAt.toISOString().split("T")[0])
  );

  const newRows = data
    .filter((d) => !existingDates.has(d.date))
    .map((d) => ({
      typeId,
      regionId,
      // ESI history gives average/highest/lowest — use highest as sell proxy, average as buy proxy
      buyPrice: d.average,
      sellPrice: d.lowest > 0 ? d.lowest : d.average,
      buyVolume: BigInt(Math.floor(d.volume / 2)),
      sellVolume: BigInt(Math.ceil(d.volume / 2)),
      recordedAt: new Date(d.date + "T12:00:00Z"),
    }));

  if (newRows.length > 0) {
    await prisma.marketPriceHistory.createMany({ data: newRows });
  }
}

// Clean up old history (keep 90 days)
export async function cleanupOldHistory(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.marketPriceHistory.deleteMany({
    where: {
      recordedAt: { lt: cutoffDate }
    }
  });

  console.log(`[MarketFetcher] Cleaned up ${result.count} old history records`);
  return result.count;
}

// Clean up expired appraisals
export async function cleanupExpiredAppraisals(): Promise<number> {
  const result = await prisma.appraisal.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });

  console.log(`[MarketFetcher] Cleaned up ${result.count} expired appraisals`);
  return result.count;
}
