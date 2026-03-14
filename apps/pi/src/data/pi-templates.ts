// EVE Online PI Colony Templates
// Source: https://github.com/DalShooth/EVE_PI_Templates
// Maps internal product IDs → template filenames for in-game import

const BASE_URL = "/templates/";

// Factory templates — production setups (P2 / P3 / P4)
const FACTORY_TEMPLATES: Record<string, string> = {
  // P2 — Refined Commodities
  biocells:               "Factory - Biocells.json",
  construction_blocks:    "Factory - Construction Blocks.json",
  consumer_electronics:   "Factory - Consumer Electronics.json",
  coolant:                "Factory - Coolant.json",
  enriched_uranium:       "Factory - Enriched Uranium.json",
  fertilizer:             "Factory - Fertilizer.json",
  gen_enhanced_livestock: "Factory - Genetically Enhanced Livestock.json",
  livestock:              "Factory - Livestock.json",
  mechanical_parts:       "Factory - Mechanical Parts.json",
  microfiber_shielding:   "Factory - Microfiber Shielding.json",
  nanites:                "Factory - Nanites.json",
  oxides:                 "Factory - Oxides.json",
  polyaramids:            "Factory - Polyaramids.json",
  polytextiles:           "Factory - Polytextiles.json",
  rocket_fuel:            "Factory - Rocket Fuel.json",
  silicate_glass:         "Factory - Silicate Glass.json",
  superconductors:        "Factory - Superconductors.json",
  supertensile_plastics:  "Factory - Supertensile Plastics.json",
  synthetic_oil:          "Factory - Synthetic Oil.json",
  test_cultures:          "Factory - Test Cultures.json",
  transmitter:            "Factory - Transmitter.json",
  viral_agent:            "Factory - Viral Agent.json",
  water_cooled_cpu:       "Factory - Water-Cooled CPU.json",

  // P3 — Specialized Commodities
  biotech_research_reports:      "Factory - Biotech Research Reports.json",
  camera_drones:                 "Factory - Camera Drones.json",
  condensates:                   "Factory - Condensates.json",
  cryoprotectant_solution:       "Factory - Cryoprotectant Solution.json",
  data_chips:                    "Factory - Data Chips.json",
  gel_matrix_biopaste:           "Factory - Gel-Matrix Biopaste.json",
  guidance_systems:              "Factory - Guidance Systems.json",
  hazmat_detection_systems:      "Factory - Hazmat Detection Systems.json",
  hermetic_membranes:            "Factory - Hermetic Membranes.json",
  high_tech_transmitters:        "Factory - High-Tech Transmitters.json",
  industrial_explosives:         "Factory - Industrial Explosives.json",
  integrity_response_drones:     "Factory - Integrity Response Drones.json",
  miniature_electronics:         "Factory - Miniature Electronics.json",
  neocoms:                       "Factory - Neocoms.json",
  nuclear_reactors:              "Factory - Nuclear Reactors.json",
  planetary_vehicles:            "Factory - Planetary Vehicles.json",
  robotics:                      "Factory - Robotics.json",
  smartfab_units:                "Factory - Smartfab Units.json",
  supercomputers:                "Factory - Supercomputers.json",
  synthetic_synapses:            "Factory - Synthetic Synapses.json",
  transcranial_microcontrollers: "Factory - Transcranial Microcontrollers.json",
  ukomi_superconductors:         "Factory - Ukomi Superconductors.json",
  vaccines:                      "Factory - Vaccines.json",

  // P4 — Advanced Commodities
  broadcast_node:              "Factory - Broadcast Node.json",
  nano_factory:                "Factory - Nano-Factory.json",
  organic_mortar_applicators:  "Factory - Organic Mortar Applicators.json",
  recursive_computing_module:  "Factory - Recursive Computing Module.json",
  self_harmonizing_power_core: "Factory - Self-Harmonizing Power Core.json",
  sterile_conduits:            "Factory - Sterile Conduits.json",
  wetware_mainframe:           "Factory - Wetware Mainframe.json",
};

// Miner templates — extraction setups (P0 → P1)
// ns = nullsec layout, ls = lowsec layout (when available)
const MINER_TEMPLATES: Record<string, { ns: string; ls?: string }> = {
  water:              { ns: "Miner - 00 - Water.json",              ls: "Miner - LS - Water.json" },
  reactive_metals:    { ns: "Miner - 00 - Reactive Metals.json",    ls: "Miner - LS - Reactive Metals.json" },
  biofuels:           { ns: "Miner - 00 - Biofuels.json",           ls: "Miner - LS - Temperate - Biofuels.json" },
  proteins:           { ns: "Miner - 00 - Proteins.json",           ls: "Miner - LS - Proteins.json" },
  silicon:            { ns: "Miner - 00 - Silicon.json",            ls: "Miner - LS - Silicon.json" },
  toxic_metals:       { ns: "Miner - 00 - Toxic Metals.json",       ls: "Miner - LS - Toxic Metals.json" },
  electrolytes:       { ns: "Miner - 00 - Electrolytes.json",       ls: "Miner - LS - Storm - Electrolytes.json" },
  bacteria:           { ns: "Miner - 00 - Bacteria.json",           ls: "Miner - LS - Bacteria.json" },
  oxygen:             { ns: "Miner - 00 - Oxygen.json",             ls: "Miner - LS - Oxygen.json" },
  precious_metals:    { ns: "Miner - 00 - Precious Metals.json",    ls: "Miner - LS - Precious Metals.json" },
  // Note: typo "Stuctures" is in the NS filename, "Structures" in LS
  chiral_structures:  { ns: "Miner - 00 - Chiral Stuctures.json",   ls: "Miner - LS - Chiral Structures.json" },
  biomass:            { ns: "Miner - 00 - Biomass.json",            ls: "Miner - LS - Biomass.json" },
  oxidizing_compound: { ns: "Miner - 00 - Oxidizing Compound.json", ls: "Miner - LS - Oxidizing Compound.json" },
  plasmoids:          { ns: "Miner - 00 - Plasmoids.json",          ls: "Miner - LS - Plasmoids.json" },
};

export function hasFactoryTemplate(productId: string): boolean {
  return productId in FACTORY_TEMPLATES;
}

export function hasMinerTemplate(productId: string): boolean {
  return productId in MINER_TEMPLATES;
}

function buildUrl(filename: string): string {
  return BASE_URL + filename;
}

export async function copyFactoryTemplate(productId: string): Promise<void> {
  const filename = FACTORY_TEMPLATES[productId];
  if (!filename) throw new Error(`No factory template for: ${productId}`);

  const res = await fetch(buildUrl(filename));
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  await navigator.clipboard.writeText(await res.text());
}

export async function copyMinerTemplate(
  productId: string,
  lowSec = false,
): Promise<void> {
  const entry = MINER_TEMPLATES[productId];
  if (!entry) throw new Error(`No miner template for: ${productId}`);

  const filename = lowSec && entry.ls ? entry.ls : entry.ns;
  const res = await fetch(buildUrl(filename));
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  await navigator.clipboard.writeText(await res.text());
}
