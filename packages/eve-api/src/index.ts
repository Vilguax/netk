import type {
  Contract,
  ContractItem,
  MarketOrder,
  TypeInfo,
  ItemBuyOrder,
} from "@netk/types";

const ESI_BASE = "https://esi.evetech.net/latest";

interface Constellation {
  constellation_id: number;
  name: string;
  region_id: number;
  systems: number[];
}

interface Station {
  station_id: number;
  name: string;
  system_id: number;
}

interface SolarSystem {
  system_id: number;
  name: string;
  constellation_id: number;
}

interface EsiOptions {
  accessToken?: string;
}

class EsiClient {
  private cache = new Map<string, { data: unknown; expires: number }>();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  private async fetch<T>(
    endpoint: string,
    options: EsiOptions = {}
  ): Promise<T> {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }

    let response = await fetch(`${ESI_BASE}${endpoint}`, { headers });

    // Retry once on transient 5xx errors
    if (response.status >= 500 && response.status < 600) {
      await new Promise((r) => setTimeout(r, 1000));
      response = await fetch(`${ESI_BASE}${endpoint}`, { headers });
    }

    if (!response.ok) {
      throw new Error(`ESI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    this.cache.set(cacheKey, {
      data,
      expires: Date.now() + this.cacheDuration,
    });

    return data;
  }

  async getPublicContracts(regionId: number): Promise<Contract[]> {
    const contracts = await this.fetch<Contract[]>(
      `/contracts/public/${regionId}/?datasource=tranquility`
    );

    // Filter only item_exchange contracts (flippable)
    return contracts.filter((c) => c.type === "item_exchange");
  }

  async getContractItems(contractId: number): Promise<ContractItem[]> {
    return this.fetch<ContractItem[]>(
      `/contracts/public/items/${contractId}/?datasource=tranquility`
    );
  }

  async getMarketOrders(
    regionId: number,
    typeId?: number
  ): Promise<MarketOrder[]> {
    let endpoint = `/markets/${regionId}/orders/?datasource=tranquility&order_type=buy`;

    if (typeId) {
      endpoint += `&type_id=${typeId}`;
    }

    return this.fetch<MarketOrder[]>(endpoint);
  }

  async getHighestBuyOrder(
    regionId: number,
    typeId: number,
    stationId?: number
  ): Promise<number> {
    const orders = await this.getMarketOrders(regionId, typeId);

    let buyOrders = orders.filter((o) => o.is_buy_order);

    // Filter by station if provided (hub only)
    if (stationId) {
      buyOrders = buyOrders.filter((o) => o.location_id === stationId);
    }

    if (buyOrders.length === 0) return 0;

    return Math.max(...buyOrders.map((o) => o.price));
  }

  async getTypeInfo(typeId: number): Promise<TypeInfo> {
    return this.fetch<TypeInfo>(
      `/universe/types/${typeId}/?datasource=tranquility`
    );
  }

  async getTypeInfoBatch(typeIds: number[]): Promise<Map<number, TypeInfo>> {
    const results = new Map<number, TypeInfo>();
    const uniqueIds = [...new Set(typeIds)];

    // Fetch in parallel with concurrency limit
    const batchSize = 20;
    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const batch = uniqueIds.slice(i, i + batchSize);
      const infos = await Promise.all(
        batch.map((id) => this.getTypeInfo(id).catch(() => null))
      );

      batch.forEach((id, index) => {
        if (infos[index]) {
          results.set(id, infos[index]!);
        }
      });
    }

    return results;
  }

  clearCache() {
    this.cache.clear();
  }

  // Get top buy orders for an item (for details view)
  async getTopBuyOrders(
    regionId: number,
    typeId: number,
    limit: number = 5
  ): Promise<ItemBuyOrder[]> {
    const orders = await this.getMarketOrders(regionId, typeId);
    const buyOrders = orders
      .filter((o) => o.is_buy_order)
      .sort((a, b) => b.price - a.price)
      .slice(0, limit);

    return buyOrders.map((o) => ({
      orderId: o.order_id,
      price: o.price,
      volumeRemain: o.volume_remain,
      locationId: o.location_id,
    }));
  }

  // Get constellations in a region
  async getRegionConstellations(regionId: number): Promise<Constellation[]> {
    const region = await this.fetch<{ constellations: number[] }>(
      `/universe/regions/${regionId}/?datasource=tranquility`
    );

    const constellations = await Promise.all(
      region.constellations.map((id) =>
        this.fetch<Constellation>(
          `/universe/constellations/${id}/?datasource=tranquility`
        )
      )
    );

    return constellations.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get station info
  async getStation(stationId: number): Promise<Station> {
    return this.fetch<Station>(
      `/universe/stations/${stationId}/?datasource=tranquility`
    );
  }

  // Get system info
  async getSystem(systemId: number): Promise<SolarSystem> {
    return this.fetch<SolarSystem>(
      `/universe/systems/${systemId}/?datasource=tranquility`
    );
  }

  // Get structure name (for citadels - requires auth)
  async getStructureName(
    structureId: number,
    accessToken: string
  ): Promise<string> {
    try {
      const structure = await this.fetch<{ name: string }>(
        `/universe/structures/${structureId}/?datasource=tranquility`,
        { accessToken }
      );
      return structure.name;
    } catch {
      return `Structure ${structureId}`;
    }
  }

  // Get location name (station or structure)
  async getLocationName(
    locationId: number,
    accessToken?: string
  ): Promise<string> {
    // Station IDs are typically < 100000000, structures are larger
    if (locationId < 100000000) {
      try {
        const station = await this.getStation(locationId);
        return station.name;
      } catch {
        return `Station ${locationId}`;
      }
    } else if (accessToken) {
      return this.getStructureName(locationId, accessToken);
    }
    return `Structure ${locationId}`;
  }

  // Get system ID from station/structure ID
  async getSystemIdFromLocation(locationId: number): Promise<number | null> {
    // NPC stations (ID < 100000000)
    if (locationId < 100000000) {
      try {
        const station = await this.getStation(locationId);
        return station.system_id;
      } catch {
        return null;
      }
    }
    // Structures - would need auth, return null for now
    return null;
  }

  // Get route between two systems (returns number of jumps)
  async getRouteJumps(
    originSystemId: number,
    destinationSystemId: number
  ): Promise<number> {
    if (originSystemId === destinationSystemId) return 0;

    try {
      const route = await this.fetch<number[]>(
        `/route/${originSystemId}/${destinationSystemId}/?datasource=tranquility`
      );
      // Route includes both origin and destination, so jumps = length - 1
      return Math.max(0, route.length - 1);
    } catch {
      return -1; // Error or no route
    }
  }

  // Get character info (name)
  async getCharacterName(characterId: number): Promise<string> {
    try {
      const character = await this.fetch<{ name: string }>(
        `/characters/${characterId}/?datasource=tranquility`
      );
      return character.name;
    } catch {
      return `Pilote #${characterId}`;
    }
  }

