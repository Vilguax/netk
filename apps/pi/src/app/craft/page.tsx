"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  P0_RESOURCES, P1_PRODUCTS, P2_PRODUCTS, P3_PRODUCTS, P4_PRODUCTS,
  ALL_PRODUCTS, PLANET_TYPE_LABELS, PLANET_TYPE_COLORS, TIER_CONFIG,
  getRequiredPlanetTypes,
  type PlanetType,
} from "@/data/pi-chains";

// ─── Static maps built once ──────────────────────────────────────────────────

const PLANET_TYPES: PlanetType[] = ["barren", "gas", "ice", "lava", "oceanic", "plasma", "storm", "temperate"];

// productId → list of product IDs that use it as input
const USED_BY: Record<string, string[]> = {};
for (const product of Object.values(ALL_PRODUCTS)) {
  for (const input of (product.inputs ?? [])) {
    if (!USED_BY[input.productId]) USED_BY[input.productId] = [];
    USED_BY[input.productId].push(product.id);
  }
}

function tierRank(id: string): number {
  if (id.startsWith("planet:")) return -1;
  const t = ALL_PRODUCTS[id.slice(8)]?.tier;
  return t ? parseInt(t[1]) : -1;
}

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

const DRAWABLE_CONNECTIONS = ALL_CONNECTIONS.filter(c => {
  const delta = tierRank(c.to) - tierRank(c.from);
  return delta === 1;
});

