// Static EVE Online type ID mappings for Planetary Interaction
// Source: EVE SDE (planetSchematics + invTypes)

// ─── P0 raw resource type IDs ────────────────────────────────────────────────

export const P0_TYPE_IDS: Record<number, { name: string; planetTypes: string[] }> = {
  2267: { name: "Aqueous Liquids",    planetTypes: ["barren", "gas", "ice", "oceanic", "storm", "temperate"] },
  2268: { name: "Base Metals",        planetTypes: ["barren", "gas", "lava", "plasma", "storm"] },
  2272: { name: "Carbon Compounds",   planetTypes: ["barren", "gas", "oceanic", "temperate"] },
  2287: { name: "Complex Organisms",  planetTypes: ["oceanic", "temperate"] },
  2305: { name: "Felsic Magma",       planetTypes: ["barren", "lava"] },
  2306: { name: "Heavy Metals",       planetTypes: ["barren", "gas", "ice", "lava", "plasma", "storm"] },
  2307: { name: "Ionic Solutions",    planetTypes: ["barren", "gas", "ice", "storm"] },
  2310: { name: "Micro Organisms",    planetTypes: ["barren", "gas", "ice", "oceanic", "temperate"] },
  2311: { name: "Noble Gas",          planetTypes: ["gas", "ice", "storm"] },
  2312: { name: "Noble Metals",       planetTypes: ["barren", "plasma"] },
  2313: { name: "Non-CS Crystals",    planetTypes: ["barren", "lava", "plasma"] },
  2317: { name: "Planktic Colonies",  planetTypes: ["gas", "ice", "oceanic", "temperate"] },
  2319: { name: "Reactive Gas",       planetTypes: ["gas", "storm"] },
  2321: { name: "Suspended Plasma",   planetTypes: ["barren", "gas", "lava", "plasma", "storm"] },
};

// ─── PI Schematic IDs → output product name ──────────────────────────────────
// Source: EVE SDE planetSchematics table

