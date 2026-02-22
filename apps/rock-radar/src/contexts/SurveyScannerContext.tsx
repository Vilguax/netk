"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import type { SurveyScan } from "@netk/types";
import { groupRocksByOre } from "@/lib/parser";

interface OreBreakdown {
  oreName: string;
  totalVolume: number;
  totalQuantity: number;
  count: number;
}

interface ScanStats {
  totalRocks: number;
  totalVolume: number;
  oreBreakdown: OreBreakdown[];
  closestRock: { oreName: string; distance: number } | null;
  farthestRock: { oreName: string; distance: number } | null;
  averageDistance: number;
}

interface MiningRateData {
  rateM3PerSec: number;
  rateM3PerHour: number;
  etaSeconds: number | null;
  etaFormatted: string | null;
  estimatedCompletion: Date | null;
  volumeMined: number;
  percentComplete: number;
  isReliable: boolean;
}

interface SurveyScannerContextType {
  scans: SurveyScan[];
  currentScan: SurveyScan | null;
  error: string | null;
  hasScans: boolean;
  addScan: (scan: SurveyScan) => void;
  setError: (message: string) => void;
  clearScans: () => void;
  currentScanStats: ScanStats | null;
  miningRate: MiningRateData | null;
  orePrices: Map<string, number>;
  setOrePrices: (prices: Map<string, number>) => void;
  totalValue: number | null;
  isLoadingPrices: boolean;
  setIsLoadingPrices: (loading: boolean) => void;
}

const SurveyScannerContext = createContext<SurveyScannerContextType | null>(null);

export function SurveyScannerProvider({ children }: { children: ReactNode }) {
  const [scans, setScans] = useState<SurveyScan[]>([]);
  const [error, setErrorState] = useState<string | null>(null);
  const [orePrices, setOrePrices] = useState<Map<string, number>>(new Map());
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  const currentScan = scans.length > 0 ? scans[scans.length - 1] : null;
  const hasScans = scans.length > 0;

  const addScan = useCallback((scan: SurveyScan) => {
    setScans((prev) => [...prev, scan]);
    setErrorState(null);
  }, []);

  const setError = useCallback((message: string) => {
    setErrorState(message);
    setTimeout(() => {
      setErrorState((prev) => (prev === message ? null : prev));
    }, 5000);
  }, []);

  const clearScans = useCallback(() => {
    setScans([]);
    setErrorState(null);
    setOrePrices(new Map());
  }, []);

  const currentScanStats = useMemo((): ScanStats | null => {
    if (!currentScan) return null;

    const rocks = currentScan.rocks;
    const grouped = groupRocksByOre(rocks);

    const oreBreakdown = Array.from(grouped.entries())
      .map(([oreName, data]) => ({ oreName, ...data }))
      .sort((a, b) => b.totalVolume - a.totalVolume);

    const closestRock = rocks.length > 0
      ? rocks.reduce((c, r) => (r.distance < c.distance ? r : c), rocks[0])
      : null;

    const farthestRock = rocks.length > 0
      ? rocks.reduce((f, r) => (r.distance > f.distance ? r : f), rocks[0])
      : null;

    const averageDistance =
      rocks.length > 0
        ? rocks.reduce((sum, r) => sum + r.distance, 0) / rocks.length
        : 0;

    return {
      totalRocks: rocks.length,
      totalVolume: currentScan.totalVolume,
      oreBreakdown,
      closestRock: closestRock ? { oreName: closestRock.oreName, distance: closestRock.distance } : null,
      farthestRock: farthestRock ? { oreName: farthestRock.oreName, distance: farthestRock.distance } : null,
      averageDistance,
    };
  }, [currentScan]);

  const miningRate = useMemo((): MiningRateData | null => {
    if (scans.length < 2) return null;

    const firstScan = scans[0];
    const lastScan = scans[scans.length - 1];

    const initialVolume = firstScan.totalVolume;
    const currentVolume = lastScan.totalVolume;
    const volumeMined = initialVolume - currentVolume;

    const timeElapsed =
      (lastScan.timestamp.getTime() - firstScan.timestamp.getTime()) / 1000;

    if (timeElapsed <= 0 || volumeMined <= 0) return null;

    const rateM3PerSec = volumeMined / timeElapsed;
    const rateM3PerHour = rateM3PerSec * 3600;

    const remainingVolume = currentVolume;
    const etaSeconds = remainingVolume > 0 ? remainingVolume / rateM3PerSec : 0;
    const estimatedCompletion =
      etaSeconds > 0 ? new Date(Date.now() + etaSeconds * 1000) : null;

    const hours = Math.floor(etaSeconds / 3600);
    const minutes = Math.floor((etaSeconds % 3600) / 60);
    const etaFormatted =
      etaSeconds > 0
        ? hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m`
        : null;

    const percentComplete = initialVolume > 0 ? (volumeMined / initialVolume) * 100 : 0;
    const isReliable = scans.length >= 3 && timeElapsed >= 120;

    return {
      rateM3PerSec,
      rateM3PerHour,
      etaSeconds,
      etaFormatted,
      estimatedCompletion,
      volumeMined,
      percentComplete,
      isReliable,
    };
  }, [scans]);

  const totalValue = useMemo(() => {
    if (!currentScan) return null;

    // If all rocks have iskValue from paste, use those directly (no Janice needed)
    const hasAllIskValues = currentScan.rocks.every((r) => r.iskValue != null);
    if (hasAllIskValues) {
      return currentScan.rocks.reduce((sum, rock) => sum + (rock.iskValue ?? 0), 0);
    }

    if (orePrices.size === 0) return null;
    return currentScan.rocks.reduce((sum, rock) => {
      if (rock.iskValue != null) return sum + rock.iskValue;
      const pricePerUnit = orePrices.get(rock.oreName) || 0;
      return sum + pricePerUnit * rock.quantity;
    }, 0);
  }, [currentScan, orePrices]);

  return (
    <SurveyScannerContext.Provider
      value={{
        scans,
        currentScan,
        error,
        hasScans,
        addScan,
        setError,
        clearScans,
        currentScanStats,
        miningRate,
        orePrices,
        setOrePrices,
        totalValue,
        isLoadingPrices,
        setIsLoadingPrices,
      }}
    >
      {children}
    </SurveyScannerContext.Provider>
  );
}

export function useSurveyScannerContext() {
  const context = useContext(SurveyScannerContext);
  if (!context) {
    throw new Error("useSurveyScannerContext must be used within SurveyScannerProvider");
  }
  return context;
}
