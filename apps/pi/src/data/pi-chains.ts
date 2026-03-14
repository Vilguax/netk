// EVE Online Planetary Interaction — Production Chains
// Sources: EVE Fandom Wiki / in-game data
// TODO: verify exact quantities and recipes when testing in-game

export type PlanetType =
  | "barren"
  | "gas"
  | "ice"
  | "lava"
  | "oceanic"
  | "plasma"
  | "storm"
  | "temperate";

export type PITier = "P0" | "P1" | "P2" | "P3" | "P4";

export interface PIProduct {
  id: string;
  name: string;
  tier: PITier;
  // P0 only
  planetTypes?: PlanetType[];
  // P1+ only
  inputs?: { productId: string; quantity: number }[];
  // Output quantity per cycle (per Advanced/High-Tech facility)
  outputQty?: number;
  // Volume m3
  volume?: number;
}

// ─── P0 – Raw Resources ────────────────────────────────────────────────────

export const P0_RESOURCES: PIProduct[] = [
  { id: "aqueous_liquids",    name: "Aqueous Liquids",    tier: "P0", planetTypes: ["barren", "gas", "ice", "oceanic", "storm", "temperate"] },
  { id: "base_metals",        name: "Base Metals",        tier: "P0", planetTypes: ["barren", "gas", "lava", "plasma", "storm"] },
  { id: "carbon_compounds",   name: "Carbon Compounds",   tier: "P0", planetTypes: ["barren", "gas", "oceanic", "temperate"] },
  { id: "complex_organisms",  name: "Complex Organisms",  tier: "P0", planetTypes: ["oceanic", "temperate"] },
  { id: "felsic_magma",       name: "Felsic Magma",       tier: "P0", planetTypes: ["barren", "lava"] },
  { id: "heavy_metals",       name: "Heavy Metals",       tier: "P0", planetTypes: ["barren", "gas", "ice", "lava", "plasma", "storm"] },
  { id: "ionic_solutions",    name: "Ionic Solutions",    tier: "P0", planetTypes: ["barren", "gas", "ice", "storm"] },
  { id: "micro_organisms",    name: "Micro Organisms",    tier: "P0", planetTypes: ["barren", "gas", "ice", "oceanic", "temperate"] },
  { id: "noble_gas",          name: "Noble Gas",          tier: "P0", planetTypes: ["gas", "ice", "storm"] },
  { id: "noble_metals",       name: "Noble Metals",       tier: "P0", planetTypes: ["barren", "plasma"] },
  { id: "non_cs_crystals",    name: "Non-CS Crystals",    tier: "P0", planetTypes: ["barren", "lava", "plasma"] },
  { id: "planktic_colonies",  name: "Planktic Colonies",  tier: "P0", planetTypes: ["gas", "ice", "oceanic", "temperate"] },
  { id: "reactive_gas",       name: "Reactive Gas",       tier: "P0", planetTypes: ["gas", "storm"] },
  { id: "suspended_plasma",   name: "Suspended Plasma",   tier: "P0", planetTypes: ["barren", "gas", "lava", "plasma", "storm"] },
];

// ─── P1 – Basic Commodities ────────────────────────────────────────────────
// 3000 P0 → 20 P1 per Basic Industry Facility cycle

