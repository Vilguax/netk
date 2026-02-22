/**
 * EVE Online Clipboard Parser
 *
 * Supports multiple clipboard formats:
 * - Inventory: "Item Name\t5" or "Item Name\t5\t10 m3"
 * - Contracts: "Item Name\t5\t10 m3\t100 ISK"
 * - Cargo scan: "Item Name x5"
 * - Simple list: "5x Item Name" or "Item Name x 5"
 * - Multibuy: "Item Name 5"
 */

export interface ParsedItem {
  name: string;
  quantity: number;
  rawLine: string;
  isBlueprint: boolean;
  isBPC: boolean;        // Blueprint Copy - not on market, value = 0
  bpcRuns?: number;      // Number of runs if BPC
}

export interface ParseResult {
  items: ParsedItem[];
  totalItems: number;
  parseErrors: string[];
}

// Detect blueprint type (BPO vs BPC)
interface BlueprintInfo {
  isBlueprint: boolean;
  isBPC: boolean;
  runs?: number;
  cleanName: string;  // Name without runs info
}

function detectBlueprint(name: string): BlueprintInfo {
  const lowerName = name.toLowerCase();

  // Check if it's a blueprint
  if (!lowerName.includes("blueprint")) {
    return { isBlueprint: false, isBPC: false, cleanName: name };
  }

  // Check for BPC indicators: "(X runs)", "X runs", "(Copy)"
  // Patterns: "Blueprint (25 runs)", "Blueprint Copy", "Blueprint (Copy)"

  // Match "(X runs)" or "X runs"
  const runsMatch = name.match(/\(?\s*(\d+)\s*runs?\s*\)?/i);
  if (runsMatch) {
    const runs = parseInt(runsMatch[1], 10);
    const cleanName = name.replace(/\(?\s*\d+\s*runs?\s*\)?/i, "").trim();
    return { isBlueprint: true, isBPC: true, runs, cleanName };
  }

  // Match "Copy" indicator
  if (lowerName.includes("copy") || lowerName.includes("(copy)")) {
    const cleanName = name.replace(/\s*\(?\s*copy\s*\)?\s*/i, "").trim();
    return { isBlueprint: true, isBPC: true, cleanName };
  }

  // It's a BPO (Blueprint Original)
  return { isBlueprint: true, isBPC: false, cleanName: name };
}