export const SCHEMATIC_NAMES: Record<number, { name: string; tier: "P1" | "P2" | "P3" | "P4" }> = {
  // P0 → P1 (Basic Industry Facility, 30 min cycle, 3000 P0 → 20 P1)
  1:  { name: "Water",                          tier: "P1" },
  2:  { name: "Reactive Metals",                tier: "P1" },
  3:  { name: "Proteins",                       tier: "P1" },
  4:  { name: "Biofuels",                       tier: "P1" },
  5:  { name: "Silicon",                        tier: "P1" },
  6:  { name: "Toxic Metals",                   tier: "P1" },
  7:  { name: "Electrolytes",                   tier: "P1" },
  8:  { name: "Oxygen",                         tier: "P1" },
  9:  { name: "Precious Metals",                tier: "P1" },
  10: { name: "Chiral Structures",              tier: "P1" },
  11: { name: "Bacteria",                       tier: "P1" },
  12: { name: "Biomass",                        tier: "P1" },
  13: { name: "Oxidizing Compound",             tier: "P1" },
  14: { name: "Plasmoids",                      tier: "P1" },
  // P1 → P2 (Advanced Industry Facility, 60 min cycle, 40+40 P1 → 5 P2)
  15: { name: "Biocells",                       tier: "P2" },
  16: { name: "Construction Blocks",            tier: "P2" },
  17: { name: "Consumer Electronics",           tier: "P2" },
  18: { name: "Coolant",                        tier: "P2" },
  19: { name: "Enriched Uranium",               tier: "P2" },
  20: { name: "Fertilizer",                     tier: "P2" },
  21: { name: "Genetically Enhanced Livestock", tier: "P2" },
  22: { name: "Livestock",                      tier: "P2" },
  23: { name: "Mechanical Parts",               tier: "P2" },
  24: { name: "Microfiber Shielding",           tier: "P2" },
  25: { name: "Nanites",                        tier: "P2" },
  26: { name: "Oxides",                         tier: "P2" },
  27: { name: "Polyaramids",                    tier: "P2" },
  28: { name: "Polytextiles",                   tier: "P2" },
  29: { name: "Rocket Fuel",                    tier: "P2" },
  30: { name: "Silicate Glass",                 tier: "P2" },
  31: { name: "Superconductors",                tier: "P2" },
  32: { name: "Supertensile Plastics",          tier: "P2" },
  33: { name: "Synthetic Oil",                  tier: "P2" },
  34: { name: "Test Cultures",                  tier: "P2" },
  35: { name: "Transmitter",                    tier: "P2" },
  36: { name: "Viral Agent",                    tier: "P2" },
  37: { name: "Water-Cooled CPU",               tier: "P2" },
  // P2 → P3 (Advanced Industry Facility, 60 min cycle, 40+40 P2 → 3 P3)
  38: { name: "Biotech Research Reports",       tier: "P3" },
  39: { name: "Camera Drones",                  tier: "P3" },
  40: { name: "Condensates",                    tier: "P3" },
  41: { name: "Cryoprotectant Solution",        tier: "P3" },
  42: { name: "Data Chips",                     tier: "P3" },
  43: { name: "Gel-Matrix Biopaste",            tier: "P3" },
  44: { name: "Guidance Systems",               tier: "P3" },
  45: { name: "Hazmat Detection Systems",       tier: "P3" },
  46: { name: "Hermetic Membranes",             tier: "P3" },
  47: { name: "High-Tech Transmitters",         tier: "P3" },
  48: { name: "Industrial Explosives",          tier: "P3" },
  49: { name: "Integrity Response Drones",      tier: "P3" },
  50: { name: "Nano-Factory",                   tier: "P3" },
  51: { name: "Recursive Computing Module",     tier: "P3" },
  52: { name: "Smartfab Units",                 tier: "P3" },
  53: { name: "Nuclear Reactors",               tier: "P3" },
  54: { name: "Planetary Vehicles",             tier: "P3" },
  55: { name: "Robotics",                       tier: "P3" },
  56: { name: "Transcranial Microcontrollers",  tier: "P3" },
  57: { name: "Ukomi Super Conductors",         tier: "P3" },
  58: { name: "Vaccines",                       tier: "P3" },
  // P3 → P4 (High-Tech Production Plant, 60 min cycle, 6+6+6 P3 → 1 P4)
  59: { name: "Broadcast Node",                 tier: "P4" },
  60: { name: "Integrity Response Drones",      tier: "P4" },
  61: { name: "Nano-Factory",                   tier: "P4" },
  62: { name: "Organic Mortar Applicators",     tier: "P4" },
  63: { name: "Recursive Computing Module",     tier: "P4" },
  64: { name: "Self-Harmonizing Power Core",    tier: "P4" },
  65: { name: "Sterile Conduits",               tier: "P4" },
  66: { name: "Wetware Mainframe",              tier: "P4" },
};

// ─── Structure type IDs ───────────────────────────────────────────────────────

export const STRUCTURE_TYPE_IDS: Record<number, string> = {
  3060: "ECU",
  2480: "BIF",
  2470: "AIF",
  2472: "HTPP",
  2257: "Launchpad",
  2562: "Storage",
  // Command Centers (per planet type)
  2254: "CCU", // Barren
  2256: "CCU", // Gas
  2258: "CCU", // Ice
  2488: "CCU", // Lava
  2490: "CCU", // Oceanic
  2492: "CCU", // Plasma
  2494: "CCU", // Storm
  2496: "CCU", // Temperate
};

export type StructureRole = "ECU" | "BIF" | "AIF" | "HTPP" | "Launchpad" | "Storage" | "CCU" | "Unknown";

export function getStructureRole(typeId: number, hasExpiry: boolean, hasSchematic: boolean): StructureRole {
  if (hasExpiry)    return "ECU";
  if (hasSchematic) return "AIF"; // BIF/AIF/HTPP all have schematic_id — differentiate by type_id
  const known = STRUCTURE_TYPE_IDS[typeId];
  if (known) return known as StructureRole;
  return "Unknown";
}