export const P1_PRODUCTS: PIProduct[] = [
  { id: "water",             name: "Water",             tier: "P1", inputs: [{ productId: "aqueous_liquids",   quantity: 3000 }], outputQty: 20 },
  { id: "reactive_metals",   name: "Reactive Metals",   tier: "P1", inputs: [{ productId: "base_metals",       quantity: 3000 }], outputQty: 20 },
  { id: "biofuels",          name: "Biofuels",          tier: "P1", inputs: [{ productId: "carbon_compounds",  quantity: 3000 }], outputQty: 20 },
  { id: "proteins",          name: "Proteins",          tier: "P1", inputs: [{ productId: "complex_organisms", quantity: 3000 }], outputQty: 20 },
  { id: "silicon",           name: "Silicon",           tier: "P1", inputs: [{ productId: "felsic_magma",      quantity: 3000 }], outputQty: 20 },
  { id: "toxic_metals",      name: "Toxic Metals",      tier: "P1", inputs: [{ productId: "heavy_metals",      quantity: 3000 }], outputQty: 20 },
  { id: "electrolytes",      name: "Electrolytes",      tier: "P1", inputs: [{ productId: "ionic_solutions",   quantity: 3000 }], outputQty: 20 },
  { id: "bacteria",          name: "Bacteria",          tier: "P1", inputs: [{ productId: "micro_organisms",   quantity: 3000 }], outputQty: 20 },
  { id: "oxygen",            name: "Oxygen",            tier: "P1", inputs: [{ productId: "noble_gas",         quantity: 3000 }], outputQty: 20 },
  { id: "precious_metals",   name: "Precious Metals",   tier: "P1", inputs: [{ productId: "noble_metals",      quantity: 3000 }], outputQty: 20 },
  { id: "chiral_structures", name: "Chiral Structures", tier: "P1", inputs: [{ productId: "non_cs_crystals",   quantity: 3000 }], outputQty: 20 },
  { id: "biomass",           name: "Biomass",           tier: "P1", inputs: [{ productId: "planktic_colonies", quantity: 3000 }], outputQty: 20 },
  { id: "oxidizing_compound",name: "Oxidizing Compound",tier: "P1", inputs: [{ productId: "reactive_gas",      quantity: 3000 }], outputQty: 20 },
  { id: "plasmoids",         name: "Plasmoids",         tier: "P1", inputs: [{ productId: "suspended_plasma",  quantity: 3000 }], outputQty: 20 },
];

// ─── P2 – Refined Commodities ──────────────────────────────────────────────
// 40 P1 + 40 P1 → 5 P2 per Advanced Industry Facility cycle
// TODO: verify all recipes in-game

export const P2_PRODUCTS: PIProduct[] = [
  { id: "biocells",              name: "Biocells",              tier: "P2", inputs: [{ productId: "biofuels", quantity: 40 }, { productId: "precious_metals", quantity: 40 }], outputQty: 5 },
  { id: "construction_blocks",   name: "Construction Blocks",   tier: "P2", inputs: [{ productId: "reactive_metals", quantity: 40 }, { productId: "toxic_metals", quantity: 40 }], outputQty: 5 },
  { id: "consumer_electronics",  name: "Consumer Electronics",  tier: "P2", inputs: [{ productId: "toxic_metals", quantity: 40 }, { productId: "chiral_structures", quantity: 40 }], outputQty: 5 },
  { id: "coolant",               name: "Coolant",               tier: "P2", inputs: [{ productId: "water", quantity: 40 }, { productId: "electrolytes", quantity: 40 }], outputQty: 5 },
  { id: "enriched_uranium",      name: "Enriched Uranium",      tier: "P2", inputs: [{ productId: "precious_metals", quantity: 40 }, { productId: "toxic_metals", quantity: 40 }], outputQty: 5 },
  { id: "fertilizer",            name: "Fertilizer",            tier: "P2", inputs: [{ productId: "bacteria", quantity: 40 }, { productId: "proteins", quantity: 40 }], outputQty: 5 },
  { id: "gen_enhanced_livestock",name: "Genetically Enhanced Livestock", tier: "P2", inputs: [{ productId: "proteins", quantity: 40 }, { productId: "biomass", quantity: 40 }], outputQty: 5 },
  { id: "livestock",             name: "Livestock",             tier: "P2", inputs: [{ productId: "biofuels", quantity: 40 }, { productId: "proteins", quantity: 40 }], outputQty: 5 },
  { id: "mechanical_parts",      name: "Mechanical Parts",      tier: "P2", inputs: [{ productId: "reactive_metals", quantity: 40 }, { productId: "precious_metals", quantity: 40 }], outputQty: 5 },
  { id: "microfiber_shielding",  name: "Microfiber Shielding",  tier: "P2", inputs: [{ productId: "silicon", quantity: 40 }, { productId: "biomass", quantity: 40 }], outputQty: 5 },
  { id: "nanites",               name: "Nanites",               tier: "P2", inputs: [{ productId: "bacteria", quantity: 40 }, { productId: "reactive_metals", quantity: 40 }], outputQty: 5 },
  { id: "oxides",                name: "Oxides",                tier: "P2", inputs: [{ productId: "oxygen", quantity: 40 }, { productId: "oxidizing_compound", quantity: 40 }], outputQty: 5 },
  { id: "polyaramids",           name: "Polyaramids",           tier: "P2", inputs: [{ productId: "oxidizing_compound", quantity: 40 }, { productId: "biomass", quantity: 40 }], outputQty: 5 },
  { id: "polytextiles",          name: "Polytextiles",          tier: "P2", inputs: [{ productId: "biofuels", quantity: 40 }, { productId: "silicon", quantity: 40 }], outputQty: 5 },
  { id: "rocket_fuel",           name: "Rocket Fuel",           tier: "P2", inputs: [{ productId: "plasmoids", quantity: 40 }, { productId: "electrolytes", quantity: 40 }], outputQty: 5 },
  { id: "silicate_glass",        name: "Silicate Glass",        tier: "P2", inputs: [{ productId: "silicon", quantity: 40 }, { productId: "oxidizing_compound", quantity: 40 }], outputQty: 5 },
  { id: "superconductors",       name: "Superconductors",       tier: "P2", inputs: [{ productId: "plasmoids", quantity: 40 }, { productId: "water", quantity: 40 }], outputQty: 5 },
  { id: "supertensile_plastics", name: "Supertensile Plastics", tier: "P2", inputs: [{ productId: "oxygen", quantity: 40 }, { productId: "biomass", quantity: 40 }], outputQty: 5 },
  { id: "synthetic_oil",         name: "Synthetic Oil",         tier: "P2", inputs: [{ productId: "electrolytes", quantity: 40 }, { productId: "oxygen", quantity: 40 }], outputQty: 5 },
  { id: "test_cultures",         name: "Test Cultures",         tier: "P2", inputs: [{ productId: "bacteria", quantity: 40 }, { productId: "biomass", quantity: 40 }], outputQty: 5 },
  { id: "transmitter",           name: "Transmitter",           tier: "P2", inputs: [{ productId: "chiral_structures", quantity: 40 }, { productId: "plasmoids", quantity: 40 }], outputQty: 5 },
  { id: "viral_agent",           name: "Viral Agent",           tier: "P2", inputs: [{ productId: "bacteria", quantity: 40 }, { productId: "biomass", quantity: 40 }], outputQty: 5 },
  { id: "water_cooled_cpu",      name: "Water-Cooled CPU",      tier: "P2", inputs: [{ productId: "water", quantity: 40 }, { productId: "reactive_metals", quantity: 40 }], outputQty: 5 },
];

