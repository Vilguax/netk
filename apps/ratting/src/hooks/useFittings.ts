"use client";

import { useState, useEffect, useCallback } from "react";

interface FittingModule {
  typeId: number;
  name: string;
  stats: Record<string, number>;
  quantity?: number;
}

interface FittingSlots {
  high: FittingModule[];
  med: FittingModule[];
  low: FittingModule[];
  rig: FittingModule[];
  subsystem: FittingModule[];
  drone: FittingModule[];
}

interface FittingDetail {
  id: number;
  name: string;
  description: string;
  shipTypeId: number;
  shipName: string;
  slots: FittingSlots;
}

interface FittingListItem {
  id: number;
  name: string;
  shipTypeId: number;
  shipName: string;
  itemCount: number;
}

export function useFittings() {
  const [fittings, setFittings] = useState<FittingListItem[]>([]);
  const [selectedFitting, setSelectedFitting] = useState<FittingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFittings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/fittings");

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des fittings");
      }

      const data = await response.json();
      setFittings(data.fittings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectFitting = useCallback(async (fittingId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/fittings?fitting_id=${fittingId}`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement du fitting");
      }

      const data = await response.json();
      setSelectedFitting(data.fitting);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFittings();
  }, [fetchFittings]);

  return {
    fittings,
    selectedFitting,
    isLoading,
    error,
    refetch: fetchFittings,
    selectFitting,
    clearSelection: () => setSelectedFitting(null),
  };
}
