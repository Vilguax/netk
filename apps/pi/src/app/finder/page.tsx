"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Search, MapPin, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  type SystemsData,
  type SystemEntry,
  type ProductFeasibility,
  getSystemProductFeasibility,
  secColor,
  secLabel,
  formatSecurity,
} from "@/lib/pi-finder";
import { PLANET_TYPE_COLORS, PLANET_TYPE_LABELS, TIER_CONFIG, type PlanetType } from "@/data/pi-chains";

// ─── Types ──────────────────────────────────────────────────────────────────

type TierFilter = "all" | "P2" | "P3" | "P4";

// ─── Sub-components ─────────────────────────────────────────────────────────

function PlanetBadge({ type, count }: { type: PlanetType; count?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ background: PLANET_TYPE_COLORS[type] + "22", color: PLANET_TYPE_COLORS[type], border: `1px solid ${PLANET_TYPE_COLORS[type]}44` }}
    >
      {PLANET_TYPE_LABELS[type]}
      {count !== undefined && count > 1 && (
        <span className="opacity-70">×{count}</span>
      )}
    </span>
  );
}

function CoverageBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100);
  const color = ratio >= 1 ? "#4caf6e" : ratio >= 0.6 ? "#f59e0b" : "#e05c2a";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color, minWidth: 32 }}>{pct}%</span>
    </div>
  );
}