// ─── P3 – Specialized Commodities ─────────────────────────────────────────
// 10 P2 + 10 P2 → 3 P3 per High-Tech Production Plant
// TODO: verify all recipes in-game

export const P3_PRODUCTS: PIProduct[] = [
  { id: "biotech_research_reports", name: "Biotech Research Reports",     tier: "P3", inputs: [{ productId: "nanites", quantity: 10 }, { productId: "livestock", quantity: 10 }], outputQty: 3 },
  { id: "camera_drones",            name: "Camera Drones",                tier: "P3", inputs: [{ productId: "silicate_glass", quantity: 10 }, { productId: "rocket_fuel", quantity: 10 }], outputQty: 3 },
  { id: "condensates",              name: "Condensates",                  tier: "P3", inputs: [{ productId: "oxides", quantity: 10 }, { productId: "coolant", quantity: 10 }], outputQty: 3 },
  { id: "cryoprotectant_solution",  name: "Cryoprotectant Solution",      tier: "P3", inputs: [{ productId: "test_cultures", quantity: 10 }, { productId: "synthetic_oil", quantity: 10 }], outputQty: 3 },
  { id: "data_chips",               name: "Data Chips",                   tier: "P3", inputs: [{ productId: "microfiber_shielding", quantity: 10 }, { productId: "superconductors", quantity: 10 }], outputQty: 3 },
  { id: "gel_matrix_biopaste",      name: "Gel-Matrix Biopaste",          tier: "P3", inputs: [{ productId: "oxides", quantity: 10 }, { productId: "biocells", quantity: 10 }], outputQty: 3 },
  { id: "guidance_systems",         name: "Guidance Systems",             tier: "P3", inputs: [{ productId: "water_cooled_cpu", quantity: 10 }, { productId: "transmitter", quantity: 10 }], outputQty: 3 },
  { id: "hazmat_detection_systems", name: "Hazmat Detection Systems",     tier: "P3", inputs: [{ productId: "polytextiles", quantity: 10 }, { productId: "viral_agent", quantity: 10 }], outputQty: 3 },
  { id: "hermetic_membranes",       name: "Hermetic Membranes",           tier: "P3", inputs: [{ productId: "gen_enhanced_livestock", quantity: 10 }, { productId: "polyaramids", quantity: 10 }], outputQty: 3 },
  { id: "high_tech_transmitters",   name: "High-Tech Transmitters",       tier: "P3", inputs: [{ productId: "transmitter", quantity: 10 }, { productId: "supertensile_plastics", quantity: 10 }], outputQty: 3 },
  { id: "industrial_explosives",    name: "Industrial Explosives",        tier: "P3", inputs: [{ productId: "fertilizer", quantity: 10 }, { productId: "polytextiles", quantity: 10 }], outputQty: 3 },
  { id: "integrity_response_drones",name: "Integrity Response Drones",    tier: "P3", inputs: [{ productId: "gen_enhanced_livestock", quantity: 10 }, { productId: "mechanical_parts", quantity: 10 }], outputQty: 3 },
  { id: "miniature_electronics",    name: "Miniature Electronics",        tier: "P3", inputs: [{ productId: "silicate_glass", quantity: 10 }, { productId: "consumer_electronics", quantity: 10 }], outputQty: 3 },
  { id: "nanite_compound",          name: "Nanite Compound",              tier: "P3", inputs: [{ productId: "nanites", quantity: 10 }, { productId: "supertensile_plastics", quantity: 10 }], outputQty: 3 },
  { id: "neocoms",                  name: "Neocoms",                      tier: "P3", inputs: [{ productId: "biocells", quantity: 10 }, { productId: "silicate_glass", quantity: 10 }], outputQty: 3 },
  { id: "nuclear_reactors",         name: "Nuclear Reactors",             tier: "P3", inputs: [{ productId: "enriched_uranium", quantity: 10 }, { productId: "microfiber_shielding", quantity: 10 }], outputQty: 3 },
  { id: "planetary_vehicles",       name: "Planetary Vehicles",           tier: "P3", inputs: [{ productId: "mechanical_parts", quantity: 10 }, { productId: "construction_blocks", quantity: 10 }], outputQty: 3 },
  { id: "robotics",                 name: "Robotics",                     tier: "P3", inputs: [{ productId: "consumer_electronics", quantity: 10 }, { productId: "mechanical_parts", quantity: 10 }], outputQty: 3 },
  { id: "smartfab_units",           name: "Smartfab Units",               tier: "P3", inputs: [{ productId: "construction_blocks", quantity: 10 }, { productId: "nanites", quantity: 10 }], outputQty: 3 },
  { id: "supercomputers",           name: "Supercomputers",               tier: "P3", inputs: [{ productId: "water_cooled_cpu", quantity: 10 }, { productId: "coolant", quantity: 10 }], outputQty: 3 },
  { id: "synthetic_synapses",       name: "Synthetic Synapses",           tier: "P3", inputs: [{ productId: "supertensile_plastics", quantity: 10 }, { productId: "test_cultures", quantity: 10 }], outputQty: 3 },
  { id: "transcranial_microcontrollers", name: "Transcranial Microcontrollers", tier: "P3", inputs: [{ productId: "biocells", quantity: 10 }, { productId: "nanites", quantity: 10 }], outputQty: 3 },
  { id: "ukomi_superconductors",    name: "Ukomi Superconductors",        tier: "P3", inputs: [{ productId: "superconductors", quantity: 10 }, { productId: "synthetic_oil", quantity: 10 }], outputQty: 3 },
  { id: "vaccines",                 name: "Vaccines",                     tier: "P3", inputs: [{ productId: "livestock", quantity: 10 }, { productId: "viral_agent", quantity: 10 }], outputQty: 3 },
];

