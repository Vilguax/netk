"use client";

import { useMemo } from "react";
import type { SurveyScan } from "@netk/types";

interface MiningRateResult {
  // Current calculated rate
  rateM3PerSec: number;
  rateM3PerMin: number;
  rateM3PerHour: number;

  // ETA to clear belt
  etaSeconds: number | null;
  etaFormatted: string | null;
  estimatedCompletion: Date | null;

  // Stats
  volumeMined: number;
  timeElapsed: number; // seconds
  percentComplete: number;

  // Is rate reliable (enough data points)
  isReliable: boolean;
}

export function useMiningRate(scans: SurveyScan[]): MiningRateResult | null {
  return useMemo(() => {
    if (scans.length < 2) {
      return null;
    }

    const firstScan = scans[0];
    const lastScan = scans[scans.length - 1];

    const initialVolume = firstScan.totalVolume;
    const currentVolume = lastScan.totalVolume;
    const volumeMined = initialVolume - currentVolume;

    const timeElapsed =
      (lastScan.timestamp.getTime() - firstScan.timestamp.getTime()) / 1000;

    if (timeElapsed <= 0 || volumeMined <= 0) {
      return null;
    }

    const rateM3PerSec = volumeMined / timeElapsed;
    const rateM3PerMin = rateM3PerSec * 60;
    const rateM3PerHour = rateM3PerSec * 3600;

    // Calculate ETA to clear remaining volume
    const remainingVolume = currentVolume;
    const etaSeconds = remainingVolume > 0 ? remainingVolume / rateM3PerSec : 0;

    const estimatedCompletion =
      etaSeconds > 0 ? new Date(Date.now() + etaSeconds * 1000) : null;

    // Format ETA
    const etaFormatted = formatDuration(etaSeconds);

    // Calculate percent complete
    const percentComplete =
      initialVolume > 0 ? (volumeMined / initialVolume) * 100 : 0;

    // Rate is reliable if we have at least 3 scans over at least 2 minutes
    const isReliable = scans.length >= 3 && timeElapsed >= 120;

    return {
      rateM3PerSec,
      rateM3PerMin,
      rateM3PerHour,
      etaSeconds,
      etaFormatted,
      estimatedCompletion,
      volumeMined,
      timeElapsed,
      percentComplete,
      isReliable,
    };
  }, [scans]);
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string | null {
  if (seconds <= 0 || !isFinite(seconds)) {
    return null;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Calculate average mining rate from multiple scan pairs
 * More accurate than just first-to-last
 */
export function calculateAverageMiningRate(scans: SurveyScan[]): number | null {
  if (scans.length < 2) {
    return null;
  }

  const rates: number[] = [];

  for (let i = 1; i < scans.length; i++) {
    const prev = scans[i - 1];
    const curr = scans[i];

    const volumeDelta = prev.totalVolume - curr.totalVolume;
    const timeDelta =
      (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;

    if (timeDelta > 0 && volumeDelta > 0) {
      rates.push(volumeDelta / timeDelta);
    }
  }

  if (rates.length === 0) {
    return null;
  }

  // Return average rate in m³/s
  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}
