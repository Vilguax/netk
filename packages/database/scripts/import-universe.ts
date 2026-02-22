/**
 * Universe Map Import Script
 * Downloads EVE Online solar system data from Fuzzwork SDE and generates
 * a compact JSON file for the Fleet Manager map visualization.
 *
 * Data sources:
 * - mapSolarSystems: https://www.fuzzwork.co.uk/dump/latest/mapSolarSystems.csv
 * - mapSolarSystemJumps: https://www.fuzzwork.co.uk/dump/latest/mapSolarSystemJumps.csv
 * - mapRegions: https://www.fuzzwork.co.uk/dump/latest/mapRegions.csv
 * - mapConstellations: https://www.fuzzwork.co.uk/dump/latest/mapConstellations.csv
 *
 * Usage: npm run sde:universe
 * Output: apps/ratting/public/data/universe.json
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

const FUZZWORK_BASE = "https://www.fuzzwork.co.uk/dump/latest";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function fetchCSV<T>(
  url: string,
  parser: (row: string[]) => T | null
): Promise<T[]> {
  console.log(`Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const text = await response.text();
  const lines = text.split("\n");
  const results: T[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = parseCSVLine(line);
    const parsed = parser(row);
    if (parsed) results.push(parsed);
  }

  console.log(`  Parsed ${results.length} rows`);
  return results;
}

interface RawSystem {
  regionID: number;
  constellationID: number;
  solarSystemID: number;
  solarSystemName: string;
  x: number;
  y: number;
  z: number;
  security: number;
}

interface RawJump {
  fromSystemID: number;
  toSystemID: number;
}

interface RawRegion {
  regionID: number;
  regionName: string;
  x: number;
  z: number;
}

interface RawConstellation {
  constellationID: number;
  constellationName: string;
  regionID: number;
}

// Output format (compact keys to minimize file size)
interface UniverseData {
  systems: Record<
    string,
    { n: string; x: number; z: number; s: number; cid: number; rid: number }
  >;
  connections: [number, number][];
  constellations: Record<string, { n: string; rid: number }>;
  regions: Record<string, { n: string; x: number; z: number }>;
}

async function main() {
  console.log("=== Universe Map Import ===\n");

  // 1. Fetch regions
  console.log("1. Fetching regions...");
  const regions = await fetchCSV<RawRegion>(
    `${FUZZWORK_BASE}/mapRegions.csv`,
    (row) => {
      // regionID, regionName, x, y, z, ...
      if (row.length < 5) return null;
      const regionID = parseInt(row[0]);
      // Skip wormhole regions (ID >= 11000000) and special regions
      if (regionID >= 11000000) return null;
      // Skip Jove space (10000004, 10000017, 10000019) and some specials
      if ([10000004, 10000017, 10000019].includes(regionID)) return null;
      return {
        regionID,
        regionName: row[1],
        x: parseFloat(row[2]),
        z: parseFloat(row[4]),
      };
    }
  );

  // 2. Fetch constellations
  console.log("\n2. Fetching constellations...");
  const constellations = await fetchCSV<RawConstellation>(
    `${FUZZWORK_BASE}/mapConstellations.csv`,
    (row) => {
      // CSV: regionID(0), constellationID(1), constellationName(2), x, y, z, ...
      if (row.length < 3) return null;
      const regionID = parseInt(row[0]);
      if (regionID >= 11000000) return null;
      return {
        constellationID: parseInt(row[1]),
        constellationName: row[2],
        regionID,
      };
    }
  );

  // Build region ID set for filtering
  const validRegionIds = new Set(regions.map((r) => r.regionID));
  const validConstellationIds = new Set(constellations.map((c) => c.constellationID));

  // 3. Fetch solar systems
  console.log("\n3. Fetching solar systems...");
  const systems = await fetchCSV<RawSystem>(
    `${FUZZWORK_BASE}/mapSolarSystems.csv`,
    (row) => {
      // regionID, constellationID, solarSystemID, solarSystemName, x, y, z, ...security
      if (row.length < 8) return null;
      const regionID = parseInt(row[0]);
      const constellationID = parseInt(row[1]);
      if (!validRegionIds.has(regionID)) return null;
      return {
        regionID,
        constellationID,
        solarSystemID: parseInt(row[2]),
        solarSystemName: row[3],
        x: parseFloat(row[4]),
        y: parseFloat(row[5]),
        z: parseFloat(row[6]),
        security: parseFloat(row[21]) || 0, // Column 21 is security
      };
    }
  );

  // 4. Fetch jumps
  console.log("\n4. Fetching stargate connections...");
  const validSystemIds = new Set(systems.map((s) => s.solarSystemID));
  const jumps = await fetchCSV<RawJump>(
    `${FUZZWORK_BASE}/mapSolarSystemJumps.csv`,
    (row) => {
      // CSV: fromRegionID(0), fromConstellationID(1), fromSolarSystemID(2), toSolarSystemID(3), ...
      if (row.length < 4) return null;
      const from = parseInt(row[2]);
      const to = parseInt(row[3]);
      // Only include jumps between valid systems, and deduplicate (from < to)
      if (!validSystemIds.has(from) || !validSystemIds.has(to)) return null;
      if (from >= to) return null; // Only keep one direction
      return { fromSystemID: from, toSystemID: to };
    }
  );

  // 5. Normalize coordinates
  // EVE coordinates are massive (light-years). We normalize to a reasonable range.
  console.log("\n5. Normalizing coordinates...");
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const sys of systems) {
    if (sys.x < minX) minX = sys.x;
    if (sys.x > maxX) maxX = sys.x;
    if (sys.z < minZ) minZ = sys.z;
    if (sys.z > maxZ) maxZ = sys.z;
  }
  const rangeX = maxX - minX;
  const rangeZ = maxZ - minZ;
  const scale = Math.max(rangeX, rangeZ);

  // 6. Build output
  console.log("\n6. Building output...");
  const output: UniverseData = {
    systems: {},
    connections: [],
    constellations: {},
    regions: {},
  };

  // Systems: normalize to 0-1000 range
  for (const sys of systems) {
    const nx = Math.round(((sys.x - minX) / scale) * 10000) / 10;
    const nz = Math.round(((sys.z - minZ) / scale) * 10000) / 10;
    const sec = Math.round(sys.security * 100) / 100;
    output.systems[sys.solarSystemID] = {
      n: sys.solarSystemName,
      x: nx,
      z: nz,
      s: sec,
      cid: sys.constellationID,
      rid: sys.regionID,
    };
  }

  // Connections
  output.connections = jumps.map((j) => [j.fromSystemID, j.toSystemID]);

  // Constellations
  for (const c of constellations) {
    if (!validConstellationIds.has(c.constellationID)) continue;
    output.constellations[c.constellationID] = {
      n: c.constellationName,
      rid: c.regionID,
    };
  }

  // Regions: compute center from their systems
  const regionSystemsX: Record<number, number[]> = {};
  const regionSystemsZ: Record<number, number[]> = {};
  for (const sys of systems) {
    if (!regionSystemsX[sys.regionID]) {
      regionSystemsX[sys.regionID] = [];
      regionSystemsZ[sys.regionID] = [];
    }
    const nx = ((sys.x - minX) / scale) * 1000;
    const nz = ((sys.z - minZ) / scale) * 1000;
    regionSystemsX[sys.regionID].push(nx);
    regionSystemsZ[sys.regionID].push(nz);
  }

  for (const r of regions) {
    const xs = regionSystemsX[r.regionID];
    const zs = regionSystemsZ[r.regionID];
    if (!xs || xs.length === 0) continue;
    const cx = Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
    const cz = Math.round((zs.reduce((a, b) => a + b, 0) / zs.length) * 10) / 10;
    output.regions[r.regionID] = {
      n: r.regionName,
      x: cx,
      z: cz,
    };
  }

  // 7. Write output
  const outputDir = resolve(__dirname, "../../../apps/ratting/public/data");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = resolve(outputDir, "universe.json");
  const json = JSON.stringify(output);
  writeFileSync(outputPath, json, "utf-8");

  const sizeKB = Math.round(json.length / 1024);
  console.log(`\n=== Import complete! ===`);
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${sizeKB} KB`);
  console.log(`Systems: ${Object.keys(output.systems).length}`);
  console.log(`Connections: ${output.connections.length}`);
  console.log(`Constellations: ${Object.keys(output.constellations).length}`);
  console.log(`Regions: ${Object.keys(output.regions).length}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
