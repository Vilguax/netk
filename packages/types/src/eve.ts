// EVE Online ESI Types

export interface Contract {
  contract_id: number;
  issuer_id: number;
  issuer_corporation_id: number;
  assignee_id: number;
  acceptor_id: number;
  type: "item_exchange" | "auction" | "courier" | "loan" | "unknown";
  status: string;
  title: string;
  for_corporation: boolean;
  availability: "public" | "personal" | "corporation" | "alliance";
  date_issued: string;
  date_expired: string;
  days_to_complete: number;
  end_location_id: number;
  start_location_id: number;
  price: number;
  reward: number;
  collateral: number;
  buyout: number;
  volume: number;
}

export interface ContractItem {
  record_id: number;
  type_id: number;
  quantity: number;
  is_included: boolean;
  is_singleton: boolean;
  is_blueprint_copy?: boolean;
}

export interface MarketOrder {
  order_id: number;
  type_id: number;
  location_id: number;
  system_id: number;
  volume_total: number;
  volume_remain: number;
  min_volume: number;
  price: number;
  is_buy_order: boolean;
  duration: number;
  issued: string;
  range: string;
}

export interface TypeInfo {
  type_id: number;
  name: string;
  description: string;
  volume: number;
  packaged_volume: number;
  group_id: number;
  market_group_id?: number;
  icon_id?: number;
}

export interface MarketHistory {
  date: string;
  lowest: number;
  highest: number;
  average: number;
  volume: number;
  order_count: number;
}

// Region & Hub Configuration

export type Faction = "caldari" | "amarr" | "minmatar" | "gallente";

export interface Region {
  id: number;
  name: string;
  slug: string;
  hub: string;
  hubStationId: number;
  faction: Faction;
  janiceMarketId: number; // Janice API market parameter
}

export const REGIONS: Record<string, Region> = {
  "the-forge": {
    id: 10000002,
    name: "The Forge",
    slug: "the-forge",
    hub: "Jita 4-4",
    hubStationId: 60003760,
    faction: "caldari",
    janiceMarketId: 2, // Jita
  },
  domain: {
    id: 10000043,
    name: "Domain",
    slug: "domain",
    hub: "Amarr",
    hubStationId: 60008494,
    faction: "amarr",
    janiceMarketId: 1, // Amarr
  },
  heimatar: {
    id: 10000030,
    name: "Heimatar",
    slug: "heimatar",
    hub: "Rens",
    hubStationId: 60004588,
    faction: "minmatar",
    janiceMarketId: 3, // Rens
  },
  "sinq-laison": {
    id: 10000032,
    name: "Sinq Laison",
    slug: "sinq-laison",
    hub: "Dodixie",
    hubStationId: 60011866,
    faction: "gallente",
    janiceMarketId: 4, // Dodixie
  },
};

// Flipper Module Types

export interface ItemBuyOrder {
  orderId: number;
  price: number;
  volumeRemain: number;
  locationId: number;
  locationName?: string;
  systemId?: number;
  systemName?: string;
  jumpsFromContract?: number;
}

export interface DetailedItem {
  typeId: number;
  name: string;
  quantity: number;
  volume: number;
  unitBuyPrice: number;
  totalValue: number;
  buyOrders: ItemBuyOrder[];
  isBlueprintCopy?: boolean;
}

export interface DetailedOpportunity {
  contractId: number;
  issuerId: number;
  issuerName?: string;
  locationId: number;
  locationName?: string;
  systemId?: number;
  systemName?: string;
  dateExpired: string;
  items: DetailedItem[];
  contractPrice: number;
  totalSellValue: number;
  grossMargin: number;
  salesTax: number;
  brokerFee: number;
  totalTaxes: number;
  netProfit: number;
  roi: number;
  totalVolume: number;
  hasBlueprintCopy?: boolean;
  jumpsToSell?: number;
}

