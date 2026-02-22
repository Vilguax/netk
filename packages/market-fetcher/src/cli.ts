#!/usr/bin/env node
import { fetchMarketPrices, fetchAllRegions, cleanupOldHistory, cleanupExpiredAppraisals } from "./fetcher.js";
import { TRADE_HUB_REGIONS } from "./types.js";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log("[MarketFetcher CLI] Starting...\n");

  switch (command) {
    case "fetch":
      const region = args[1]?.toUpperCase();
      if (region && region in TRADE_HUB_REGIONS) {
        const regionId = TRADE_HUB_REGIONS[region as keyof typeof TRADE_HUB_REGIONS];
        await fetchMarketPrices(regionId);
      } else {
        console.log("Usage: fetch <region>");
        console.log("Regions: THE_FORGE, DOMAIN, HEIMATAR, SINQ_LAISON, METROPOLIS");
      }
      break;

    case "fetch-all":
      await fetchAllRegions();
      break;

    case "cleanup":
      const days = parseInt(args[1] || "90", 10);
      await cleanupOldHistory(days);
      await cleanupExpiredAppraisals();
      break;

    case "help":
    default:
      console.log(`
NETK Market Fetcher CLI

Commands:
  fetch <region>    Fetch market prices for a specific region
                    Regions: THE_FORGE, DOMAIN, HEIMATAR, SINQ_LAISON, METROPOLIS

  fetch-all         Fetch market prices for all trade hub regions

  cleanup [days]    Clean up old history (default: 90 days) and expired appraisals

Examples:
  npm run fetch -- fetch THE_FORGE
  npm run fetch -- fetch-all
  npm run fetch -- cleanup 30
      `);
  }

  console.log("\n[MarketFetcher CLI] Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("[MarketFetcher CLI] Fatal error:", error);
  process.exit(1);
});
