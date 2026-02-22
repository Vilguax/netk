"use client";

import { useState, useCallback, useMemo } from "react";
import type { SurveyScan, SurveyRock } from "@netk/types";
import { groupRocksByOre } from "@/lib/parser";

interface SurveyScannerState {
  scans: SurveyScan[];
  currentScan: SurveyScan | null;
  error: string | null;
}

export function useSurveyScanner() {
  const [state, setState] = useState<SurveyScannerState>({
    scans: [],
    currentScan: null,
    error: null,
  });

  // Add a new scan
  const addScan = useCallback((scan: SurveyScan) => {
    setState((prev) => ({
      ...prev,
      scans: [...prev.scans, scan],
      currentScan: scan,
      error: null,
    }));
  }, []);

  // Set error message
  const setError = useCallback((message: string) => {
    setState((prev) => ({
      ...prev,
      error: message,
    }));

    // Clear error after 5 seconds
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        error: prev.error === message ? null : prev.error,
      }));
    }, 5000);
  }, []);

  // Clear all scans
  const clearScans = useCallback(() => {
    setState({
      scans: [],
      currentScan: null,
      error: null,
    });
  }, []);

  // Clear current scan only
  const clearCurrentScan = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentScan: prev.scans.length > 1 ? prev.scans[prev.scans.length - 2] : null,
    }));
  }, []);

  // Get aggregated stats for current scan
  const currentScanStats = useMemo(() => {
    if (!state.currentScan) {
      return null;
    }

    const rocks = state.currentScan.rocks;
    const grouped = groupRocksByOre(rocks);

    // Sort by volume descending
    const oreBreakdown = Array.from(grouped.entries())
      .map(([oreName, data]) => ({
        oreName,
        ...data,
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume);

    return {
      totalRocks: rocks.length,
      totalVolume: state.currentScan.totalVolume,
      oreBreakdown,
      closestRock: rocks.reduce(
        (closest, rock) =>
          rock.distance < closest.distance ? rock : closest,
        rocks[0]
      ),
      farthestRock: rocks.reduce(
        (farthest, rock) =>
          rock.distance > farthest.distance ? rock : farthest,
        rocks[0]
      ),
      averageDistance:
        rocks.reduce((sum, rock) => sum + rock.distance, 0) / rocks.length,
    };
  }, [state.currentScan]);

  // Calculate volume delta between last two scans (for mining rate)
  const volumeDelta = useMemo(() => {
    if (state.scans.length < 2) {
      return null;
    }

    const current = state.scans[state.scans.length - 1];
    const previous = state.scans[state.scans.length - 2];

    const volumeChange = previous.totalVolume - current.totalVolume;
    const timeChange =
      (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000; // seconds

    if (timeChange <= 0) {
      return null;
    }

    return {
      volumeChange,
      timeChange,
      rateM3PerSec: volumeChange / timeChange,
      rateM3PerMin: (volumeChange / timeChange) * 60,
      rateM3PerHour: (volumeChange / timeChange) * 3600,
    };
  }, [state.scans]);

  return {
    ...state,
    addScan,
    setError,
    clearScans,
    clearCurrentScan,
    currentScanStats,
    volumeDelta,
    hasScans: state.scans.length > 0,
  };
}
