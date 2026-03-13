// PI System Finder — utilities for finding compatible systems per product
// Uses static data from /public/data/systems-planets.json

import { ALL_PRODUCTS, P1_PRODUCTS, buildChain, type PlanetType, type PIProduct, type ChainNode } from "@/data/pi-chains";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SystemEntry {
  n: string;          // system name
  s: number;          // security status
  r: number;          // regionID
  x: number;          // coordinate (divided by 1e13)
  y: number;
  z: number;
  t: PlanetType[];    // planet types present
}

export type SystemsData = Record<string, SystemEntry>;

// Per-P0 resource requirement with its compatible planet types
export interface P0Requirement {
  resource: PIProduct;
  compatibleTypes: PlanetType[];
}

// Coverage result for one system against a product
export interface SystemCoverage {
  systemId: string;
  name: string;
  security: number;
  regionId: number;
  planetTypes: PlanetType[];
  coveredResources: string[];    // P0 resource IDs covered
  missingResources: string[];    // P0 resource IDs missing
  coverageRatio: number;         // 0-1
  fullyCompatible: boolean;
  distance?: number;             // Euclidean distance from reference system (arbitrary units)
}

// ─── P0 chain resolution ────────────────────────────────────────────────────

// P0 → P1 mapping (each P1 has exactly one P0 input)
const P0_TO_P1: Record<string, PIProduct> = Object.fromEntries(
  P1_PRODUCTS
    .filter((p1) => p1.inputs?.length === 1)
    .map((p1) => [p1.inputs![0].productId, p1])
);

export interface ExtractionRole {
  p0: PIProduct;          // raw resource (P0)
  p1: PIProduct;          // basic commodity (P1)
  planetTypes: PlanetType[];
}

export interface ProductionPlan {
  extractions: ExtractionRole[];   // one per unique P0 resource needed
  finalProduct: PIProduct;
  minPlanetsPerChar: number;       // minimum planets for a self-sufficient setup
}

/** Builds a production plan: extraction roles + assembly info for a given product. */
export function getProductionPlan(productId: string): ProductionPlan | null {
  const product = ALL_PRODUCTS[productId];
  if (!product || product.tier === "P0" || product.tier === "P1") return null;

  const p0Reqs = getP0Requirements(productId);
  const extractions = p0Reqs
    .map((req): ExtractionRole | null => {
      const p1 = P0_TO_P1[req.resource.id];
      if (!p1) return null;
      return { p0: req.resource, p1, planetTypes: req.compatibleTypes };
    })
    .filter((r): r is ExtractionRole => r !== null);

  const tierDepth = product.tier === "P2" ? 1 : product.tier === "P3" ? 2 : 3;
  const minPlanetsPerChar = extractions.length + tierDepth;
  return { extractions, finalProduct: product, minPlanetsPerChar };
}