// ─── Relevance ───────────────────────────────────────────────────────────────

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

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ selected, onClose }: { selected: string; onClose: () => void }) {
  const panelStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minHeight: 200,
  };

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    marginBottom: 2,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-secondary)",
  };

  // ── Planet panel ──
  if (selected.startsWith("planet:")) {
    const pt = selected.slice(7) as PlanetType;
    const color = PLANET_TYPE_COLORS[pt];
    const p0s = P0_RESOURCES.filter(p => p.planetTypes?.includes(pt));
    const p1s = P1_PRODUCTS.filter(p => p.inputs?.some(i => p0s.some(p0 => p0.id === i.productId)));
    return (
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Planète</div>
            <div style={{ fontSize: 15, fontWeight: 600, color }}>{PLANET_TYPE_LABELS[pt]}</div>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none", padding: 0, lineHeight: 0 }}>
            <X size={14} />
          </button>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Ressources P0</div>
          {p0s.map(p0 => (
            <div key={p0.id} style={{ ...rowStyle }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: TIER_CONFIG.P0.color, flexShrink: 0 }} />
              {p0.name}
            </div>
          ))}
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Produits P1 accessibles</div>
          {p1s.map(p1 => (
            <div key={p1.id} style={{ ...rowStyle }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: TIER_CONFIG.P1.color, flexShrink: 0 }} />
              {p1.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Product panel ──
  const id = selected.slice(8);
  const product = ALL_PRODUCTS[id];
  if (!product) return null;

  const color = TIER_CONFIG[product.tier as keyof typeof TIER_CONFIG]?.color ?? "#64748b";
  const usedBy = (USED_BY[id] ?? []).map(uid => ALL_PRODUCTS[uid]).filter(Boolean);
  const planetTypes = (product.tier === "P2" || product.tier === "P3" || product.tier === "P4")
    ? getRequiredPlanetTypes(id)
    : null;

  // Factory setup hint
  const factoryHint =
    product.tier === "P4" ? "6 HTPP + 1 Launchpad (Barren/Temperate)" :
    product.tier === "P3" ? "8 AIF + 1 Launchpad" :
    product.tier === "P2" ? "1–2 AIF sur planète extractrice" : null;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color, background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 4, padding: "1px 6px" }}>
              {product.tier}
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
            {product.name}
          </div>
        </div>
        <button onClick={onClose} style={{ color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none", padding: 0, lineHeight: 0, flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>

      {/* Volume */}
      {product.volume != null && (
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Volume : {product.volume} m³/unité
        </div>
      )}

      {/* P0 sources */}
      {product.tier === "P0" && product.planetTypes && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Planètes sources</div>
          {product.planetTypes.map(pt => (
            <div key={pt} style={{ ...rowStyle }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: PLANET_TYPE_COLORS[pt], flexShrink: 0 }} />
              <span style={{ color: PLANET_TYPE_COLORS[pt] }}>{PLANET_TYPE_LABELS[pt]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recipe */}
      {product.inputs && product.inputs.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Recette (par cycle)</div>
          {product.inputs.map(inp => {
            const p = ALL_PRODUCTS[inp.productId];
            const c = TIER_CONFIG[p?.tier as keyof typeof TIER_CONFIG]?.color ?? "#64748b";
            return (
              <div key={inp.productId} style={{ ...rowStyle }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c, minWidth: 32 }}>×{inp.quantity}</div>
                <span>{p?.name ?? inp.productId}</span>
              </div>
            );
          })}
          <div style={{ ...rowStyle, marginTop: 4, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32 }}>→{product.outputQty ?? 1}</div>
            <span style={{ color }}>{product.name}</span>
          </div>
        </div>
      )}

      {/* Used in */}
      {usedBy.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Utilisé dans</div>
          {usedBy.map(p => {
            const c = TIER_CONFIG[p.tier as keyof typeof TIER_CONFIG]?.color ?? "#64748b";
            return (
              <div key={p.id} style={{ ...rowStyle }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}30`, borderRadius: 3, padding: "1px 4px", flexShrink: 0 }}>{p.tier}</div>
                <span>{p.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Planning (P2+) */}
      {planetTypes && planetTypes.size > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Planification</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {[...planetTypes].map(pt => (
              <div key={pt} style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 99,
                background: `${PLANET_TYPE_COLORS[pt]}18`,
                border: `1px solid ${PLANET_TYPE_COLORS[pt]}40`,
                color: PLANET_TYPE_COLORS[pt],
              }}>
                {PLANET_TYPE_LABELS[pt]}
              </div>
            ))}
          </div>
          {factoryHint && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
              Usine : {factoryHint}
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {planetTypes.size} planète{planetTypes.size > 1 ? "s" : ""} extractrice{planetTypes.size > 1 ? "s" : ""} min.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cell components ─────────────────────────────────────────────────────────

function PlanetCell({ type, selected, relevant, onClick, setRef }: {
  type: PlanetType; selected: boolean; relevant: boolean;
  onClick: () => void; setRef: (el: HTMLElement | null) => void;
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
  onClick: () => void; setRef: (el: HTMLElement | null) => void;
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

// ─── Line type ────────────────────────────────────────────────────────────────

type Line = { x1: number; y1: number; x2: number; y2: number; key: string; color: string; qty?: number };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CraftPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);

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
    const newLines: Line[] = [];
    for (const conn of relevantConnections) {
      const fromEl = cellRefs.current.get(conn.from);
      const toEl   = cellRefs.current.get(conn.to);
      if (!fromEl || !toEl) continue;
      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();
      const toId = conn.to.startsWith("product:") ? conn.to.slice(8) : null;
      const fromId = conn.from.startsWith("product:") ? conn.from.slice(8) : null;
      const tier = toId ? (ALL_PRODUCTS[toId]?.tier ?? "P0") : "P0";
      const color = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.color ?? "#64748b";
      // Look up quantity: how much of `from` does `to` need per cycle
      const qty = toId && fromId
        ? ALL_PRODUCTS[toId]?.inputs?.find(i => i.productId === fromId)?.quantity
        : undefined;
      newLines.push({
        x1: fr.right  - cr.left, y1: fr.top + fr.height / 2 - cr.top,
        x2: tr.left   - cr.left, y2: tr.top + tr.height / 2 - cr.top,
        key: `${conn.from}→${conn.to}`,
        color, qty,
      });
    }
    setLines(newLines);
  }, [showLines, selected, relevantConnections]);

  useEffect(() => {
    computeLines();
    window.addEventListener("resize", computeLines, { passive: true });
    return () => window.removeEventListener("resize", computeLines);
  }, [computeLines]);

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

        <div className="p-6 flex gap-5 items-start">
          {/* Main grid */}
          <div className="flex-1 min-w-0">
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
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Connexions</span>
              </label>
            </div>

            {/* Grid with SVG overlay */}
            <div className="relative" ref={containerRef} onClick={() => setSelected(null)}>
              {showLines && selected && lines.length > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: "100%", height: "100%", zIndex: 10, overflow: "visible" }}
                >
                  {lines.map(l => {
                    const cx = (l.x1 + l.x2) / 2;
                    const midX = cx;
                    const midY = (l.y1 + l.y2) / 2;
                    return (
                      <g key={l.key}>
                        <path
                          d={`M ${l.x1},${l.y1} C ${cx},${l.y1} ${cx},${l.y2} ${l.x2},${l.y2}`}
                          stroke={l.color}
                          strokeWidth={1.5}
                          strokeOpacity={0.5}
                          fill="none"
                          strokeLinecap="round"
                        />
                        {l.qty != null && (
                          <>
                            <rect
                              x={midX - 14} y={midY - 8}
                              width={28} height={14}
                              rx={3}
                              fill="var(--bg)"
                              fillOpacity={0.75}
                            />
                            <text
                              x={midX} y={midY + 4}
                              textAnchor="middle"
                              fontSize={9}
                              fontWeight={600}
                              fill={l.color}
                              fillOpacity={0.9}
                              style={{ fontFamily: "monospace" }}
                            >
                              ×{l.qty}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}

              <div className="flex gap-10 overflow-x-auto pb-4">
                <Column title="Planets" color="#94a3b8">
                  {PLANET_TYPES.map(pt => (
                    <PlanetCell
                      key={pt} type={pt}
                      selected={selected === `planet:${pt}`}
                      relevant={isRelevant(`planet:${pt}`)}
                      onClick={() => toggle(`planet:${pt}`)}
                      setRef={setCellRef(`planet:${pt}`)}
                    />
                  ))}
                </Column>

                {columns.map(col => (
                  <Column key={col.key} title={`${col.title} Materials`} color={col.color}>
                    {col.products.map(p => (
                      <ProductCell
                        key={p.id} id={p.id} name={p.name} tier={p.tier}
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

          {/* Detail panel */}
          {selected && (
            <div style={{ width: 256, flexShrink: 0 }}>
              <DetailPanel selected={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
