"use client";

import { useState, useEffect, useCallback } from "react";

export interface FleetMember {
  characterId: number;
  characterName: string;
  solarSystemId: number;
  shipTypeId: number;
  shipTypeName: string;
  role: string;
  wingId: number;
  squadId: number;
  isNetkUser: boolean;
  netkUserId: string | null;
  // Jump drive data
  canJump: boolean;
  hasSkillScope: boolean;
  jdcLevel?: number;
  jumpRangeLY?: number;
  reachableSystems?: number[];
}

export interface FleetWing {
  id: number;
  name: string;
  squads: Array<{ id: number; name: string }>;
}

export interface OutOfFleetCharacter {
  characterId: number;
  characterName: string;
  online: boolean;
}

export interface FleetData {
  inFleet: boolean;
  fleetId?: number;
  myRole?: string;
  commanderCharacterId?: string;
  members: FleetMember[];
  wings: FleetWing[];
  netkMemberCount: number;
  outOfFleet: OutOfFleetCharacter[];
  message?: string;
}

export function useFleetData(refreshInterval = 15000) {
  const [data, setData] = useState<FleetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch("/api/fleet");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Non authentifié");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchFleet, refreshInterval]);

  const kickMember = useCallback(
    async (memberId: number) => {
      if (!data?.fleetId) return false;
      try {
        const res = await fetch("/api/fleet/kick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fleetId: data.fleetId, memberId }),
        });
        if (res.ok) {
          await fetchFleet();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [data?.fleetId, fetchFleet]
  );

  const setDestination = useCallback(
    async (
      destinationId: number,
      mode: "self" | "fleet" | "specific",
      characterIds?: number[],
      clearOther: boolean = true
    ) => {
      try {
        const body: Record<string, unknown> = { destinationId, clearOther };
        if (mode === "fleet" && data?.fleetId) {
          body.fleetId = data.fleetId;
        } else if (mode === "specific" && characterIds) {
          body.characterIds = characterIds;
        } else if (mode === "self") {
          const res = await fetch("/api/fleet/destination", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destinationId,
              characterIds: [],
              clearOther,
            }),
          });
          return res.ok;
        }

        const res = await fetch("/api/fleet/destination", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [data?.fleetId]
  );

  return {
    data,
    isLoading,
    error,
    refetch: fetchFleet,
    kickMember,
    setDestination,
  };
}