/** Returns the deduplicated P0 resources needed to produce a given product. */
export function getP0Requirements(productId: string): P0Requirement[] {
  let chain: ChainNode;
  try {
    chain = buildChain(productId);
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const reqs: P0Requirement[] = [];

  function walk(node: ChainNode) {
    if (node.product.tier === "P0") {
      if (!seen.has(node.product.id)) {
        seen.add(node.product.id);
        reqs.push({
          resource: node.product,
          compatibleTypes: node.product.planetTypes ?? [],
        });
      }
      return;
    }
    node.children.forEach(walk);
  }

  walk(chain);
  return reqs;
}

// ─── System coverage check ──────────────────────────────────────────────────

/**
 * Given a system's planet types and the P0 requirements for a product,
 * returns which resources are covered and which are missing.
 */
export function checkSystemCoverage(
  systemPlanetTypes: PlanetType[],
  p0Requirements: P0Requirement[],
): { covered: string[]; missing: string[] } {
  const sysTypes = new Set(systemPlanetTypes);
  const covered: string[] = [];
  const missing: string[] = [];

  for (const req of p0Requirements) {
    const hasCoverage = req.compatibleTypes.some((t) => sysTypes.has(t));
    if (hasCoverage) {
      covered.push(req.resource.id);
    } else {
      missing.push(req.resource.id);
    }
  }

  return { covered, missing };
}

// ─── System search ──────────────────────────────────────────────────────────

export type SecurityFilter = "all" | "highsec" | "lowsec" | "nullsec";

function matchesSecurity(sec: number, filter: SecurityFilter): boolean {
  if (filter === "all") return true;
  if (filter === "highsec") return sec >= 0.45;
  if (filter === "lowsec") return sec >= 0.1 && sec < 0.45;
  if (filter === "nullsec") return sec < 0.1;
  return true;
}

function euclideanDist(a: SystemEntry, b: SystemEntry): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Find systems compatible with a given product.
 * If referenceSystemId is provided, sorts by proximity to that system.
 * Otherwise sorts by: fully compatible first, coverage ratio, then security.
 */
export function findCompatibleSystems(
  data: SystemsData,
  productId: string,
  options: {
    filter?: SecurityFilter;
    limit?: number;
    onlyFull?: boolean;
    referenceSystemId?: string;
  } = {},
): SystemCoverage[] {
  const { filter = "all", limit = 50, onlyFull = false, referenceSystemId } = options;
  const p0Reqs = getP0Requirements(productId);

  if (p0Reqs.length === 0) return [];

  const refSys = referenceSystemId ? data[referenceSystemId] : null;

  const results: SystemCoverage[] = [];

  for (const [id, sys] of Object.entries(data)) {
    if (!matchesSecurity(sys.s, filter)) continue;

    const { covered, missing } = checkSystemCoverage(sys.t, p0Reqs);
    const ratio = covered.length / p0Reqs.length;
    const full = missing.length === 0;

    if (onlyFull && !full) continue;

    results.push({
      systemId: id,
      name: sys.n,
      security: sys.s,
      regionId: sys.r,
      planetTypes: sys.t,
      coveredResources: covered,
      missingResources: missing,
      coverageRatio: ratio,
      fullyCompatible: full,
      distance: refSys ? euclideanDist(sys, refSys) : undefined,
    });
  }

  if (refSys) {
    // Sort by distance from reference system (closest first)
    results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  } else {
    results.sort((a, b) => {
      if (a.fullyCompatible !== b.fullyCompatible) return a.fullyCompatible ? -1 : 1;
      if (a.coverageRatio !== b.coverageRatio) return b.coverageRatio - a.coverageRatio;
      return b.security - a.security;
    });
  }

  return results.slice(0, limit);
}

// ─── Reverse finder: given a system, which products are producible? ──────────

export interface ProductFeasibility {
  product: PIProduct;
  p0Requirements: P0Requirement[];
  coveredResources: string[];
  missingResources: string[];
  coverageRatio: number;
  fullyCompatible: boolean;
}

/**
 * Given a system, compute feasibility for every P2/P3/P4 product.
 * Returns sorted: fully compatible first, then by coverage ratio.
 */
export function getSystemProductFeasibility(
  system: SystemEntry,
  tiers: ("P2" | "P3" | "P4")[] = ["P2", "P3", "P4"],
): ProductFeasibility[] {
  const results: ProductFeasibility[] = [];

  for (const product of Object.values(ALL_PRODUCTS)) {
    if (!tiers.includes(product.tier as "P2" | "P3" | "P4")) continue;

    const p0Reqs = getP0Requirements(product.id);
    if (p0Reqs.length === 0) continue;

    const { covered, missing } = checkSystemCoverage(system.t, p0Reqs);

    results.push({
      product,
      p0Requirements: p0Reqs,
      coveredResources: covered,
      missingResources: missing,
      coverageRatio: covered.length / p0Reqs.length,
      fullyCompatible: missing.length === 0,
    });
  }

  results.sort((a, b) => {
    if (a.fullyCompatible !== b.fullyCompatible) return a.fullyCompatible ? -1 : 1;
    return b.coverageRatio - a.coverageRatio;
  });

  return results;
}

// ─── Security display helpers ────────────────────────────────────────────────

export function secColor(sec: number): string {
  if (sec >= 0.45) return "#4caf6e";   // highsec — green
  if (sec >= 0.1)  return "#f59e0b";   // lowsec — amber
  return "#e05c2a";                     // nullsec — red
}

export function secLabel(sec: number): string {
  if (sec >= 0.45) return "HS";
  if (sec >= 0.1)  return "LS";
  return "NS";
}

export function formatSecurity(sec: number): string {
  return sec.toFixed(1);
}
