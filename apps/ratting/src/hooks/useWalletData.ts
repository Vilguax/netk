"use client";

import { useState, useEffect, useCallback } from "react";
import { useCharacterSelection } from "@/contexts/CharacterContext";

interface WalletStats {
  todayTotal: number;
  yesterdayTotal: number;
  periodTotal: number;
  iskPerHour: number;
  avgTick: number;
  bestTick: number;
  trend: number;
  tickCount: number;
  periodDays: number;
}

interface ChartDataPoint {
  date: string;
  amount: number;
}

interface WalletEntry {
  id: number;
  date: string;
  amount: number;
  description: string;
  characterId: string;
  characterName: string;
  isEss?: boolean;
}

interface CharacterBreakdown {
  characterId: string;
  characterName: string;
  total: number;
  tickCount: number;
}

interface CharacterFetchStatus {
  characterId: string;
  characterName: string;
  status: "ok" | "no_token" | "esi_error" | "error";
  errorCode?: number;
  cacheExpires?: string;
  latestBountyDate?: string;
  bountyCount: number;
}

interface WalletData {
  stats: WalletStats;
  chartData: ChartDataPoint[];
  recentBounties: WalletEntry[];
  characterBreakdown: CharacterBreakdown[];
  hourlyData: Record<number, number>;
  dayOfWeekData: Record<number, number>;
  characterFetchStatus: CharacterFetchStatus[];
}

export function useWalletData(period: "7d" | "30d" | "all" = "7d", refreshInterval: number = 60000) {
  const { selectedCharacterIds } = useCharacterSelection();
  const [data, setData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (selectedCharacterIds.length === 0) {
      setData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const characterIdsParam = selectedCharacterIds.join(",");
      const response = await fetch(
        `/api/wallet?period=${period}&characterIds=${characterIdsParam}`
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des données");
      }

      const walletData = await response.json();
      setData(walletData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [period, selectedCharacterIds]);

  useEffect(() => {
    fetchData();

    // Refresh at specified interval
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