export interface ScanResultItem {
  contractId: number;
  itemName: string;
  itemCount: number;
  contractPrice: number;
  sellPrice: number;
  netProfit: number;
  roi: number;
  jumpsToSell?: number;
  details: DetailedOpportunity;
}

export interface FlipOpportunity {
  contract: Contract;
  items: ContractItem[];
  itemsInfo: Map<number, TypeInfo>;
  totalBuyValue: number;
  contractPrice: number;
  grossMargin: number;
  taxes: number;
  netMargin: number;
  roi: number;
}

// Rock Radar Module Types

export interface SurveyRock {
  id: string; // unique id for React keys
  oreName: string;
  typeId: number;
  volume: number; // m³ in the rock
  distance: number; // meters from ship
  quantity: number; // estimated units (volume / ore volume per unit)
  iskValue?: number; // ISK value from scanner paste (5-column format)
}

export interface SurveyScan {
  id: string;
  timestamp: Date;
  rocks: SurveyRock[];
  totalVolume: number; // total m³ in belt
  totalValue?: number; // ISK value from Janice
}

export interface OrePrice {
  typeId: number;
  name: string;
  pricePerUnit: number;
  pricePerM3: number;
}

export interface MiningSession {
  startTime: Date;
  scans: SurveyScan[];
  miningRateM3PerSec?: number; // calculated from scan deltas
  estimatedCompletion?: Date;
}