// ─── P4 – Advanced Commodities ─────────────────────────────────────────────
// 6 P3 + 6 P3 → 1 P4 per High-Tech Production Plant
// TODO: verify all recipes in-game

export const P4_PRODUCTS: PIProduct[] = [
  { id: "broadcast_node",     name: "Broadcast Node",     tier: "P4", inputs: [{ productId: "integrity_response_drones", quantity: 6 }, { productId: "nano_factory", quantity: 6 }, { productId: "recursive_computing_module", quantity: 6 }], outputQty: 1 },
  { id: "integrity_response_drones_p4", name: "Integrity Response Drones (P4)", tier: "P4", inputs: [] }, // placeholder
  { id: "nano_factory",       name: "Nano-Factory",        tier: "P4", inputs: [{ productId: "industrial_explosives", quantity: 6 }, { productId: "ukomi_superconductors", quantity: 6 }, { productId: "reactive_gas", quantity: 6 }], outputQty: 1 },
  { id: "organic_mortar_applicators", name: "Organic Mortar Applicators", tier: "P4", inputs: [{ productId: "condensates", quantity: 6 }, { productId: "robotics", quantity: 6 }, { productId: "smartfab_units", quantity: 6 }], outputQty: 1 },
  { id: "recursive_computing_module", name: "Recursive Computing Module", tier: "P4", inputs: [{ productId: "synthetic_synapses", quantity: 6 }, { productId: "transcranial_microcontrollers", quantity: 6 }, { productId: "guidance_systems", quantity: 6 }], outputQty: 1 },
  { id: "self_harmonizing_power_core", name: "Self-Harmonizing Power Core", tier: "P4", inputs: [{ productId: "camera_drones", quantity: 6 }, { productId: "nuclear_reactors", quantity: 6 }, { productId: "hermetic_membranes", quantity: 6 }], outputQty: 1 },
  { id: "sterile_conduits",   name: "Sterile Conduits",   tier: "P4", inputs: [{ productId: "smartfab_units", quantity: 6 }, { productId: "vaccines", quantity: 6 }, { productId: "viral_agent", quantity: 6 }], outputQty: 1 },
  { id: "wetware_mainframe",  name: "Wetware Mainframe",  tier: "P4", inputs: [{ productId: "supercomputers", quantity: 6 }, { productId: "biotech_research_reports", quantity: 6 }, { productId: "cryoprotectant_solution", quantity: 6 }], outputQty: 1 },
];