  // Get location info with system
  async getLocationInfo(
    locationId: number,
    accessToken?: string
  ): Promise<{
    name: string;
    systemId: number | null;
    systemName: string | null;
  }> {
    if (locationId < 100000000) {
      try {
        const station = await this.getStation(locationId);
        const system = await this.getSystem(station.system_id);
        return {
          name: station.name,
          systemId: station.system_id,
          systemName: system.name,
        };
      } catch {
        return {
          name: `Station ${locationId}`,
          systemId: null,
          systemName: null,
        };
      }
    } else if (accessToken) {
      const name = await this.getStructureName(locationId, accessToken);
      return { name, systemId: null, systemName: null };
    }
    return {
      name: `Structure ${locationId}`,
      systemId: null,
      systemName: null,
    };
  }

  // ========== Character Location & Ship ==========

  async getCharacterLocation(
    characterId: number,
    accessToken: string
  ): Promise<{ solar_system_id: number; station_id?: number; structure_id?: number }> {
    return this.fetch(
      `/characters/${characterId}/location/?datasource=tranquility`,
      { accessToken }
    );
  }

  async getCharacterShip(
    characterId: number,
    accessToken: string
  ): Promise<{ ship_item_id: number; ship_name: string; ship_type_id: number }> {
    return this.fetch(
      `/characters/${characterId}/ship/?datasource=tranquility`,
      { accessToken }
    );
  }

  async getCharacterOnline(
    characterId: number,
    accessToken: string
  ): Promise<{ online: boolean; last_login?: string; last_logout?: string }> {
    return this.fetch(
      `/characters/${characterId}/online/?datasource=tranquility`,
      { accessToken }
    );
  }

  // ========== Fleet Methods ==========

