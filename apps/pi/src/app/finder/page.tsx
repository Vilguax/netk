"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Search, MapPin, CheckCircle2, XCircle, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import {
  type SystemsData,
  type SystemEntry,
  type ProductFeasibility,
  getSystemProductFeasibility,
  secColor,
  secLabel,
  formatSecurity,
  type SecurityFilter,
} from "@/lib/pi-finder";
import { PLANET_TYPE_COLORS, PLANET_TYPE_LABELS, TIER_CONFIG, type PlanetType } from "@/data/pi-chains";

// ─── Types ───────────────────────────────────────────────────────────────────

type TierFilter = "all" | "P2" | "P3" | "P4";
type SortMode  = "coverage" | "tier" | "alpha";

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlanetBadge({ type, count }: { type: PlanetType; count?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{
        background: PLANET_TYPE_COLORS[type] + "22",
        color: PLANET_TYPE_COLORS[type],
        border: `1px solid ${PLANET_TYPE_COLORS[type]}44`,
      }}
    >
      {PLANET_TYPE_LABELS[type]}
      {count !== undefined && count > 1 && <span className="opacity-70">×{count}</span>}
    </span>
  );
}

function CoverageBar({ ratio }: { ratio: number }) {
  const pct   = Math.round(ratio * 100);
  const color = ratio >= 1 ? "#4caf6e" : ratio >= 0.6 ? "#f59e0b" : "#e05c2a";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums shrink-0" style={{ color, minWidth: 32 }}>{pct}%</span>
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

  // Missing planet types (for incomplete products — shown inline without expanding)
  const missingTypes = item.missingResources.length > 0
    ? [...new Set(
        item.missingResources.flatMap(resId => {
          const req = item.p0Requirements.find(r => r.resource.id === resId);
          return req?.compatibleTypes ?? [];
        }).filter(t => !(systemPlanetTypes[t] ?? 0))
      )]
    : [];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${item.fullyCompatible ? "rgba(76,175,110,0.3)" : "var(--border)"}`,
        background: item.fullyCompatible ? "rgba(76,175,110,0.04)" : "rgba(255,255,255,0.02)",
      }}
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

        {/* Product name + missing hint */}
        <span className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate" style={{ color: "var(--text-primary)" }}>
            {item.product.name}
          </span>
          {missingTypes.length > 0 && !expanded && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Manque :{" "}
              {missingTypes.map((t, i) => (
                <span key={t} style={{ color: PLANET_TYPE_COLORS[t] }}>
                  {PLANET_TYPE_LABELS[t]}{i < missingTypes.length - 1 ? ", " : ""}
                </span>
              ))}
            </span>
          )}
        </span>

        {/* Status icon */}
        {item.fullyCompatible
          ? <CheckCircle2 size={15} style={{ color: "#4caf6e" }} className="shrink-0" />
          : <XCircle     size={15} style={{ color: "rgba(255,255,255,0.2)" }} className="shrink-0" />
        }

        {/* Coverage bar */}
        <div className="w-24 shrink-0 hidden sm:block">
          <CoverageBar ratio={item.coverageRatio} />
        </div>

        {expanded
          ? <ChevronUp   size={14} style={{ color: "var(--text-muted)" }} className="shrink-0" />
          : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} className="shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Coverage bar on mobile (hidden above) */}
          <div className="pt-2 sm:hidden">
            <CoverageBar ratio={item.coverageRatio} />
          </div>
          <p className="text-xs pt-2" style={{ color: "var(--text-muted)" }}>Ressources P0 requises :</p>
          <div className="space-y-1">
            {item.p0Requirements.map((req) => {
              const covered = item.coveredResources.includes(req.resource.id);
              return (
                <div key={req.resource.id} className="flex items-center gap-2 flex-wrap">
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
                          color:      (systemPlanetTypes[t] ?? 0) > 0 ? PLANET_TYPE_COLORS[t] : "rgba(255,255,255,0.2)",
                          border:     `1px solid ${(systemPlanetTypes[t] ?? 0) > 0 ? PLANET_TYPE_COLORS[t] + "50" : "rgba(255,255,255,0.08)"}`,
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

// ─── Stats bar ───────────────────────────────────────────────────────────────

function StatsBar({ feasibility }: { feasibility: ProductFeasibility[] }) {
  const counts = { P2: 0, P3: 0, P4: 0 };
  const totals = { P2: 0, P3: 0, P4: 0 };
  for (const f of feasibility) {
    const t = f.product.tier as "P2" | "P3" | "P4";
    if (!(t in counts)) continue;
    totals[t]++;
    if (f.fullyCompatible) counts[t]++;
  }
  const tiers = (["P4", "P3", "P2"] as const).filter(t => totals[t] > 0);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {tiers.map(t => {
        const color = TIER_CONFIG[t].color;
        const full  = counts[t] > 0;
        return (
          <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: full ? color : "var(--text-muted)" }}>
            <span
              className="font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${color}22`, color }}
            >
              {t}
            </span>
            <span className="tabular-nums">
              <span style={{ color: full ? color : "var(--text-muted)", fontWeight: 600 }}>{counts[t]}</span>
              <span style={{ color: "var(--text-muted)" }}>/{totals[t]}</span>
            </span>
          </div>
        );
      })}
      <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
        {feasibility.filter(f => f.fullyCompatible).length} produit{feasibility.filter(f => f.fullyCompatible).length > 1 ? "s" : ""} réalisable{feasibility.filter(f => f.fullyCompatible).length > 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ─── Sort helper ─────────────────────────────────────────────────────────────

function sortFeasibility(list: ProductFeasibility[], mode: SortMode): ProductFeasibility[] {
  return [...list].sort((a, b) => {
    if (mode === "alpha") return a.product.name.localeCompare(b.product.name);
    if (mode === "tier") {
      const tierOrder = { P4: 0, P3: 1, P2: 2 };
      const td = (tierOrder[a.product.tier as keyof typeof tierOrder] ?? 3) - (tierOrder[b.product.tier as keyof typeof tierOrder] ?? 3);
      if (td !== 0) return td;
      if (a.fullyCompatible !== b.fullyCompatible) return a.fullyCompatible ? -1 : 1;
      return b.coverageRatio - a.coverageRatio;
    }
    // coverage (default)
    if (a.fullyCompatible !== b.fullyCompatible) return a.fullyCompatible ? -1 : 1;
    return b.coverageRatio - a.coverageRatio;
  });
}

// ─── Security chip ────────────────────────────────────────────────────────────

const SEC_OPTIONS: { value: SecurityFilter; label: string; color: string }[] = [
  { value: "all",     label: "Tous",  color: "var(--text-muted)" },
  { value: "highsec", label: "HS",    color: "#4caf6e" },
  { value: "lowsec",  label: "LS",    color: "#f59e0b" },
  { value: "nullsec", label: "NS",    color: "#e05c2a" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FinderPage() {
  const [systemsData, setSystemsData] = useState<SystemsData | null>(null);
  const [query, setQuery]             = useState("");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: string; sys: SystemEntry }[]>([]);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [open, setOpen]               = useState(false);
  const [tierFilter, setTierFilter]   = useState<TierFilter>("all");
  const [secFilter, setSecFilter]     = useState<SecurityFilter>("all");
  const [sortMode, setSortMode]       = useState<SortMode>("coverage");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/data/systems-planets.json")
      .then(r => r.json())
      .then(setSystemsData)
      .catch(console.error);
  }, []);

  // Build suggestions on query / secFilter change
  useEffect(() => {
    if (!systemsData || query.length < 1) { setSuggestions([]); setActiveIdx(-1); return; }
    const q = query.toLowerCase();

    function matchSec(s: number): boolean {
      if (secFilter === "all") return true;
      if (secFilter === "highsec") return s >= 0.45;
      if (secFilter === "lowsec")  return s >= 0.1 && s < 0.45;
      if (secFilter === "nullsec") return s < 0.1;
      return true;
    }

    const filtered = Object.entries(systemsData).filter(([, s]) => matchSec(s.s));
    const starts   = filtered.filter(([, s]) => s.n.toLowerCase().startsWith(q));
    const contains = filtered.filter(([, s]) => !s.n.toLowerCase().startsWith(q) && s.n.toLowerCase().includes(q));
    setSuggestions([...starts, ...contains].slice(0, 10).map(([id, sys]) => ({ id, sys })));
    setActiveIdx(-1);
    setOpen(true);
  }, [query, systemsData, secFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedSystem = selectedId && systemsData ? systemsData[selectedId] : null;

  const rawFeasibility = useMemo<ProductFeasibility[]>(() => {
    if (!selectedSystem) return [];
    const tiers: ("P2" | "P3" | "P4")[] =
      tierFilter === "all" ? ["P2", "P3", "P4"] : [tierFilter as "P2" | "P3" | "P4"];
    return getSystemProductFeasibility(selectedSystem, tiers);
  }, [selectedSystem, tierFilter]);

  const feasibility = useMemo(() => sortFeasibility(rawFeasibility, sortMode), [rawFeasibility, sortMode]);

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
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") { e.preventDefault(); const item = suggestions[activeIdx] ?? suggestions[0]; if (item) selectSystem(item.id, item.sys); }
    else if (e.key === "Escape") setOpen(false);
  }

  const SORT_LABELS: Record<SortMode, string> = { coverage: "Couverture", tier: "Tier", alpha: "Alphabétique" };
  const showDropdown = open && suggestions.length > 0;

  return (
    <div className="flex h-[calc(100vh-40px)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: 224 }}>
        <Header title="Finder" subtitle="Trouvez ce que vous pouvez produire depuis un système" />

        <main className="flex-1 overflow-auto p-4 md:p-6 space-y-5">

          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            {/* System search */}
            <div ref={wrapperRef} className="relative w-full sm:max-w-xs">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Système de staging
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelectedId(null); }}
                  onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                  onKeyDown={handleKeyDown}
                  placeholder={systemsData ? "Rechercher un système…" : "Chargement…"}
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
                      onMouseDown={e => { e.preventDefault(); selectSystem(id, sys); }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                      style={{
                        background: idx === activeIdx ? "rgba(163,230,53,0.08)" : "transparent",
                        borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}
                    >
                      <MapPin size={12} style={{ color: secColor(sys.s), flexShrink: 0 }} />
                      <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                        <HighlightMatch text={sys.n} query={query} />
                      </span>
                      <span className="text-xs font-mono shrink-0" style={{ color: secColor(sys.s) }}>
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
                          <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: 10 }}>
                            +{Object.keys(sys.t).length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Security filter chips */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Sécurité</label>
              <div className="flex gap-1.5 flex-wrap">
                {SEC_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSecFilter(opt.value)}
                    className="px-2.5 py-1.5 rounded text-xs font-semibold transition-all"
                    style={{
                      background: secFilter === opt.value ? opt.color + "25" : "rgba(255,255,255,0.04)",
                      color:      secFilter === opt.value ? opt.color : "var(--text-muted)",
                      border:     `1px solid ${secFilter === opt.value ? opt.color + "60" : "var(--border)"}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected system */}
          {selectedSystem && (
            <>
              {/* System header */}
              <div
                className="flex items-center gap-3 flex-wrap p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
              >
                <MapPin size={14} style={{ color: secColor(selectedSystem.s) }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {selectedSystem.n}
                </span>
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: secColor(selectedSystem.s) + "22", color: secColor(selectedSystem.s) }}
                >
                  {formatSecurity(selectedSystem.s)} {secLabel(selectedSystem.s)}
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.entries(selectedSystem.t) as [PlanetType, number][]).map(([t, cnt]) => (
                    <PlanetBadge key={t} type={t} count={cnt} />
                  ))}
                </div>
              </div>

              {/* Stats bar */}
              <StatsBar feasibility={rawFeasibility} />

              {/* Controls row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tier filter */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Tier :</span>
                  {(["all", "P2", "P3", "P4"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTierFilter(t)}
                      className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                      style={{
                        background: tierFilter === t ? "rgba(163,230,53,0.15)" : "rgba(255,255,255,0.04)",
                        color:      tierFilter === t ? "var(--accent-lime)" : "var(--text-secondary)",
                        border:     `1px solid ${tierFilter === t ? "rgba(163,230,53,0.3)" : "var(--border)"}`,
                      }}
                    >
                      {t === "all" ? "Tous" : t}
                    </button>
                  ))}
                </div>

                {/* Sort dropdown */}
                <div className="relative ml-auto" ref={sortMenuRef}>
                  <button
                    onClick={() => setShowSortMenu(v => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <ArrowUpDown size={12} />
                    {SORT_LABELS[sortMode]}
                  </button>
                  {showSortMenu && (
                    <div
                      className="absolute right-0 mt-1 z-20 py-1 rounded-lg shadow-xl overflow-hidden"
                      style={{
                        background: "rgba(10,14,22,0.98)",
                        border: "1px solid var(--border)",
                        backdropFilter: "blur(8px)",
                        minWidth: 140,
                      }}
                    >
                      {(["coverage", "tier", "alpha"] as const).map(m => (
                        <button
                          key={m}
                          onMouseDown={e => { e.preventDefault(); setSortMode(m); setShowSortMenu(false); }}
                          className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5"
                          style={{ color: sortMode === m ? "var(--accent-lime)" : "var(--text-secondary)" }}
                        >
                          {SORT_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Product list */}
              <div className="space-y-1.5">
                {feasibility.map(item => (
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