function ProductRow({ item, expanded, onToggle, systemPlanetTypes }: {
  item: ProductFeasibility;
  expanded: boolean;
  onToggle: () => void;
  systemPlanetTypes: Partial<Record<PlanetType, number>>;
}) {
  const tierCfg = TIER_CONFIG[item.product.tier as keyof typeof TIER_CONFIG];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${item.fullyCompatible ? "rgba(76,175,110,0.3)" : "var(--border)"}`, background: item.fullyCompatible ? "rgba(76,175,110,0.05)" : "rgba(255,255,255,0.02)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        {/* Tier badge */}
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: tierCfg.color + "22", color: tierCfg.color }}
        >
          {item.product.tier}
        </span>

        {/* Product name */}
        <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {item.product.name}
        </span>

        {/* Status icon */}
        {item.fullyCompatible
          ? <CheckCircle2 size={15} style={{ color: "#4caf6e" }} className="shrink-0" />
          : <XCircle size={15} style={{ color: "rgba(255,255,255,0.2)" }} className="shrink-0" />
        }

        {/* Coverage bar */}
        <div className="w-24 shrink-0">
          <CoverageBar ratio={item.coverageRatio} />
        </div>

        {expanded ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} className="shrink-0" /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} className="shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs pt-2" style={{ color: "var(--text-muted)" }}>Ressources P0 requises :</p>
          <div className="space-y-1">
            {item.p0Requirements.map((req) => {
              const covered = item.coveredResources.includes(req.resource.id);
              return (
                <div key={req.resource.id} className="flex items-center gap-2">
                  <span style={{ color: covered ? "#4caf6e" : "#e05c2a", fontSize: 12 }}>
                    {covered ? "✓" : "✗"}
                  </span>
                  <span className="text-xs" style={{ color: covered ? "var(--text-secondary)" : "#e05c2a", minWidth: 120 }}>
                    {req.resource.name}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {req.compatibleTypes.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: (systemPlanetTypes[t] ?? 0) > 0 ? PLANET_TYPE_COLORS[t] + "30" : "rgba(255,255,255,0.04)",
                          color: (systemPlanetTypes[t] ?? 0) > 0 ? PLANET_TYPE_COLORS[t] : "rgba(255,255,255,0.2)",
                          border: `1px solid ${(systemPlanetTypes[t] ?? 0) > 0 ? PLANET_TYPE_COLORS[t] + "50" : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        {PLANET_TYPE_LABELS[t]}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Highlight matching text ─────────────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: "var(--accent-lime)", fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function FinderPage() {
  const [systemsData, setSystemsData] = useState<SystemsData | null>(null);
  const [query, setQuery]             = useState("");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: string; sys: SystemEntry }[]>([]);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [open, setOpen]               = useState(false);
  const [tierFilter, setTierFilter]   = useState<TierFilter>("all");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const wrapperRef                    = useRef<HTMLDivElement>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);

  // Load static data
  useEffect(() => {
    fetch("/data/systems-planets.json")
      .then((r) => r.json())
      .then(setSystemsData)
      .catch(console.error);
  }, []);

  // Build suggestions on query change
  useEffect(() => {
    if (!systemsData || query.length < 1) { setSuggestions([]); setActiveIdx(-1); return; }
    const q = query.toLowerCase();
    // Prefer startsWith, then includes
    const starts = Object.entries(systemsData).filter(([, s]) => s.n.toLowerCase().startsWith(q));
    const contains = Object.entries(systemsData).filter(([, s]) => !s.n.toLowerCase().startsWith(q) && s.n.toLowerCase().includes(q));
    const matches = [...starts, ...contains].slice(0, 10).map(([id, sys]) => ({ id, sys }));
    setSuggestions(matches);
    setActiveIdx(-1);
    setOpen(true);
  }, [query, systemsData]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedSystem = selectedId && systemsData ? systemsData[selectedId] : null;

  const feasibility = useMemo<ProductFeasibility[]>(() => {
    if (!selectedSystem) return [];
    const tiers: ("P2" | "P3" | "P4")[] =
      tierFilter === "all" ? ["P2", "P3", "P4"] : [tierFilter as "P2" | "P3" | "P4"];
    return getSystemProductFeasibility(selectedSystem, tiers);
  }, [selectedSystem, tierFilter]);

  const fullCount = feasibility.filter((f) => f.fullyCompatible).length;

  const selectSystem = useCallback((id: string, sys: SystemEntry) => {
    setSelectedId(id);
    setQuery(sys.n);
    setSuggestions([]);
    setOpen(false);
    setExpandedId(null);
    inputRef.current?.blur();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = suggestions[activeIdx] ?? suggestions[0];
      if (item) selectSystem(item.id, item.sys);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && suggestions.length > 0;

  return (
    <div className="flex h-[calc(100vh-40px)]">
      <Sidebar />
      <div className="flex-1 flex flex-col" style={{ marginLeft: 224 }}>
        <Header title="Finder" subtitle="Trouvez ce que vous pouvez produire depuis un système" />

        <main className="flex-1 overflow-auto p-6 space-y-6">

          {/* System search */}
          <div ref={wrapperRef} className="relative max-w-md">
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Système de staging
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedId(null); }}
                onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                onKeyDown={handleKeyDown}
                placeholder={systemsData ? "Rechercher un système…" : "Chargement des données…"}
                disabled={!systemsData}
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${showDropdown ? "rgba(163,230,53,0.4)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                  borderBottomLeftRadius: showDropdown ? 0 : undefined,
                  borderBottomRightRadius: showDropdown ? 0 : undefined,
                  transition: "border-color 0.15s",
                }}
              />
            </div>

            {/* Suggestions dropdown */}
            {showDropdown && (
              <div
                className="absolute z-20 w-full overflow-hidden shadow-2xl"
                style={{
                  background: "rgba(8,12,20,0.98)",
                  border: "1px solid rgba(163,230,53,0.4)",
                  borderTop: "none",
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  backdropFilter: "blur(8px)",
                }}
              >
                {suggestions.map(({ id, sys }, idx) => (
                  <button
                    key={id}
                    onMouseDown={(e) => { e.preventDefault(); selectSystem(id, sys); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                    style={{
                      background: idx === activeIdx ? "rgba(163,230,53,0.08)" : "transparent",
                      borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <MapPin size={12} style={{ color: secColor(sys.s), flexShrink: 0 }} />
                    <span style={{ color: "var(--text-primary)" }}>
                      <HighlightMatch text={sys.n} query={query} />
                    </span>
                    <span className="ml-auto text-xs font-mono shrink-0" style={{ color: secColor(sys.s) }}>
                      {formatSecurity(sys.s)}
                    </span>
                    <span
                      className="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded"
                      style={{ background: secColor(sys.s) + "22", color: secColor(sys.s), fontSize: 10 }}
                    >
                      {secLabel(sys.s)}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      {Object.entries(sys.t).slice(0, 3).map(([t, cnt]) => (
                        <span
                          key={t}
                          className="w-2 h-2 rounded-full"
                          style={{ background: PLANET_TYPE_COLORS[t as PlanetType] }}
                          title={`${PLANET_TYPE_LABELS[t as PlanetType]}${(cnt ?? 1) > 1 ? ` ×${cnt}` : ""}`}
                        />
                      ))}
                      {Object.keys(sys.t).length > 3 && (
                        <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: 10 }}>+{Object.keys(sys.t).length - 3}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected system info */}
          {selectedSystem && (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <MapPin size={14} style={{ color: secColor(selectedSystem.s) }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selectedSystem.n}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: secColor(selectedSystem.s) + "22", color: secColor(selectedSystem.s) }}>
                    {formatSecurity(selectedSystem.s)} {secLabel(selectedSystem.s)}
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.entries(selectedSystem.t) as [PlanetType, number][]).map(([t, cnt]) => (
                    <PlanetBadge key={t} type={t} count={cnt} />
                  ))}
                </div>
              </div>

              {/* Tier filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Tier :</span>
                {(["all", "P2", "P3", "P4"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                    style={{
                      background: tierFilter === t ? "rgba(163,230,53,0.15)" : "rgba(255,255,255,0.04)",
                      color: tierFilter === t ? "var(--accent-lime)" : "var(--text-secondary)",
                      border: `1px solid ${tierFilter === t ? "rgba(163,230,53,0.3)" : "var(--border)"}`,
                    }}
                  >
                    {t === "all" ? "Tous" : t}
                  </button>
                ))}
                <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "#4caf6e" }}>{fullCount}</span> produits entièrement réalisables
                </span>
              </div>

              {/* Product list */}
              <div className="space-y-1.5">
                {feasibility.map((item) => (
                  <ProductRow
                    key={item.product.id}
                    item={item}
                    expanded={expandedId === item.product.id}
                    onToggle={() => setExpandedId(expandedId === item.product.id ? null : item.product.id)}
                    systemPlanetTypes={selectedSystem.t}
                  />
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!selectedSystem && systemsData && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MapPin size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Sélectionnez un système de staging
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Découvrez quels produits PI vous pouvez réaliser avec les planètes disponibles localement.
              </p>
            </div>
          )}

          {!systemsData && (
            <div className="flex items-center justify-center py-20">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement des données…</span>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
