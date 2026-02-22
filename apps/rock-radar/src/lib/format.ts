/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number, decimals: number = 0): string {
  if (!isFinite(num)) return "0";

  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompact(num: number): string {
  if (!isFinite(num)) return "0";

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absNum >= 1_000_000_000) {
    return `${sign}${(absNum / 1_000_000_000).toFixed(2)}B`;
  }
  if (absNum >= 1_000_000) {
    return `${sign}${(absNum / 1_000_000).toFixed(2)}M`;
  }
  if (absNum >= 1_000) {
    return `${sign}${(absNum / 1_000).toFixed(1)}K`;
  }

  return formatNumber(num);
}

/**
 * Format ISK value
 */
export function formatISK(num: number): string {
  return `${formatCompact(num)} ISK`;
}

/**
 * Format volume in m³
 */
export function formatVolume(m3: number): string {
  if (m3 >= 1_000_000) {
    return `${formatNumber(m3 / 1_000_000, 2)}M m³`;
  }
  if (m3 >= 1_000) {
    return `${formatNumber(m3 / 1_000, 1)}K m³`;
  }
  return `${formatNumber(m3)} m³`;
}

/**
 * Format distance in meters/km
 */
export function formatDistance(meters: number): string {
  if (meters >= 1_000) {
    return `${formatNumber(meters / 1_000, 1)} km`;
  }
  return `${formatNumber(meters)} m`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
