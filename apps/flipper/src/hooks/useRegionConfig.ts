"use client";

import { useState, useEffect, useCallback } from "react";
import type { RegionConfig, ScopeConfig } from "@netk/types";
import { getDefaultRegionConfig } from "@netk/types";

const STORAGE_KEY = "netk-flipper-config";

interface StoredConfig {
  regions: Record<string, RegionConfig>;
}

function loadConfig(): StoredConfig {
  if (typeof window === "undefined") {
    return { regions: {} };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn("Failed to load config from localStorage");
  }

  return { regions: {} };
}

function saveConfig(config: StoredConfig): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    console.warn("Failed to save config to localStorage");
  }
}

export function useRegionConfig(regionSlug: string) {
  const [config, setConfig] = useState<RegionConfig>(() => {
    const stored = loadConfig();
    return stored.regions[regionSlug] || getDefaultRegionConfig();
  });

  useEffect(() => {
    const stored = loadConfig();
    if (stored.regions[regionSlug]) {
      setConfig(stored.regions[regionSlug]);
    }
  }, [regionSlug]);

  const updateConfig = useCallback(
    (updates: Partial<RegionConfig>) => {
      setConfig((prev) => {
        const newConfig = { ...prev, ...updates };

        const stored = loadConfig();
        stored.regions[regionSlug] = newConfig;
        saveConfig(stored);

        return newConfig;
      });
    },
    [regionSlug]
  );

  const setScope = useCallback(
    (scope: ScopeConfig) => {
      updateConfig({ scope });
    },
    [updateConfig]
  );

  return {
    config,
    updateConfig,
    setScope,
    scope: config.scope,
  };
}
