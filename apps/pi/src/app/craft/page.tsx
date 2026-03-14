"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  P0_RESOURCES, P1_PRODUCTS, P2_PRODUCTS, P3_PRODUCTS, P4_PRODUCTS,
  ALL_PRODUCTS, PLANET_TYPE_LABELS, PLANET_TYPE_COLORS, TIER_CONFIG,
  type PlanetType,
} from "@/data/pi-chains";

// ─── Static maps built once ─────────────────────────────────────────────────

const PLANET_TYPES: PlanetType[] = ["barren", "gas", "ice", "lava", "oceanic", "plasma", "storm", "temperate"];

// productId → list of product IDs that use it as input
const USED_BY: Record<string, string[]> = {};
for (const product of Object.values(ALL_PRODUCTS)) {
  for (const input of (product.inputs ?? [])) {
    if (!USED_BY[input.productId]) USED_BY[input.productId] = [];
    USED_BY[input.productId].push(product.id);
  }
}

// Tier rank helper
function tierRank(id: string): number {
  if (id.startsWith("planet:")) return -1;
  const t = ALL_PRODUCTS[id.slice(8)]?.tier;
  return t ? parseInt(t[1]) : -1;
}

// All directed connections: planet:X → product:Y, product:A → product:B
// Only adjacent-tier connections are drawn as lines (prevents cross-column chaos)
const ALL_CONNECTIONS: { from: string; to: string }[] = [];
for (const p0 of P0_RESOURCES) {
  for (const pt of (p0.planetTypes ?? [])) {
    ALL_CONNECTIONS.push({ from: `planet:${pt}`, to: `product:${p0.id}` });
  }
}
for (const product of Object.values(ALL_PRODUCTS)) {
  for (const input of (product.inputs ?? [])) {
    ALL_CONNECTIONS.push({ from: `product:${input.productId}`, to: `product:${product.id}` });
  }
}

// Only connections between adjacent tiers get lines drawn
const DRAWABLE_CONNECTIONS = ALL_CONNECTIONS.filter(c => {
  const delta = tierRank(c.to) - tierRank(c.from);
  return delta === 1;
});

// ─── Relevance computation ───────────────────────────────────────────────────

function cascadeDown(productId: string, out: Set<string>) {
  const product = ALL_PRODUCTS[productId];
  if (!product) return;
  if (product.tier === "P0") {
    for (const pt of (product.planetTypes ?? [])) out.add(`planet:${pt}`);
    return;
  }
  for (const input of (product.inputs ?? [])) {
    if (!out.has(`product:${input.productId}`)) {
      out.add(`product:${input.productId}`);
      cascadeDown(input.productId, out);
    }
  }
}

function cascadeUp(productId: string, out: Set<string>) {
  for (const userId of (USED_BY[productId] ?? [])) {
    if (!out.has(`product:${userId}`)) {
      out.add(`product:${userId}`);
      cascadeUp(userId, out);
    }
  }
}

function getRelevant(selected: string | null): Set<string> {
  if (!selected) return new Set();
  const out = new Set<string>([selected]);

  if (selected.startsWith("planet:")) {
    const pt = selected.slice(7) as PlanetType;
    for (const p0 of P0_RESOURCES) {
      if (p0.planetTypes?.includes(pt)) {
        out.add(`product:${p0.id}`);
        cascadeUp(p0.id, out);
      }
    }
  } else {
    const id = selected.slice(8);
    cascadeDown(id, out);
  }
  return out;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PlanetCell({ type, selected, relevant, onClick, setRef }: {
  type: PlanetType;
  selected: boolean;
  relevant: boolean;
  onClick: () => void;
  setRef: (el: HTMLElement | null) => void;
}) {
  const color = PLANET_TYPE_COLORS[type];
  return (
    <button
      ref={setRef as (el: HTMLButtonElement | null) => void}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer"
      style={{
        background: selected ? `${color}22` : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? color + "80" : "rgba(255,255,255,0.07)"}`,
        opacity: !relevant ? 0.2 : 1,
        boxShadow: selected ? `0 0 8px ${color}40` : "none",
      }}
    >
      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs font-medium truncate" style={{ color: selected ? color : "var(--text-secondary)" }}>
        {PLANET_TYPE_LABELS[type]}
      </span>
    </button>
  );
}

function ProductCell({ id, name, tier, selected, relevant, onClick, setRef }: {
  id: string; name: string; tier: string;
  selected: boolean; relevant: boolean;
  onClick: () => void;
  setRef: (el: HTMLElement | null) => void;
}) {
  const color = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.color ?? "#64748b";
  return (
    <button
      ref={setRef as (el: HTMLButtonElement | null) => void}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer"
      style={{
        background: selected ? `${color}1a` : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? color + "70" : "rgba(255,255,255,0.07)"}`,
        opacity: !relevant ? 0.15 : 1,
        boxShadow: selected ? `0 0 8px ${color}30` : "none",
      }}
    >
      <div
        className="w-4 h-4 rounded shrink-0 flex items-center justify-center text-[8px] font-bold"
        style={{ background: `${color}22`, color }}
      >
        {tier}
      </div>
      <span className="text-xs truncate" style={{ color: selected ? color : "var(--text-secondary)" }}>
        {name}
      </span>
    </button>
  );
}

