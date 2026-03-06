#!/usr/bin/env node
// Builds systems-planets.json from Fuzzwork CSVs:
//   mapDenormalize.csv  → planet types per system
//   mapSolarSystems.csv → system name, security, region
//
// Output: apps/pi/public/data/systems-planets.json
// Format: { "30000142": { n: "Jita", s: 0.95, r: 10000002, t: ["barren","temperate","gas","lava","ice"] }, ... }
//
// Usage: node apps/pi/scripts/generate-planet-data.mjs

import { createWriteStream, mkdirSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import { createReadStream } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR  = join(__dirname, "../public/data");
const OUT_FILE = join(OUT_DIR, "systems-planets.json");

const TMP_DENORM = join(__dirname, "_mapDenormalize.csv");
const TMP_SYSTEMS = join(__dirname, "_mapSolarSystems.csv");

const FUZZWORK = "https://www.fuzzwork.co.uk/dump/latest/";

// EVE typeID → PI planet type name
const PLANET_TYPES = {
  11:   "temperate",
  12:   "ice",
  13:   "gas",
  2014: "oceanic",
  2015: "lava",
  2016: "barren",
  2017: "storm",
  2063: "plasma",
};

const PLANET_GROUP_ID = 7;

async function downloadFile(url, dest) {
  if (existsSync(dest)) {
    console.log(`  (cached) ${dest}`);
    return;
  }
  console.log(`Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);

  const total = Number(res.headers.get("content-length") ?? 0);
  let received = 0;

  const writer = createWriteStream(dest);
  const reader = res.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    writer.write(Buffer.from(value));
    received += value.length;
    if (total > 0) {
      const pct = ((received / total) * 100).toFixed(1);
      process.stdout.write(`\r  ${pct}% (${Math.round(received / 1024 / 1024)} MB)`);
    }
  }

  await new Promise((resolve, reject) => {
    writer.end();
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
  process.stdout.write("\n");
}

// mapSolarSystems.csv columns (from Fuzzwork dump):
// regionID(0), constellationID(1), solarSystemID(2), solarSystemName(3),
// x(4), y(5), z(6), xMin(7), xMax(8), yMin(9), yMax(10), zMin(11), zMax(12),
// luminosity(13), border(14), fringe(15), corridor(16), hub(17), international(18),
// regional(19), constellation(20), security(21), factionID(22), radius(23),
// sunTypeID(24), securityClass(25)
const SS_COL_SYSTEM_ID = 2;
const SS_COL_NAME      = 3;
const SS_COL_X         = 4;
const SS_COL_Y         = 5;
const SS_COL_Z         = 6;
const SS_COL_SECURITY  = 21;
const SS_COL_REGION    = 0;

// EVE coordinates are in meters (~1e17 range). Divide by 1e13 → compact integers (thousands range).
const COORD_SCALE = 1e13;

async function loadSystemMeta() {
  console.log("Parsing mapSolarSystems.csv...");
  const meta = {}; // solarSystemID → { n, s, r, x, y, z }
  const rl = createInterface({
    input: createReadStream(TMP_SYSTEMS, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let header = true;
  for await (const line of rl) {
    if (header) { header = false; continue; }
    const cols = line.split(",");
    const id  = cols[SS_COL_SYSTEM_ID];
    const name = cols[SS_COL_NAME];
    const sec  = parseFloat(cols[SS_COL_SECURITY]);
    const rid  = parseInt(cols[SS_COL_REGION], 10);
    const x   = Math.round(parseFloat(cols[SS_COL_X]) / COORD_SCALE);
    const y   = Math.round(parseFloat(cols[SS_COL_Y]) / COORD_SCALE);
    const z   = Math.round(parseFloat(cols[SS_COL_Z]) / COORD_SCALE);
    if (id && name) {
      meta[id] = { n: name, s: Math.round(sec * 100) / 100, r: rid, x, y, z };
    }
  }
  console.log(`  → ${Object.keys(meta).length.toLocaleString()} systems loaded`);
  return meta;
}

// mapDenormalize.csv columns:
// itemID(0), typeID(1), groupID(2), solarSystemID(3), constellationID(4), regionID(5), ...
const DN_COL_TYPE_ID   = 1;
const DN_COL_GROUP_ID  = 2;
const DN_COL_SYSTEM_ID = 3;

async function loadPlanetTypes() {
  console.log("Parsing mapDenormalize.csv (planet rows only)...");
  const planets = {}; // solarSystemID → Set<typeName>
  let lineCount = 0;
  let piCount = 0;

  const rl = createInterface({
    input: createReadStream(TMP_DENORM, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let header = true;
  for await (const line of rl) {
    if (header) { header = false; continue; }
    lineCount++;
    if (lineCount % 500_000 === 0) {
      process.stdout.write(`\r  ${(lineCount / 1_000_000).toFixed(1)}M lines...`);
    }

    const cols = line.split(",");
    if (Number(cols[DN_COL_GROUP_ID]) !== PLANET_GROUP_ID) continue;

    const typeId   = Number(cols[DN_COL_TYPE_ID]);
    const systemId = cols[DN_COL_SYSTEM_ID];
    if (!systemId || systemId === "None") continue;

    const typeName = PLANET_TYPES[typeId];
    if (!typeName) continue;

    if (!planets[systemId]) planets[systemId] = new Set();
    planets[systemId].add(typeName);
    piCount++;
  }

  process.stdout.write("\n");
  console.log(`  ${lineCount.toLocaleString()} lines, ${piCount.toLocaleString()} PI planets in ${Object.keys(planets).length.toLocaleString()} systems`);
  return planets;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  await downloadFile(FUZZWORK + "mapDenormalize.csv", TMP_DENORM);
  await downloadFile(FUZZWORK + "mapSolarSystems.csv", TMP_SYSTEMS);

  const [planetTypes, systemMeta] = await Promise.all([
    loadPlanetTypes(),
    loadSystemMeta(),
  ]);

  // Merge: only keep systems that appear in both (i.e., k-space + some j-space with names)
  const result = {};
  for (const [sysId, types] of Object.entries(planetTypes)) {
    const meta = systemMeta[sysId];
    if (!meta) continue; // skip systems with no name (shouldn't happen for k-space)
    result[sysId] = {
      n: meta.n,
      s: meta.s,
      r: meta.r,
      x: meta.x,
      y: meta.y,
      z: meta.z,
      t: [...types],
    };
  }

  const count = Object.keys(result).length;
  console.log(`\nMerged: ${count.toLocaleString()} systems with planet data + names`);

  writeFileSync(OUT_FILE, JSON.stringify(result));
  const sizeKb = Math.round(JSON.stringify(result).length / 1024);
  console.log(`Saved: ${OUT_FILE} (${sizeKb} KB)`);

  // Cleanup
  [TMP_DENORM, TMP_SYSTEMS].forEach((f) => { try { unlinkSync(f); } catch {} });
  console.log("Temp files removed.");
}

main().catch((e) => { console.error(e); process.exit(1); });
