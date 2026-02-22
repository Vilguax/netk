"use client";

import { useState, useEffect, useCallback } from "react";
import type { Region } from "@netk/types";
import type { ScopeConfig, ScopeType } from "@netk/types";
import type { FactionTheme } from "@netk/themes";

interface ScopeSelectorProps {
  region: Region;
  scope: ScopeConfig;
  onScopeChange: (scope: ScopeConfig) => void;
  theme: FactionTheme;
}

interface ConstellationOption {
  id: number;
  name: string;
}

interface SystemOption {
  id: number;
  name: string;
}

interface StationOption {
  id: number;
  name: string;
}

export function ScopeSelector({
  region,
  scope,
  onScopeChange,
  theme,
}: ScopeSelectorProps) {
  const [constellations, setConstellations] = useState<ConstellationOption[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loadingConstellations, setLoadingConstellations] = useState(false);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);

  const loadConstellations = useCallback(async () => {
    if (constellations.length > 0) return;
    setLoadingConstellations(true);
    try {
      const response = await fetch(
        `https://esi.evetech.net/latest/universe/regions/${region.id}/?datasource=tranquility`
      );
      const data = await response.json();

      const constellationPromises = data.constellations.map(async (id: number) => {
        const res = await fetch(
          `https://esi.evetech.net/latest/universe/constellations/${id}/?datasource=tranquility`
        );
        const constellation = await res.json();
        return { id, name: constellation.name };
      });

      const results = await Promise.all(constellationPromises);
      setConstellations(results.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      console.error("Failed to load constellations");
    } finally {
      setLoadingConstellations(false);
    }
  }, [region.id, constellations.length]);

  const loadSystems = useCallback(async (constellationId: number) => {
    setLoadingSystems(true);
    setSystems([]);
    setStations([]);
    try {
      const response = await fetch(
        `https://esi.evetech.net/latest/universe/constellations/${constellationId}/?datasource=tranquility`
      );
      const data = await response.json();

      const systemPromises = data.systems.map(async (id: number) => {
        const res = await fetch(
          `https://esi.evetech.net/latest/universe/systems/${id}/?datasource=tranquility`
        );
        const system = await res.json();
        return { id, name: system.name };
      });

      const results = await Promise.all(systemPromises);
      setSystems(results.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      console.error("Failed to load systems");
    } finally {
      setLoadingSystems(false);
    }
  }, []);

  const loadStations = useCallback(async (systemId: number) => {
    setLoadingStations(true);
    setStations([]);
    try {
      const response = await fetch(
        `https://esi.evetech.net/latest/universe/systems/${systemId}/?datasource=tranquility`
      );
      const data = await response.json();

      if (!data.stations || data.stations.length === 0) {
        setStations([]);
        return;
      }

      const stationPromises = data.stations.map(async (id: number) => {
        const res = await fetch(
          `https://esi.evetech.net/latest/universe/stations/${id}/?datasource=tranquility`
        );
        const station = await res.json();
        return { id, name: station.name };
      });

      const results = await Promise.all(stationPromises);
      setStations(results.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      console.error("Failed to load stations");
    } finally {
      setLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    if (scope.type !== "region" && constellations.length === 0) {
      loadConstellations();
    }
  }, [scope.type, constellations.length, loadConstellations]);

  useEffect(() => {
    if ((scope.type === "system" || scope.type === "station") && scope.constellationId) {
      loadSystems(scope.constellationId);
    }
  }, [scope.type, scope.constellationId, loadSystems]);

  useEffect(() => {
    if (scope.type === "station" && scope.systemId) {
      loadStations(scope.systemId);
    }
  }, [scope.type, scope.systemId, loadStations]);

  const handleScopeTypeChange = (type: ScopeType) => {
    if (type === "region") {
      onScopeChange({ type: "region" });
    } else if (type === "constellation") {
      if (constellations.length > 0) {
        onScopeChange({
          type: "constellation",
          id: constellations[0].id,
          name: constellations[0].name,
        });
      } else {
        onScopeChange({ type: "constellation" });
        loadConstellations();
      }
    } else if (type === "system") {
      if (constellations.length > 0) {
        onScopeChange({
          type: "system",
          constellationId: constellations[0].id,
          constellationName: constellations[0].name,
        });
      } else {
        onScopeChange({ type: "system" });
        loadConstellations();
      }
    } else if (type === "station") {
      if (constellations.length > 0) {
        onScopeChange({
          type: "station",
          constellationId: constellations[0].id,
          constellationName: constellations[0].name,
        });
      } else {
        onScopeChange({ type: "station" });
        loadConstellations();
      }
    }
  };

  const handleConstellationChange = (constellationId: number) => {
    const constellation = constellations.find((c) => c.id === constellationId);
    if (!constellation) return;

    if (scope.type === "constellation") {
      onScopeChange({
        type: "constellation",
        id: constellation.id,
        name: constellation.name,
      });
    } else {
      onScopeChange({
        type: scope.type,
        constellationId: constellation.id,
        constellationName: constellation.name,
        systemId: undefined,
        systemName: undefined,
        id: undefined,
        name: undefined,
      });
    }
  };

  const handleSystemChange = (systemId: number) => {
    const system = systems.find((s) => s.id === systemId);
    if (!system) return;

    if (scope.type === "system") {
      onScopeChange({
        type: "system",
        id: system.id,
        name: system.name,
        constellationId: scope.constellationId,
        constellationName: scope.constellationName,
      });
    } else if (scope.type === "station") {
      onScopeChange({
        type: "station",
        constellationId: scope.constellationId,
        constellationName: scope.constellationName,
        systemId: system.id,
        systemName: system.name,
        id: undefined,
        name: undefined,
      });
    }
  };

  const handleStationChange = (stationId: number) => {
    const station = stations.find((s) => s.id === stationId);
    if (!station) return;

    onScopeChange({
      type: "station",
      id: station.id,
      name: station.name,
      constellationId: scope.constellationId,
      constellationName: scope.constellationName,
      systemId: scope.systemId,
      systemName: scope.systemName,
    });
  };

  const baseSelectClass = `
    appearance-none
    px-3 py-2 pr-8
    rounded-lg border
    text-sm font-medium
    cursor-pointer
    transition-all duration-200
    focus:outline-none focus:ring-2
    bg-no-repeat bg-right
  `;

  const arrowBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(theme.primary)}' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

  const selectStyle = {
    backgroundColor: theme.background,
    borderColor: `${theme.primary}50`,
    color: theme.text,
    backgroundImage: arrowBg,
    backgroundPosition: "right 8px center",
    backgroundSize: "12px",
  };

  const optionStyle = { backgroundColor: theme.background, color: theme.text };
  const currentConstellationId =
    scope.type === "constellation" ? scope.id : scope.constellationId;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={scope.type}
        onChange={(e) => handleScopeTypeChange(e.target.value as ScopeType)}
        className={baseSelectClass}
        style={selectStyle}
      >
        <option value="region" style={optionStyle}>
          Région entière
        </option>
        <option value="constellation" style={optionStyle}>
          Constellation
        </option>
        <option value="system" style={optionStyle}>
          Système
        </option>
        <option value="station" style={optionStyle}>
          Station
        </option>
      </select>

      {scope.type !== "region" && (
        <select
          value={currentConstellationId || ""}
          onChange={(e) => handleConstellationChange(parseInt(e.target.value))}
          className={`${baseSelectClass} max-w-[180px]`}
          style={{
            ...selectStyle,
            opacity: loadingConstellations ? 0.6 : 1,
          }}
          disabled={loadingConstellations}
        >
          {loadingConstellations ? (
            <option style={optionStyle}>Chargement...</option>
          ) : (
            constellations.map((constellation) => (
              <option
                key={constellation.id}
                value={constellation.id}
                style={optionStyle}
              >
                {constellation.name}
              </option>
            ))
          )}
        </select>
      )}

      {(scope.type === "system" || scope.type === "station") && (
        <select
          value={scope.type === "system" ? scope.id : scope.systemId || ""}
          onChange={(e) => handleSystemChange(parseInt(e.target.value))}
          className={`${baseSelectClass} max-w-[160px]`}
          style={{
            ...selectStyle,
            opacity: loadingSystems ? 0.6 : 1,
          }}
          disabled={loadingSystems || systems.length === 0}
        >
          {loadingSystems ? (
            <option style={optionStyle}>Chargement...</option>
          ) : systems.length === 0 ? (
            <option style={optionStyle}>Sélectionner constellation</option>
          ) : (
            systems.map((system) => (
              <option key={system.id} value={system.id} style={optionStyle}>
                {system.name}
              </option>
            ))
          )}
        </select>
      )}

      {scope.type === "station" && (
        <select
          value={scope.id || ""}
          onChange={(e) => handleStationChange(parseInt(e.target.value))}
          className={`${baseSelectClass} max-w-[200px] truncate`}
          style={{
            ...selectStyle,
            opacity: loadingStations ? 0.6 : 1,
          }}
          disabled={loadingStations || stations.length === 0}
        >
          {loadingStations ? (
            <option style={optionStyle}>Chargement...</option>
          ) : stations.length === 0 ? (
            <option style={optionStyle}>
              {scope.systemId ? "Aucune station NPC" : "Sélectionner système"}
            </option>
          ) : (
            stations.map((station) => (
              <option key={station.id} value={station.id} style={optionStyle}>
                {station.name.split(" - ").pop()}
              </option>
            ))
          )}
        </select>
      )}
    </div>
  );
}

