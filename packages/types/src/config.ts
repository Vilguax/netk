// Application Configuration Types

export type ScopeType = "region" | "constellation" | "system" | "station";

export interface ScopeConfig {
  type: ScopeType;
  id?: number;
  name?: string;
  constellationId?: number;
  constellationName?: string;
  systemId?: number;
  systemName?: string;
}

export interface RegionConfig {
  scope: ScopeConfig;
}

export interface AppConfig {
  regions: Record<string, RegionConfig>;
}

export const DEFAULT_SCOPE: ScopeConfig = {
  type: "region",
};

export function getDefaultRegionConfig(): RegionConfig {
  return {
    scope: { ...DEFAULT_SCOPE },
  };
}