function Column({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0" style={{ minWidth: 185 }}>
      <div className="mb-2 pb-2" style={{ borderBottom: `1px solid ${color}40` }}>
        <span className="text-xs font-semibold tracking-wide uppercase" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CraftPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(true);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; key: string; color: string }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setCellRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) cellRefs.current.set(id, el);
    else cellRefs.current.delete(id);
  }, []);

  const relevant = useMemo(() => getRelevant(selected), [selected]);

  const relevantConnections = useMemo(() => {
    if (!selected) return [];
    return DRAWABLE_CONNECTIONS.filter(c => relevant.has(c.from) && relevant.has(c.to));
  }, [selected, relevant]);

  const computeLines = useCallback(() => {
    if (!showLines || !selected || !containerRef.current) { setLines([]); return; }
    const cr = containerRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];
    for (const conn of relevantConnections) {
      const fromEl = cellRefs.current.get(conn.from);
      const toEl   = cellRefs.current.get(conn.to);
      if (!fromEl || !toEl) continue;
      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();
      // Color by target tier
      const toId = conn.to.startsWith("product:") ? conn.to.slice(8) : null;
      const tier = toId ? (ALL_PRODUCTS[toId]?.tier ?? "P0") : "P0";
      const color = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.color ?? "#64748b";
      newLines.push({
        x1: fr.right  - cr.left,
        y1: fr.top + fr.height / 2 - cr.top,
        x2: tr.left   - cr.left,
        y2: tr.top + tr.height / 2 - cr.top,
        key: `${conn.from}→${conn.to}`,
        color,
      });
    }
    setLines(newLines);
  }, [showLines, selected, relevantConnections]);

  useEffect(() => {
    computeLines();
    window.addEventListener("resize", computeLines, { passive: true });
    return () => window.removeEventListener("resize", computeLines);
  }, [computeLines]);

  // Recompute lines on scroll (positions are viewport-relative)
  useEffect(() => {
    window.addEventListener("scroll", computeLines, { passive: true });
    return () => window.removeEventListener("scroll", computeLines);
  }, [computeLines]);

  function toggle(id: string) { setSelected(prev => prev === id ? null : id); }
  const isRelevant = (id: string) => !selected || relevant.has(id);

  const columns = [
    { key: "p0", title: "P0", color: TIER_CONFIG.P0.color, products: P0_RESOURCES },
    { key: "p1", title: "P1", color: TIER_CONFIG.P1.color, products: P1_PRODUCTS },
    { key: "p2", title: "P2", color: TIER_CONFIG.P2.color, products: P2_PRODUCTS },
    { key: "p3", title: "P3", color: TIER_CONFIG.P3.color, products: P3_PRODUCTS },
    { key: "p4", title: "P4", color: TIER_CONFIG.P4.color, products: P4_PRODUCTS.filter(p => p.inputs?.length) },
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header title="Craft" subtitle="Visualiseur de chaînes PI" />

        <div className="p-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {selected
                ? `Arbre : ${selected.replace("planet:", "").replace("product:", "").replaceAll("_", " ")}`
                : "Cliquez sur un élément pour afficher son arbre de production"}
            </p>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                className="w-4 h-4 rounded flex items-center justify-center cursor-pointer"
                style={{ background: showLines ? "rgba(163,230,53,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${showLines ? "rgba(163,230,53,0.5)" : "rgba(255,255,255,0.15)"}` }}
                onClick={() => setShowLines(v => !v)}
              >
                {showLines && <div className="w-2 h-2 rounded-sm" style={{ background: "var(--accent-lime)" }} />}
              </div>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Draw connections</span>
            </label>
          </div>

          {/* Grid */}
          <div className="relative" ref={containerRef} onClick={() => setSelected(null)}>
            {/* SVG overlay for connection lines */}
            {showLines && selected && lines.length > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%", zIndex: 10, overflow: "visible" }}
              >
                {lines.map(l => {
                  const cx = (l.x1 + l.x2) / 2;
                  return (
                    <path
                      key={l.key}
                      d={`M ${l.x1},${l.y1} C ${cx},${l.y1} ${cx},${l.y2} ${l.x2},${l.y2}`}
                      stroke={l.color}
                      strokeWidth={1.5}
                      strokeOpacity={0.5}
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
            )}

            <div className="flex gap-10 overflow-x-auto pb-4">
              {/* Planets column */}
              <Column title="Planets" color="#94a3b8">
                {PLANET_TYPES.map(pt => (
                  <PlanetCell
                    key={pt}
                    type={pt}
                    selected={selected === `planet:${pt}`}
                    relevant={isRelevant(`planet:${pt}`)}
                    onClick={() => toggle(`planet:${pt}`)}
                    setRef={setCellRef(`planet:${pt}`)}
                  />
                ))}
              </Column>

              {/* P0 → P4 columns */}
              {columns.map(col => (
                <Column key={col.key} title={`${col.title} Materials`} color={col.color}>
                  {col.products.map(p => (
                    <ProductCell
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      tier={p.tier}
                      selected={selected === `product:${p.id}`}
                      relevant={isRelevant(`product:${p.id}`)}
                      onClick={() => toggle(`product:${p.id}`)}
                      setRef={setCellRef(`product:${p.id}`)}
                    />
                  ))}
                </Column>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
