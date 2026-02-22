"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { FleetPanel } from "@/components/fleet/FleetPanel";
import { useFleetData } from "@/hooks/useFleetData";

// Dynamic import to avoid WebGL2RenderingContext SSR error from sigma.js
const UniverseMap = dynamic(
  () => import("@/components/fleet/UniverseMap").then((m) => m.UniverseMap),
  { ssr: false }
);

export interface FavoriteSystem {
  id: string;
  name: string;
  security: number;
}

export default function FleetPage() {
  const {
    data: fleetData,
    isLoading,
    error,
    refetch,
    kickMember,
    setDestination,
  } = useFleetData(15000);

  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  // Favorites state — always start empty to avoid hydration mismatch, then load
  const [favorites, setFavorites] = useState<FavoriteSystem[]>([]);
  const favoritesLoaded = useRef(false);

  // Load favorites from API on mount, fallback to localStorage
  useEffect(() => {
    // Load localStorage immediately
    try {
      const local = JSON.parse(localStorage.getItem("fleet-favorites") || "[]");
      if (Array.isArray(local) && local.length > 0) {
        setFavorites(local);
      }
    } catch {
      // ignore
    }

    // Then fetch from API (overrides localStorage)
    fetch("/api/fleet/favorites")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFavorites(data);
        }
        favoritesLoaded.current = true;
      })
      .catch(() => {
        favoritesLoaded.current = true;
      });
  }, []);

  // Persist favorites to localStorage + API on change
  useEffect(() => {
    localStorage.setItem("fleet-favorites", JSON.stringify(favorites));

    // Only save to API after initial load to avoid overwriting with stale localStorage
    if (!favoritesLoaded.current) return;

    fetch("/api/fleet/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(favorites),
    }).catch(() => {
      // Silent fail — localStorage is the fallback
    });
  }, [favorites]);

  // Refs for functions set by UniverseMap
  const zoomToSystemRef = useRef<((systemId: string) => void) | null>(null);
  const openContextMenuRef = useRef<((systemId: string, x: number, y: number) => void) | null>(null);

  const handleFocusSystem = useCallback((systemId: string) => {
    zoomToSystemRef.current?.(systemId);
  }, []);

  const handleRemoveFavorite = useCallback((systemId: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== systemId));
  }, []);

  const handleFavoriteContextMenu = useCallback((systemId: string, x: number, y: number) => {
    openContextMenuRef.current?.(systemId, x, y);
  }, []);

  const handleSetDestination = useCallback(
    async (systemId: number, mode: "self" | "fleet" | "specific", clearOther: boolean = true, characterIds?: number[]) => {
      return setDestination(systemId, mode, characterIds, clearOther);
    },
    [setDestination]
  );

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "calc(100vh - 40px)", background: "var(--background)" }}
    >
      {/* Left panel - Fleet management */}
      <FleetPanel
        fleetData={fleetData}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        onKick={kickMember}
        onSelectMember={setSelectedMemberId}
        selectedMemberId={selectedMemberId}
        favorites={favorites}
        onFocusSystem={handleFocusSystem}
        onRemoveFavorite={handleRemoveFavorite}
        onFavoriteContextMenu={handleFavoriteContextMenu}
      />

      {/* Right panel - Universe map */}
      <UniverseMap
        members={fleetData?.members || []}
        outOfFleet={fleetData?.outOfFleet || []}
        onSetDestination={handleSetDestination}
        netkMemberCount={fleetData?.netkMemberCount || 0}
        highlightCharacterId={selectedMemberId || undefined}
        favorites={favorites}
        onFavoritesChange={setFavorites}
        zoomToSystemRef={zoomToSystemRef}
        openContextMenuRef={openContextMenuRef}
      />
    </div>
  );
}
