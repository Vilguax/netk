#!/usr/bin/env node
/**
 * Market Fetcher Scheduler
 *
 * Runs as a background daemon that fetches market prices every 3 hours.
 * Also listens for Redis commands from admin API for manual triggers.
 *
 * Can be run via: npm run dev (watch mode) or npm start (production)
 * For production, use PM2 or systemd to manage the process.
 */

import { fetchAllRegions, fetchMarketPrices, isRegionFresh, backfillHistory, cleanupOldHistory, cleanupExpiredAppraisals } from "./fetcher.js";
import { TRADE_HUB_REGIONS, TradeHubRegion } from "./types.js";
import Redis from "ioredis";

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REDIS_CHANNEL = "netk:market-fetcher:command";

// History retention: 90 days in dev, 5 years in production
const HISTORY_RETENTION_DAYS = process.env.NODE_ENV === "production" ? 1825 : 90;

let isRunning = false;
let lastFetchTime: Date | null = null;
let lastCleanupTime: Date | null = null;
let redisSubscriber: Redis | null = null;

// Region name to ID mapping
const REGION_MAP: Record<string, TradeHubRegion> = {
  "the-forge": TRADE_HUB_REGIONS.THE_FORGE,
  "domain": TRADE_HUB_REGIONS.DOMAIN,
  "heimatar": TRADE_HUB_REGIONS.HEIMATAR,
  "sinq-laison": TRADE_HUB_REGIONS.SINQ_LAISON,
  "metropolis": TRADE_HUB_REGIONS.METROPOLIS,
};

async function runFetchCycle(): Promise<void> {
  if (isRunning) {
    console.log("[Scheduler] Fetch already in progress, skipping...");
    return;
  }

  isRunning = true;
  const startTime = new Date();
  console.log(`\n[Scheduler] ========================================`);
  console.log(`[Scheduler] Starting fetch cycle at ${startTime.toISOString()}`);
  console.log(`[Scheduler] ========================================\n`);

  try {
    await fetchAllRegions();
    lastFetchTime = new Date();
    console.log(`\n[Scheduler] Fetch cycle completed in ${(Date.now() - startTime.getTime()) / 1000}s`);
  } catch (error) {
    console.error("[Scheduler] Fetch cycle failed:", error);
  } finally {
    isRunning = false;
  }
}

async function runCleanupCycle(): Promise<void> {
  console.log(`\n[Scheduler] Running daily cleanup (keeping ${HISTORY_RETENTION_DAYS} days)...`);
  try {
    await cleanupOldHistory(HISTORY_RETENTION_DAYS);
    await cleanupExpiredAppraisals();
    lastCleanupTime = new Date();
    console.log(`[Scheduler] Cleanup completed`);
  } catch (error) {
    console.error("[Scheduler] Cleanup failed:", error);
  }
}

// Handle manual fetch command from admin API
async function handleCommand(message: string): Promise<void> {
  try {
    const command = JSON.parse(message);
    console.log(`\n[Scheduler] Received command:`, command);

    if (command.type === "fetch-all") {
      console.log("[Scheduler] Admin triggered: fetch all regions");
      await runFetchCycle();
    } else if (command.type === "fetch-region" && command.region) {
      const regionId = REGION_MAP[command.region];
      if (regionId) {
        if (isRunning) {
          console.log("[Scheduler] Fetch already in progress, skipping...");
          return;
        }
        // Check freshness unless force flag is set
        if (!command.force && await isRegionFresh(regionId)) {
          console.log(`[Scheduler] ${command.region} — data is fresh, skipping (use force to override)`);
          return;
        }
        console.log(`[Scheduler] Admin triggered: fetch region ${command.region}`);
        isRunning = true;
        try {
          await fetchMarketPrices(regionId);
          lastFetchTime = new Date();
        } finally {
          isRunning = false;
        }
      } else {
        console.log(`[Scheduler] Unknown region: ${command.region}`);
      }
    } else if (command.type === "backfill-history") {
      if (isRunning) {
        console.log("[Scheduler] Fetch already in progress, skipping backfill...");
        return;
      }
      console.log("[Scheduler] Admin triggered: backfill 1 year history");
      isRunning = true;
      try {
        await backfillHistory();
      } finally {
        isRunning = false;
      }
    } else if (command.type === "cleanup") {
      console.log("[Scheduler] Admin triggered: cleanup");
      await runCleanupCycle();
    } else {
      console.log(`[Scheduler] Unknown command type: ${command.type}`);
    }
  } catch (error) {
    console.error("[Scheduler] Error handling command:", error);
  }
}

// Setup Redis subscriber for admin commands
async function setupRedisSubscriber(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  redisSubscriber = new Redis(redisUrl);

  redisSubscriber.on("error", (err) => {
    console.error("[Scheduler] Redis subscriber error:", err.message);
  });

  redisSubscriber.on("connect", () => {
    console.log("[Scheduler] Redis subscriber connected");
  });

  await redisSubscriber.subscribe(REDIS_CHANNEL);
  console.log(`[Scheduler] Subscribed to ${REDIS_CHANNEL}`);

  redisSubscriber.on("message", async (channel, message) => {
    if (channel === REDIS_CHANNEL) {
      await handleCommand(message);
    }
  });
}

function formatNextRun(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           NETK Market Fetcher Scheduler                ║
║                                                        ║
║  Fetches market prices every 3 hours                   ║
║  Listens for admin commands via Redis                  ║
║  Cleans up old data daily                              ║
╚════════════════════════════════════════════════════════╝
  `);

  // Setup Redis subscriber for admin commands
  try {
    await setupRedisSubscriber();
  } catch (error) {
    console.error("[Scheduler] Failed to setup Redis subscriber:", error);
    console.log("[Scheduler] Continuing without admin command support...");
  }

  // Run initial fetch immediately
  await runFetchCycle();

  // Schedule recurring fetch every 3 hours
  setInterval(async () => {
    await runFetchCycle();
  }, THREE_HOURS_MS);

  // Schedule cleanup once a day
  setInterval(async () => {
    await runCleanupCycle();
  }, ONE_DAY_MS);

  // Status logging every 30 minutes
  setInterval(() => {
    const now = new Date();
    const timeSinceLastFetch = lastFetchTime ? now.getTime() - lastFetchTime.getTime() : null;
    const nextFetchIn = timeSinceLastFetch ? THREE_HOURS_MS - timeSinceLastFetch : THREE_HOURS_MS;

    console.log(`\n[Scheduler] Status at ${now.toISOString()}`);
    console.log(`[Scheduler] Last fetch: ${lastFetchTime?.toISOString() || "Never"}`);
    console.log(`[Scheduler] Next fetch in: ${formatNextRun(Math.max(0, nextFetchIn))}`);
    console.log(`[Scheduler] Currently running: ${isRunning}`);
  }, 30 * 60 * 1000);

  console.log(`\n[Scheduler] Scheduler started. Next fetch in 3 hours.`);
  console.log(`[Scheduler] Press Ctrl+C to stop.\n`);

  // Keep process alive
  process.on("SIGINT", async () => {
    console.log("\n[Scheduler] Shutting down...");
    if (redisSubscriber) {
      await redisSubscriber.quit();
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n[Scheduler] Received SIGTERM, shutting down...");
    if (redisSubscriber) {
      await redisSubscriber.quit();
    }
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[Scheduler] Fatal error:", error);
  process.exit(1);
});