// ─── Flat map for lookups ───────────────────────────────────────────────────

export const ALL_PRODUCTS: Record<string, PIProduct> = [
  ...P0_RESOURCES,
  ...P1_PRODUCTS,
  ...P2_PRODUCTS,
  ...P3_PRODUCTS,
  ...P4_PRODUCTS,
].reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

// ─── Planet type labels & colors ───────────────────────────────────────────

export const PLANET_TYPE_LABELS: Record<PlanetType, string> = {
  barren:    "Barren",
  gas:       "Gas",
  ice:       "Ice",
  lava:      "Lava",
  oceanic:   "Oceanic",
  plasma:    "Plasma",
  storm:     "Storm",
  temperate: "Temperate",
};

export const PLANET_TYPE_COLORS: Record<PlanetType, string> = {
  barren:    "#a8845a",
  gas:       "#7ba3c8",
  ice:       "#9ecfea",
  lava:      "#e05c2a",
  oceanic:   "#2a82c8",
  plasma:    "#c87bd4",
  storm:     "#6b7fa8",
  temperate: "#4caf6e",
};

// ─── Tier display config ────────────────────────────────────────────────────

export const TIER_CONFIG = {
  P0: { label: "P0 — Ressources brutes",     color: "#64748b" },
  P1: { label: "P1 — Commodités de base",    color: "#3b82f6" },
  P2: { label: "P2 — Raffinés",              color: "#10b981" },
  P3: { label: "P3 — Spécialisés",           color: "#f59e0b" },
  P4: { label: "P4 — Avancés",               color: "#a3e635" },
};

// ─── Helper: get full chain for a product ──────────────────────────────────

export interface ChainNode {
  product: PIProduct;
  quantity: number;
  children: ChainNode[];
}

export function buildChain(productId: string, quantity: number = 1): ChainNode {
  const product = ALL_PRODUCTS[productId];
  if (!product) throw new Error(`Unknown product: ${productId}`);

  const children: ChainNode[] =
    product.inputs?.map((input) =>
      buildChain(input.productId, input.quantity * quantity)
    ) ?? [];

  return { product, quantity, children };
}

// Required planet types to produce a product (deduplicated)
export function getRequiredPlanetTypes(productId: string): Set<PlanetType> {
  const chain = buildChain(productId);
  const types = new Set<PlanetType>();

  function walk(node: ChainNode) {
    if (node.product.tier === "P0" && node.product.planetTypes) {
      node.product.planetTypes.forEach((t) => types.add(t));
    }
    node.children.forEach(walk);
  }

  walk(chain);
  return types;
}
