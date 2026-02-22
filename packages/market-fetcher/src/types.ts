// EVE Online region IDs for trade hubs
export const TRADE_HUB_REGIONS = {
  THE_FORGE: 10000002n,    // Jita
  DOMAIN: 10000043n,       // Amarr
  HEIMATAR: 10000030n,     // Rens
  SINQ_LAISON: 10000032n,  // Dodixie
  METROPOLIS: 10000042n,   // Hek
} as const;

export type TradeHubRegion = typeof TRADE_HUB_REGIONS[keyof typeof TRADE_HUB_REGIONS];

// ESI market order response
export interface ESIMarketOrder {
  order_id: number;
  type_id: number;
  location_id: number;
  volume_total: number;
  volume_remain: number;
  min_volume: number;
  price: number;
  is_buy_order: boolean;
  duration: number;
  issued: string;
  range: string;
}

// Aggregated price for a type
export interface AggregatedPrice {
  typeId: number;
  buyPrice: number;      // Highest buy order
  sellPrice: number;     // Lowest sell order
  buyVolume: number;     // Total buy volume
  sellVolume: number;    // Total sell volume
}

// ESI type info response
export interface ESITypeInfo {
  type_id: number;
  name: string;
  group_id: number;
  volume: number;
  packaged_volume?: number;
  portion_size: number;
  icon_id?: number;
}

// ESI group info
export interface ESIGroupInfo {
  group_id: number;
  name: string;
  category_id: number;
}

// Fetch job status
export type FetchJobStatus = "pending" | "running" | "completed" | "failed";