  async getCharacterFleet(
    characterId: number,
    accessToken: string
  ): Promise<{
    fleet_id: number;
    role: string;
    squad_id: number;
    wing_id: number;
  } | null> {
    try {
      return await this.fetch(
        `/characters/${characterId}/fleet/?datasource=tranquility`,
        { accessToken }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 404 = not in a fleet (normal), anything else is an actual error
      if (!msg.includes("404")) {
        console.error(`[ESI] getCharacterFleet(${characterId}) error: ${msg}`);
      }
      return null;
    }
  }

  async getFleetInfo(
    fleetId: number,
    accessToken: string
  ): Promise<{
    motd: string;
    is_free_move: boolean;
    is_registered: boolean;
    is_voice_enabled: boolean;
  }> {
    return this.fetch(`/fleets/${fleetId}/?datasource=tranquility`, {
      accessToken,
    });
  }

  async getFleetMembers(
    fleetId: number,
    accessToken: string
  ): Promise<
    Array<{
      character_id: number;
      join_time: string;
      role: string;
      role_name: string;
      ship_type_id: number;
      solar_system_id: number;
      squad_id: number;
      wing_id: number;
      takes_fleet_warp: boolean;
    }>
  > {
    return this.fetch(`/fleets/${fleetId}/members/?datasource=tranquility`, {
      accessToken,
    });
  }

  async getFleetWings(
    fleetId: number,
    accessToken: string
  ): Promise<
    Array<{
      id: number;
      name: string;
      squads: Array<{
        id: number;
        name: string;
      }>;
    }>
  > {
    return this.fetch(`/fleets/${fleetId}/wings/?datasource=tranquility`, {
      accessToken,
    });
  }

  async kickFleetMember(
    fleetId: number,
    memberId: number,
    accessToken: string
  ): Promise<void> {
    const url = `${ESI_BASE}/fleets/${fleetId}/members/${memberId}/?datasource=tranquility`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`ESI error: ${response.status} ${response.statusText}`);
    }
  }

  // ========== Market / Wallet Methods ==========

  async getCharacterOrders(
    characterId: number,
    accessToken: string
  ): Promise<
    Array<{
      order_id: number;
      type_id: number;
      region_id: number;
      location_id: number;
      is_buy_order: boolean;
      price: number;
      volume_total: number;
      volume_remain: number;
      duration: number;
      issued: string;
      min_volume: number;
      range: string;
    }>
  > {
    return this.fetch(
      `/characters/${characterId}/orders/?datasource=tranquility`,
      { accessToken }
    );
  }

  async getCharacterOrdersHistory(
    characterId: number,
    accessToken: string
  ): Promise<
    Array<{
      order_id: number;
      type_id: number;
      region_id: number;
      location_id: number;
      is_buy_order: boolean;
      price: number;
      volume_total: number;
      volume_remain: number;
      duration: number;
      issued: string;
      min_volume: number;
      state: string; // cancelled, expired
    }>
  > {
    return this.fetch(
      `/characters/${characterId}/orders/history/?datasource=tranquility`,
      { accessToken }
    );
  }

  async getCharacterWalletTransactions(
    characterId: number,
    accessToken: string
  ): Promise<
    Array<{
      transaction_id: number;
      date: string;
      type_id: number;
      quantity: number;
      unit_price: number;
      is_buy: boolean;
      location_id: number;
      journal_ref_id: number;
      client_id: number;
    }>
  > {
    return this.fetch(
      `/characters/${characterId}/wallet/transactions/?datasource=tranquility`,
      { accessToken }
    );
  }

  async getCharacterWalletJournal(
    characterId: number,
    accessToken: string
  ): Promise<
    Array<{
      id: number;
      ref_type: string;
      date: string;
      amount: number;
      balance: number;
      description: string;
      first_party_id?: number;
      second_party_id?: number;
      tax?: number;
      tax_receiver_id?: number;
    }>
  > {
    return this.fetch(
      `/characters/${characterId}/wallet/journal/?datasource=tranquility`,
      { accessToken }
    );
  }

  async getCharacterSkills(
    characterId: number,
    accessToken: string
  ): Promise<{ skills: Array<{ skill_id: number; trained_skill_level: number }> } | null> {
    try {
      return await this.fetch(
        `/characters/${characterId}/skills/?datasource=tranquility`,
        { accessToken }
      );
    } catch (err) {
      console.error(`[ESI] getCharacterSkills(${characterId}) error:`, err);
      return null;
    }
  }

  async setWaypoint(
    destinationId: number,
    accessToken: string,
    clearOther: boolean = true
  ): Promise<void> {
    const params = new URLSearchParams({
      add_to_beginning: "false",
      clear_other_waypoints: clearOther.toString(),
      destination_id: destinationId.toString(),
      datasource: "tranquility",
    });
    const url = `${ESI_BASE}/ui/autopilot/waypoint/?${params}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`ESI error: ${response.status} ${response.statusText}`);
    }
  }
}

export const esi = new EsiClient();
export { EsiClient };
export type { Constellation, Station, SolarSystem, EsiOptions };