// Parse European number format (1.234,56 or 1 234,56)
function parseNumber(str: string): number {
  if (!str) return 1;

  // Remove spaces used as thousand separators
  let cleaned = str.replace(/\s/g, "");

  // Handle European format: 1.234,56 -> 1234.56
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Determine which is decimal separator (last one)
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    if (lastComma > lastDot) {
      // European: dots are thousands, comma is decimal
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US: commas are thousands, dot is decimal
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    // Could be European decimal or US thousand separator
    // If there are 3 digits after comma, it's likely a thousand separator
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length === 3) {
      cleaned = cleaned.replace(",", "");
    } else {
      cleaned = cleaned.replace(",", ".");
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 1 : Math.floor(num);
}

// Try to parse a line in various formats
function parseLine(line: string): ParsedItem | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return null;

  // Skip headers and empty lines
  const lowerLine = trimmed.toLowerCase();
  if (
    lowerLine.startsWith("name") ||
    lowerLine.startsWith("type") ||
    lowerLine.startsWith("item") ||
    lowerLine === "quantity" ||
    lowerLine === "volume"
  ) {
    return null;
  }

  // Format 1: Tab-separated (Inventory, Contracts)
  // "Item Name\t5" or "Item Name\t5\t10 m3"
  if (trimmed.includes("\t")) {
    const parts = trimmed.split("\t");
    const name = parts[0].trim();
    const quantity = parseNumber(parts[1]);

    if (name && quantity > 0) {
      const bp = detectBlueprint(name);
      return {
        name: bp.cleanName,
        quantity,
        rawLine: trimmed,
        isBlueprint: bp.isBlueprint,
        isBPC: bp.isBPC,
        bpcRuns: bp.runs,
      };
    }
  }

  // Format 2: "Item Name x5" or "Item Name x 5" (Cargo scan)
  // Require at least one space before x to avoid matching items ending in x (Dominix, Onyx, etc.)
  const cargoMatch = trimmed.match(/^(.+?)\s+x\s*(\d[\d\s.,]*)\s*$/i);
  if (cargoMatch) {
    const name = cargoMatch[1].trim();
    const quantity = parseNumber(cargoMatch[2]);

    if (name && quantity > 0) {
      const bp = detectBlueprint(name);
      return {
        name: bp.cleanName,
        quantity,
        rawLine: trimmed,
        isBlueprint: bp.isBlueprint,
        isBPC: bp.isBPC,
        bpcRuns: bp.runs,
      };
    }
  }

  // Format 3: "5x Item Name" or "5 x Item Name"
  const prefixMatch = trimmed.match(/^(\d[\d\s.,]*)\s*x\s+(.+)$/i);
  if (prefixMatch) {
    const quantity = parseNumber(prefixMatch[1]);
    const name = prefixMatch[2].trim();

    if (name && quantity > 0) {
      const bp = detectBlueprint(name);
      return {
        name: bp.cleanName,
        quantity,
        rawLine: trimmed,
        isBlueprint: bp.isBlueprint,
        isBPC: bp.isBPC,
        bpcRuns: bp.runs,
      };
    }
  }

  // Format 4: "Item Name 5" (Multibuy - number at end)
  const multibuyMatch = trimmed.match(/^(.+?)\s+(\d[\d\s.,]*)$/);
  if (multibuyMatch) {
    const name = multibuyMatch[1].trim();
    const quantity = parseNumber(multibuyMatch[2]);

    // Only accept if name doesn't look like it ends with a number naturally
    // (e.g., "Tritanium" vs "Module II")
    if (name && quantity > 0 && !name.match(/\s+(I{1,3}|IV|V|VI{0,3}|IX|X)$/i)) {
      const bp = detectBlueprint(name);
      return {
        name: bp.cleanName,
        quantity,
        rawLine: trimmed,
        isBlueprint: bp.isBlueprint,
        isBPC: bp.isBPC,
        bpcRuns: bp.runs,
      };
    }
  }

  // Format 5: Just item name (quantity = 1)
  // Only if it looks like an item name (has letters, reasonable length)
  if (trimmed.match(/^[A-Za-z]/) && trimmed.length > 2 && trimmed.length < 100) {
    const bp = detectBlueprint(trimmed);
    return {
      name: bp.cleanName,
      quantity: 1,
      rawLine: trimmed,
      isBlueprint: bp.isBlueprint,
      isBPC: bp.isBPC,
      bpcRuns: bp.runs,
    };
  }

  return null;
}

// Consolidate duplicate items
// Note: BPO and BPC of same item are NOT merged (different value)
function consolidateItems(items: ParsedItem[]): ParsedItem[] {
  const itemMap = new Map<string, ParsedItem>();

  for (const item of items) {
    // Key includes BPC status to avoid merging BPO with BPC
    const bpcSuffix = item.isBPC ? ":bpc" : item.isBlueprint ? ":bpo" : "";
    const key = item.name.toLowerCase() + bpcSuffix;
    const existing = itemMap.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      // For BPCs, sum up the runs
      if (item.isBPC && item.bpcRuns && existing.bpcRuns) {
        existing.bpcRuns += item.bpcRuns;
      }
    } else {
      itemMap.set(key, { ...item });
    }
  }

  return Array.from(itemMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

// Main parse function
export function parseClipboard(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const items: ParsedItem[] = [];
  const parseErrors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = parseLine(trimmed);
    if (parsed) {
      items.push(parsed);
    } else if (trimmed.length > 2 && !trimmed.startsWith("//")) {
      // Track lines that couldn't be parsed (but aren't obviously comments/headers)
      parseErrors.push(trimmed);
    }
  }

  const consolidated = consolidateItems(items);
  const totalItems = consolidated.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items: consolidated,
    totalItems,
    parseErrors,
  };
}

// Validate that we have parseable content
export function isValidPaste(text: string): boolean {
  const result = parseClipboard(text);
  return result.items.length > 0;
}