// Ore database - volume per unit for each ore type
export const ORE_VOLUMES: Record<string, { typeId: number; volumePerUnit: number }> = {
  // Standard ores
  "Veldspar": { typeId: 1230, volumePerUnit: 0.1 },
  "Concentrated Veldspar": { typeId: 17470, volumePerUnit: 0.1 },
  "Dense Veldspar": { typeId: 17471, volumePerUnit: 0.1 },
  "Stable Veldspar": { typeId: 46689, volumePerUnit: 0.1 },

  "Scordite": { typeId: 1228, volumePerUnit: 0.15 },
  "Condensed Scordite": { typeId: 17463, volumePerUnit: 0.15 },
  "Massive Scordite": { typeId: 17464, volumePerUnit: 0.15 },
  "Glossy Scordite": { typeId: 46687, volumePerUnit: 0.15 },

  "Pyroxeres": { typeId: 1224, volumePerUnit: 0.3 },
  "Solid Pyroxeres": { typeId: 17459, volumePerUnit: 0.3 },
  "Viscous Pyroxeres": { typeId: 17460, volumePerUnit: 0.3 },
  "Opulent Pyroxeres": { typeId: 46686, volumePerUnit: 0.3 },

  "Plagioclase": { typeId: 18, volumePerUnit: 0.35 },
  "Azure Plagioclase": { typeId: 17455, volumePerUnit: 0.35 },
  "Rich Plagioclase": { typeId: 17456, volumePerUnit: 0.35 },
  "Sparkling Plagioclase": { typeId: 46685, volumePerUnit: 0.35 },

  "Omber": { typeId: 1227, volumePerUnit: 0.6 },
  "Silvery Omber": { typeId: 17867, volumePerUnit: 0.6 },
  "Golden Omber": { typeId: 17868, volumePerUnit: 0.6 },
  "Platinoid Omber": { typeId: 46684, volumePerUnit: 0.6 },

  "Kernite": { typeId: 20, volumePerUnit: 1.2 },
  "Luminous Kernite": { typeId: 17452, volumePerUnit: 1.2 },
  "Fiery Kernite": { typeId: 17453, volumePerUnit: 1.2 },
  "Resplendent Kernite": { typeId: 46683, volumePerUnit: 1.2 },

  "Jaspet": { typeId: 1226, volumePerUnit: 2 },
  "Pure Jaspet": { typeId: 17448, volumePerUnit: 2 },
  "Pristine Jaspet": { typeId: 17449, volumePerUnit: 2 },
  "Immaculate Jaspet": { typeId: 46682, volumePerUnit: 2 },

  "Hemorphite": { typeId: 1231, volumePerUnit: 3 },
  "Vivid Hemorphite": { typeId: 17444, volumePerUnit: 3 },
  "Radiant Hemorphite": { typeId: 17445, volumePerUnit: 3 },
  "Scintillating Hemorphite": { typeId: 46681, volumePerUnit: 3 },

  "Hedbergite": { typeId: 21, volumePerUnit: 3 },
  "Vitric Hedbergite": { typeId: 17440, volumePerUnit: 3 },
  "Glazed Hedbergite": { typeId: 17441, volumePerUnit: 3 },
  "Lustrous Hedbergite": { typeId: 46680, volumePerUnit: 3 },

  "Gneiss": { typeId: 1229, volumePerUnit: 5 },
  "Iridescent Gneiss": { typeId: 17865, volumePerUnit: 5 },
  "Prismatic Gneiss": { typeId: 17866, volumePerUnit: 5 },
  "Brilliant Gneiss": { typeId: 46679, volumePerUnit: 5 },

  "Dark Ochre": { typeId: 1232, volumePerUnit: 8 },
  "Onyx Ochre": { typeId: 17436, volumePerUnit: 8 },
  "Obsidian Ochre": { typeId: 17437, volumePerUnit: 8 },
  "Jet Ochre": { typeId: 46675, volumePerUnit: 8 },

  "Spodumain": { typeId: 19, volumePerUnit: 16 },
  "Bright Spodumain": { typeId: 17466, volumePerUnit: 16 },
  "Gleaming Spodumain": { typeId: 17467, volumePerUnit: 16 },
  "Dazzling Spodumain": { typeId: 46688, volumePerUnit: 16 },

  "Crokite": { typeId: 1225, volumePerUnit: 16 },
  "Sharp Crokite": { typeId: 17432, volumePerUnit: 16 },
  "Crystalline Crokite": { typeId: 17433, volumePerUnit: 16 },
  "Pellucid Crokite": { typeId: 46677, volumePerUnit: 16 },

  "Bistot": { typeId: 1223, volumePerUnit: 16 },
  "Triclinic Bistot": { typeId: 17428, volumePerUnit: 16 },
  "Monoclinic Bistot": { typeId: 17429, volumePerUnit: 16 },
  "Cubic Bistot": { typeId: 46676, volumePerUnit: 16 },

  "Arkonor": { typeId: 22, volumePerUnit: 16 },
  "Crimson Arkonor": { typeId: 17425, volumePerUnit: 16 },
  "Prime Arkonor": { typeId: 17426, volumePerUnit: 16 },
  "Flawless Arkonor": { typeId: 46678, volumePerUnit: 16 },

  "Mercoxit": { typeId: 11396, volumePerUnit: 40 },
  "Magma Mercoxit": { typeId: 17869, volumePerUnit: 40 },
  "Vitreous Mercoxit": { typeId: 17870, volumePerUnit: 40 },

  // Moon ores
  "Ubiquitous Moon Ore": { typeId: 46280, volumePerUnit: 10 },
  "Common Moon Ore": { typeId: 46281, volumePerUnit: 10 },
  "Uncommon Moon Ore": { typeId: 46282, volumePerUnit: 10 },
  "Rare Moon Ore": { typeId: 46283, volumePerUnit: 10 },
  "Exceptional Moon Ore": { typeId: 46284, volumePerUnit: 10 },

  // Ice ores (1000 m³ per unit)
  "Clear Icicle": { typeId: 16262, volumePerUnit: 1000 },
  "Glacial Mass": { typeId: 16263, volumePerUnit: 1000 },
  "Blue Ice": { typeId: 16264, volumePerUnit: 1000 },
  "White Glaze": { typeId: 16265, volumePerUnit: 1000 },
  "Glare Crust": { typeId: 16266, volumePerUnit: 1000 },
  "Dark Glitter": { typeId: 16267, volumePerUnit: 1000 },
  "Gelidus": { typeId: 16268, volumePerUnit: 1000 },
  "Krystallos": { typeId: 16269, volumePerUnit: 1000 },
  "Enriched Clear Icicle": { typeId: 17975, volumePerUnit: 1000 },
  "Pristine White Glaze": { typeId: 17976, volumePerUnit: 1000 },
  "Smooth Glacial Mass": { typeId: 17977, volumePerUnit: 1000 },
  "Thick Blue Ice": { typeId: 17978, volumePerUnit: 1000 },
  "Opulent Dark Glitter": { typeId: 17979, volumePerUnit: 1000 },
  "Crystallized Gelidus": { typeId: 17980, volumePerUnit: 1000 },

  // Graded ice ores (new grade system: I-Grade to IV-Grade)
  "Clear Icicle I-Grade": { typeId: 16262, volumePerUnit: 1000 },
  "Clear Icicle II-Grade": { typeId: 16262, volumePerUnit: 1000 },
  "Clear Icicle III-Grade": { typeId: 16262, volumePerUnit: 1000 },
  "Clear Icicle IV-Grade": { typeId: 16262, volumePerUnit: 1000 },
  "Glacial Mass I-Grade": { typeId: 16263, volumePerUnit: 1000 },
  "Glacial Mass II-Grade": { typeId: 16263, volumePerUnit: 1000 },
  "Glacial Mass III-Grade": { typeId: 16263, volumePerUnit: 1000 },
  "Glacial Mass IV-Grade": { typeId: 16263, volumePerUnit: 1000 },
  "Blue Ice I-Grade": { typeId: 16264, volumePerUnit: 1000 },
  "Blue Ice II-Grade": { typeId: 16264, volumePerUnit: 1000 },
  "Blue Ice III-Grade": { typeId: 16264, volumePerUnit: 1000 },
  "Blue Ice IV-Grade": { typeId: 16264, volumePerUnit: 1000 },
  "White Glaze I-Grade": { typeId: 16265, volumePerUnit: 1000 },
  "White Glaze II-Grade": { typeId: 16265, volumePerUnit: 1000 },
  "White Glaze III-Grade": { typeId: 16265, volumePerUnit: 1000 },
  "White Glaze IV-Grade": { typeId: 16265, volumePerUnit: 1000 },
  "Glare Crust I-Grade": { typeId: 16266, volumePerUnit: 1000 },
  "Glare Crust II-Grade": { typeId: 16266, volumePerUnit: 1000 },
  "Glare Crust III-Grade": { typeId: 16266, volumePerUnit: 1000 },
  "Glare Crust IV-Grade": { typeId: 16266, volumePerUnit: 1000 },
  "Dark Glitter I-Grade": { typeId: 16267, volumePerUnit: 1000 },
  "Dark Glitter II-Grade": { typeId: 16267, volumePerUnit: 1000 },
  "Dark Glitter III-Grade": { typeId: 16267, volumePerUnit: 1000 },
  "Dark Glitter IV-Grade": { typeId: 16267, volumePerUnit: 1000 },
  "Gelidus I-Grade": { typeId: 16268, volumePerUnit: 1000 },
  "Gelidus II-Grade": { typeId: 16268, volumePerUnit: 1000 },
  "Gelidus III-Grade": { typeId: 16268, volumePerUnit: 1000 },
  "Gelidus IV-Grade": { typeId: 16268, volumePerUnit: 1000 },
  "Krystallos I-Grade": { typeId: 16269, volumePerUnit: 1000 },
  "Krystallos II-Grade": { typeId: 16269, volumePerUnit: 1000 },
  "Krystallos III-Grade": { typeId: 16269, volumePerUnit: 1000 },
  "Krystallos IV-Grade": { typeId: 16269, volumePerUnit: 1000 },
};
