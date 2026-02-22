/**
 * SDE Import Script
 * Downloads and imports EVE Online Static Data Export from Fuzzwork
 *
 * Data sources:
 * - invTypes.csv:         https://www.fuzzwork.co.uk/dump/latest/invTypes.csv
 * - invGroups.csv:        https://www.fuzzwork.co.uk/dump/latest/invGroups.csv
 * - invTypeMaterials.csv: https://www.fuzzwork.co.uk/dump/latest/invTypeMaterials.csv
 *
 * invTypes.csv column order (0-indexed):
 *   0:typeID  1:groupID  2:typeName  3:description  4:mass  5:volume
 *   6:capacity  7:portionSize  8:raceID  9:basePrice  10:published
 *   11:marketGroupID  12:iconID  ...
 *
 * Usage: npm run sde:import -w @netk/database
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FUZZWORK_BASE = "https://www.fuzzwork.co.uk/dump/latest";

// Standard mineral type IDs (outputs from ore reprocessing)
const MINERAL_TYPE_IDS = new Set([
  34,    // Tritanium
  35,    // Pyerite
  36,    // Mexallon
  37,    // Isogen
  38,    // Nocxium
  39,    // Zydrine
  40,    // Megacyte
  11399, // Morphite
]);

// Category IDs
const ASTEROID_CATEGORY_ID = 25; // All ores (regular + moon)
const MATERIAL_CATEGORY_ID = 4;  // Minerals + other materials

interface InvGroup {
  groupID: number;
  categoryID: number;
  groupName: string;
}

interface InvType {
  typeID: number;
  groupID: number;
  typeName: string;
  volume: number;
  portionSize: number;
  iconID: number | null;
}

interface InvTypeMaterial {
  typeID: number;
  materialTypeID: number;
  quantity: number;
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Parse a full CSV text into rows, handling:
 * - Quoted fields with embedded commas
 * - Embedded newlines inside quoted fields (invTypes.csv descriptions)
 * - "" as escaped quote inside a quoted field
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current);
        current = "";
      } else if (char === "\n") {
        row.push(current);
        current = "";
        rows.push([...row]);
        row.length = 0;
      } else if (char !== "\r") {
        current += char;
      }
    }
  }

  // Flush last field/row
  if (current || row.length > 0) {
    row.push(current);
    rows.push([...row]);
  }

  return rows;
}

async function fetchCSV<T>(url: string, parser: (row: string[]) => T | null): Promise<T[]> {
  console.log(`  Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const text = await response.text();
  const allRows = parseCSV(text);
  const results: T[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;
    const parsed = parser(row);
    if (parsed !== null) {
      results.push(parsed);
    }
  }

  console.log(`  → ${results.length} rows parsed`);
  return results;
}

// ---------------------------------------------------------------------------
// Step 0: Import solar systems (for jump range calculation)
// ---------------------------------------------------------------------------

async function importSolarSystems(): Promise<void> {
  console.log("\n0. Importing solar systems (mapSolarSystems.csv)...");

  // mapSolarSystems.csv columns:
  //   0:regionID  1:constellationID  2:solarSystemID  3:solarSystemName
  //   4:x  5:y  6:z  ...  21:security
  const systems = await fetchCSV<{
    systemId: number;
    name: string;
    x: number;
    y: number;
    z: number;
    securityStatus: number;
  }>(
    `${FUZZWORK_BASE}/mapSolarSystems.csv`,
    (row) => {
      if (row.length < 22) return null;
      const systemId = parseInt(row[2]);
      if (isNaN(systemId)) return null;
      const x = parseFloat(row[4]);
      const y = parseFloat(row[5]);
      const z = parseFloat(row[6]);
      const sec = parseFloat(row[21]);
      if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(sec)) return null;
      return { systemId, name: row[3], x, y, z, securityStatus: sec };
    }
  );

  console.log(`  Upserting ${systems.length} solar systems...`);

  // Batch upsert
  const BATCH_SIZE = 500;
  for (let i = 0; i < systems.length; i += BATCH_SIZE) {
    const batch = systems.slice(i, i + BATCH_SIZE);
    for (const s of batch) {
      await prisma.solarSystem.upsert({
        where: { systemId: s.systemId },
        create: s,
        update: { name: s.name, x: s.x, y: s.y, z: s.z, securityStatus: s.securityStatus },
      });
    }
    if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= systems.length) {
      console.log(`  → ${Math.min(i + BATCH_SIZE, systems.length)} / ${systems.length}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 1: Import groups
// ---------------------------------------------------------------------------

async function importGroups(): Promise<Map<number, InvGroup>> {
  console.log("\n1. Importing groups (invGroups.csv)...");

  // invGroups.csv: groupID, categoryID, groupName, iconID, ...
  const allGroups = await fetchCSV<InvGroup>(
    `${FUZZWORK_BASE}/invGroups.csv`,
    (row) => {
      if (row.length < 3) return null;
      const groupID = parseInt(row[0]);
      const categoryID = parseInt(row[1]);
      if (isNaN(groupID) || isNaN(categoryID)) return null;
      return { groupID, categoryID, groupName: row[2] };
    }
  );

  // Keep groups relevant to our features: ores + minerals
  const relevantGroups = allGroups.filter(
    (g) => g.categoryID === ASTEROID_CATEGORY_ID || g.categoryID === MATERIAL_CATEGORY_ID
  );

  console.log(`  Upserting ${relevantGroups.length} relevant groups...`);

  for (const group of relevantGroups) {
    await prisma.eveGroup.upsert({
      where: { id: group.groupID },
      create: { id: group.groupID, name: group.groupName, categoryId: group.categoryID },
      update: { name: group.groupName, categoryId: group.categoryID },
    });
  }

  // Return all groups (not just relevant ones) for later filtering
  return new Map(allGroups.map((g) => [g.groupID, g]));
}

// ---------------------------------------------------------------------------
// Step 2: Import EveTypes (ores + minerals)
// ---------------------------------------------------------------------------

async function importEveTypes(groupMap: Map<number, InvGroup>): Promise<InvType[]> {
  console.log("\n2. Importing types (invTypes.csv)...");

  // invTypes.csv columns:
  //   0:typeID  1:groupID  2:typeName  3:description  4:mass
  //   5:volume  6:capacity  7:portionSize  8:raceID  9:basePrice
  //   10:published  11:marketGroupID  12:iconID
  const allTypes = await fetchCSV<InvType>(
    `${FUZZWORK_BASE}/invTypes.csv`,
    (row) => {
      if (row.length < 8) return null;
      const typeID = parseInt(row[0]);
      const groupID = parseInt(row[1]);
      if (isNaN(typeID) || isNaN(groupID)) return null;
      return {
        typeID,
        groupID,
        typeName: row[2],
        volume: parseFloat(row[5]) || 0,
        portionSize: parseInt(row[7]) || 1,
        iconID: row[12] ? parseInt(row[12]) || null : null,
      };
    }
  );

  // Filter to ores (category 25) and minerals (category 4)
  const relevantTypes = allTypes.filter((t) => {
    const group = groupMap.get(t.groupID);
    return (
      group &&
      (group.categoryID === ASTEROID_CATEGORY_ID || group.categoryID === MATERIAL_CATEGORY_ID)
    );
  });

  console.log(`  Upserting ${relevantTypes.length} types (ores + minerals)...`);

  const BATCH_SIZE = 500;
  for (let i = 0; i < relevantTypes.length; i += BATCH_SIZE) {
    const batch = relevantTypes.slice(i, i + BATCH_SIZE);
    for (const t of batch) {
      const group = groupMap.get(t.groupID)!;
      await prisma.eveType.upsert({
        where: { id: t.typeID },
        create: {
          id: t.typeID,
          name: t.typeName,
          groupId: t.groupID,
          categoryId: group.categoryID,
          volume: t.volume,
          portionSize: t.portionSize,
          iconId: t.iconID,
        },
        update: {
          name: t.typeName,
          groupId: t.groupID,
          categoryId: group.categoryID,
          volume: t.volume,
          portionSize: t.portionSize,
          iconId: t.iconID,
        },
      });
    }
    console.log(
      `  → ${Math.min(i + BATCH_SIZE, relevantTypes.length)} / ${relevantTypes.length}`
    );
  }

  return allTypes;
}

// ---------------------------------------------------------------------------
// Step 3: Import reprocess materials
// ---------------------------------------------------------------------------

async function importReprocessMaterials(
  allTypes: InvType[],
  groupMap: Map<number, InvGroup>
): Promise<void> {
  console.log("\n3. Importing reprocess materials (invTypeMaterials.csv)...");

  // Build set of reprocessable typeIds (category 25 = ores)
  const reprocessableTypeIds = new Set<number>();
  for (const t of allTypes) {
    const group = groupMap.get(t.groupID);
    if (group?.categoryID === ASTEROID_CATEGORY_ID) {
      reprocessableTypeIds.add(t.typeID);
    }
  }
  console.log(`  Found ${reprocessableTypeIds.size} reprocessable ore types`);

  // invTypeMaterials.csv columns: typeID, materialTypeID, quantity
  const allMaterials = await fetchCSV<InvTypeMaterial>(
    `${FUZZWORK_BASE}/invTypeMaterials.csv`,
    (row) => {
      if (row.length < 3) return null;
      const typeID = parseInt(row[0]);
      const materialTypeID = parseInt(row[1]);
      const quantity = parseInt(row[2]);
      if (isNaN(typeID) || isNaN(materialTypeID) || isNaN(quantity)) return null;
      return { typeID, materialTypeID, quantity };
    }
  );

  // Keep only: ore → standard mineral mappings
  const relevantMaterials = allMaterials.filter(
    (m) => reprocessableTypeIds.has(m.typeID) && MINERAL_TYPE_IDS.has(m.materialTypeID)
  );

  console.log(`  Importing ${relevantMaterials.length} ore→mineral mappings...`);

  await prisma.reprocessMaterial.deleteMany({});

  const BATCH_SIZE = 500;
  for (let i = 0; i < relevantMaterials.length; i += BATCH_SIZE) {
    const batch = relevantMaterials.slice(i, i + BATCH_SIZE);
    await prisma.reprocessMaterial.createMany({
      data: batch.map((m) => ({
        typeId: m.typeID,
        materialTypeId: m.materialTypeID,
        quantity: m.quantity,
      })),
      skipDuplicates: true,
    });
    console.log(
      `  → ${Math.min(i + BATCH_SIZE, relevantMaterials.length)} / ${relevantMaterials.length}`
    );
  }
}

// ---------------------------------------------------------------------------
// Step 4: Import compression mappings
// ---------------------------------------------------------------------------

async function importCompressionMappings(
  allTypes: InvType[],
  groupMap: Map<number, InvGroup>
): Promise<void> {
  console.log("\n4. Importing compression mappings...");

  // Filter to ore types only (category 25)
  const oreTypes = allTypes.filter((t) => {
    const group = groupMap.get(t.groupID);
    return group?.categoryID === ASTEROID_CATEGORY_ID;
  });

  // Split into regular ores and "Compressed X" variants
  const regularOres = oreTypes.filter((t) => !t.typeName.startsWith("Compressed "));
  const compressedOres = oreTypes.filter((t) => t.typeName.startsWith("Compressed "));

  // Index compressed ores by base name ("Compressed Veldspar" → key "Veldspar")
  const compressedByBaseName = new Map<string, InvType>();
  for (const c of compressedOres) {
    const baseName = c.typeName.replace(/^Compressed /, "");
    compressedByBaseName.set(baseName, c);
  }

  const mappings: Array<{
    oreTypeId: number;
    compressedTypeId: number;
    oreName: string;
    compressedName: string;
    ratio: number;
    groupId: number;
  }> = [];

  for (const ore of regularOres) {
    const compressed = compressedByBaseName.get(ore.typeName);
    if (!compressed) continue;

    // Ratio: how many raw ore units → 1 compressed unit
    // Derive from volumes: compressed holds ratio × ore.volume in compressed.volume
    // If volumes are available and sensible, compute; otherwise default to 100.
    let ratio = 100;
    if (ore.volume > 0 && compressed.volume > 0 && compressed.volume > ore.volume) {
      ratio = Math.round(compressed.volume / ore.volume);
    }

    mappings.push({
      oreTypeId: ore.typeID,
      compressedTypeId: compressed.typeID,
      oreName: ore.typeName,
      compressedName: compressed.typeName,
      ratio,
      groupId: ore.groupID,
    });
  }

  console.log(`  Found ${mappings.length} ore → compressed ore pairs`);

  await prisma.compressionMapping.deleteMany({});

  if (mappings.length > 0) {
    await prisma.compressionMapping.createMany({
      data: mappings,
      skipDuplicates: true,
    });
  }

  console.log(`  Imported ${mappings.length} compression mappings`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== SDE Import Script ===");

  try {
    await importSolarSystems();
    const groupMap = await importGroups();
    const allTypes = await importEveTypes(groupMap);
    await importReprocessMaterials(allTypes, groupMap);
    await importCompressionMappings(allTypes, groupMap);

    const [solarSystems, groups, types, reprocess, compress] = await prisma.$transaction([
      prisma.solarSystem.count(),
      prisma.eveGroup.count(),
      prisma.eveType.count(),
      prisma.reprocessMaterial.count(),
      prisma.compressionMapping.count(),
    ]);

    console.log("\n=== Import complete ===");
    console.log(`  SolarSystem:         ${solarSystems}`);
    console.log(`  EveGroup:            ${groups}`);
    console.log(`  EveType:             ${types}`);
    console.log(`  ReprocessMaterial:   ${reprocess}`);
    console.log(`  CompressionMapping:  ${compress}`);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
