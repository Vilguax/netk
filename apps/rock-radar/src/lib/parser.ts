import { SurveyRock, SurveyScan, ORE_VOLUMES } from "@netk/types";

/**
 * Parse EVE Survey Scanner clipboard data
 *
 * Format: "Ore Name\tVolume m³\tDistance m" (tab-separated)
 * Example:
 *   Veldspar	15 000 m3	2 500 m
 *   Scordite	8 500 m3	3 200 m
 */
export function parseSurveyScan(clipboardText: string): SurveyScan | null {
  const lines = clipboardText
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return null;
  }

  const rocks: SurveyRock[] = [];

  for (const line of lines) {
    const rock = parseRockLine(line);
    if (rock) {
      rocks.push(rock);
    }
  }

  if (rocks.length === 0) {
    return null;
  }

  const totalVolume = rocks.reduce((sum, rock) => sum + rock.volume, 0);

  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    rocks,
    totalVolume,
  };
}

/**
 * Parse a single line from survey scanner
 * Handles various number formats (spaces, commas, dots as separators)
 */
function parseRockLine(line: string): SurveyRock | null {
  // Split by tab
  const parts = line.split("\t").map((p) => p.trim());

  if (parts.length < 3) {
    // Try splitting by multiple spaces if tabs don't work
    const spaceParts = line.split(/\s{2,}/).map((p) => p.trim());
    if (spaceParts.length >= 3) {
      parts.length = 0;
      parts.push(...spaceParts);
    }
  }

  if (parts.length < 3) {
    return null;
  }

  const oreName = parts[0];
  const oreInfo = ORE_VOLUMES[oreName];
  const typeId = oreInfo?.typeId || 0;
  const volumePerUnit = oreInfo?.volumePerUnit || 0.1;

  // Detect 5-column format: Name | Qty | Volume m3 | ISK value | Distance
  const isFiveColumn = parts.length >= 5 && parts[3].toUpperCase().includes("ISK");

  let volume: number;
  let distanceStr: string;
  let quantity: number;

  let iskValue: number | undefined;

  if (isFiveColumn) {
    // Use raw integer qty from col 1 to avoid French locale dot-as-thousand-separator issues
    const rawQty = parseInt(parts[1].replace(/\s/g, ""), 10);
    if (!isNaN(rawQty) && rawQty > 0 && oreInfo) {
      quantity = rawQty;
      volume = rawQty * volumePerUnit;
    } else {
      const parsedVol = parseEveNumber(parts[2].replace(/m[³3]/i, "").trim());
      if (parsedVol === null || parsedVol <= 0) return null;
      volume = parsedVol;
      quantity = Math.floor(volume / volumePerUnit);
    }
    distanceStr = parts[4];
    // Extract ISK value from column 3 (e.g. "16.700.000,00 ISK")
    const iskStr = parts[3].toUpperCase().replace("ISK", "").trim();
    const parsedIsk = parseEveNumber(iskStr);
    if (parsedIsk !== null && parsedIsk > 0) {
      iskValue = parsedIsk;
    }
  } else {
    // 3-column format: Name | Volume m3 | Distance
    const parsedVol = parseEveNumber(parts[1].replace(/m[³3]/i, "").trim());
    if (parsedVol === null || parsedVol <= 0) return null;
    volume = parsedVol;
    quantity = Math.floor(volume / volumePerUnit);
    distanceStr = parts[2];
  }

  // Parse distance (remove "m", "km" and convert to meters)
  let distance = 0;
  if (distanceStr.toLowerCase().includes("km")) {
    const km = parseEveNumber(distanceStr.replace(/km/i, "").trim());
    distance = km !== null ? km * 1000 : 0;
  } else {
    distance = parseEveNumber(distanceStr.replace(/m/i, "").trim()) || 0;
  }

  return {
    id: crypto.randomUUID(),
    oreName,
    typeId,
    volume,
    distance,
    quantity,
    ...(iskValue !== undefined && { iskValue }),
  };
}

/**
 * Parse EVE number formats
 * Handles: "15 000", "15,000", "15.000", "15000"
 */
function parseEveNumber(str: string): number | null {
  if (!str) return null;

  // Remove all spaces and replace comma/space separators
  // EVE uses spaces as thousand separators in some locales
  const cleaned = str
    .replace(/\s/g, "") // Remove spaces
    .replace(/,/g, "."); // Replace comma with dot for decimal

  // If there are multiple dots, assume first ones are thousand separators
  const dotParts = cleaned.split(".");
  if (dotParts.length > 2) {
    // Multiple dots: join all but last as integer, last as decimal
    const intPart = dotParts.slice(0, -1).join("");
    const decPart = dotParts[dotParts.length - 1];
    const num = parseFloat(`${intPart}.${decPart}`);
    return isNaN(num) ? null : num;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Check if clipboard text looks like survey scanner data
 */
export function isSurveyScanData(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Must have at least one known ore name
  const knownOres = Object.keys(ORE_VOLUMES);
  const hasKnownOre = knownOres.some((ore) =>
    text.toLowerCase().includes(ore.toLowerCase())
  );

  // Must have volume indicator (m3 or m³)
  const hasVolume = /m[³3]/i.test(text);

  return hasKnownOre && hasVolume;
}

/**
 * Group rocks by ore type and sum volumes
 */
export function groupRocksByOre(
  rocks: SurveyRock[]
): Map<string, { totalVolume: number; totalQuantity: number; count: number }> {
  const grouped = new Map<
    string,
    { totalVolume: number; totalQuantity: number; count: number }
  >();

  for (const rock of rocks) {
    const existing = grouped.get(rock.oreName) || {
      totalVolume: 0,
      totalQuantity: 0,
      count: 0,
    };

    grouped.set(rock.oreName, {
      totalVolume: existing.totalVolume + rock.volume,
      totalQuantity: existing.totalQuantity + rock.quantity,
      count: existing.count + 1,
    });
  }

  return grouped;
}
