"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronRight, ChevronDown, Globe, Search, Target, Copy, MapPin, Navigation } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  P1_PRODUCTS,
  P2_PRODUCTS,
  P3_PRODUCTS,
  P4_PRODUCTS,
  ALL_PRODUCTS,
  buildChain,
  getRequiredPlanetTypes,
  PLANET_TYPE_LABELS,
  PLANET_TYPE_COLORS,
  TIER_CONFIG,
  type ChainNode,
  type PIProduct,
} from "@/data/pi-chains";
import {
  hasFactoryTemplate,
  hasMinerTemplate,
  copyFactoryTemplate,
  copyMinerTemplate,
} from "@/data/pi-templates";
import {
  findCompatibleSystems,
  getProductionPlan,
  secColor,
  secLabel,
  formatSecurity,
  type SystemsData,
  type SecurityFilter,
  type ProductionPlan,
} from "@/lib/pi-finder";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

const SELECTABLE_PRODUCTS = [
  ...P4_PRODUCTS.map((p) => ({ ...p, group: "P4 — Avancés" })),
  ...P3_PRODUCTS.map((p) => ({ ...p, group: "P3 — Spécialisés" })),
  ...P2_PRODUCTS.map((p) => ({ ...p, group: "P2 — Raffinés" })),
  ...P1_PRODUCTS.map((p) => ({ ...p, group: "P1 — Extraction" })),
];

function ChainNodeRow({ node, depth = 0 }: { node: ChainNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const tier = node.product.tier;
  const tierColor = TIER_CONFIG[tier].color;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors duration-150 cursor-pointer"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand toggle */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          {hasChildren ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: tierColor }} />
          )}
        </span>

        {/* Tier badge */}
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: `${tierColor}18`, color: tierColor, fontSize: "10px" }}
        >
          {tier}
        </span>

        {/* Name */}
        <span className="text-sm flex-1" style={{ color: hasChildren ? "var(--text-primary)" : "var(--text-secondary)" }}>
          {node.product.name}
        </span>

        {/* Quantity */}
        <span className="text-sm font-mono ml-auto" style={{ color: tierColor }}>
          ×{node.quantity.toLocaleString()}
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <ChainNodeRow key={`${child.product.id}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanetBadge({ type }: { type: string }) {
  const color = PLANET_TYPE_COLORS[type as keyof typeof PLANET_TYPE_COLORS] ?? "#64748b";
  const label = PLANET_TYPE_LABELS[type as keyof typeof PLANET_TYPE_LABELS] ?? type;
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      <Globe size={11} />
      {label}
    </div>
  );
}

function CharPlanAdvice({ plan, charCount, tierColor }: { plan: ProductionPlan; charCount: number; tierColor: string }) {
  const n = plan.extractions.length;
  const tierDepth = plan.finalProduct.tier === "P2" ? 1 : plan.finalProduct.tier === "P3" ? 2 : 3;
  const recommendedPlanets = Math.min(2 * n + tierDepth, 6);

  const rowStyle = { color: "var(--text-secondary)", fontSize: 12 };
  const mutedStyle = { color: "var(--text-muted)", fontSize: 11 };

  // 1 char — self-sufficient
  if (charCount === 1) {
    return (
      <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-medium mb-2" style={{ color: tierColor }}>Chaîne complète en solo</p>
        <div className="flex flex-col gap-1">
          {plan.extractions.map((r) => (
            <p key={r.p0.id} style={rowStyle}>
              • 2× planète {r.planetTypes.slice(0, 2).map((pt) => PLANET_TYPE_LABELS[pt]).join(" / ")} → {r.p1.name}
            </p>
          ))}
          <p style={rowStyle}>• {tierDepth}× planète usine → {plan.finalProduct.name}</p>
        </div>
        <p className="mt-2" style={mutedStyle}>{recommendedPlanets} planètes sur 6 disponibles (avec IC V)</p>
      </div>
    );
  }

  // Fewer chars than roles — independent chains
  if (charCount <= n) {
    return (
      <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-medium mb-1" style={{ color: tierColor }}>{charCount} chaînes indépendantes — ×{charCount} production</p>
        <p style={rowStyle}>Chaque personnage fait la chaîne complète en autonomie.</p>
        <p className="mt-1" style={mutedStyle}>Chaque perso : {recommendedPlanets} planètes · Zéro logistique entre persos</p>
      </div>
    );
  }

  // Exactly n+1 chars — perfect specialization
  if (charCount === n + 1) {
    return (
      <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-medium mb-2" style={{ color: tierColor }}>Spécialisation par rôle</p>
        <div className="flex flex-col gap-1">
          {plan.extractions.map((r, i) => (
            <p key={r.p0.id} style={rowStyle}>
              • Perso {i + 1} : 3-4× planète {r.planetTypes.slice(0, 2).map((pt) => PLANET_TYPE_LABELS[pt]).join(" / ")} → {r.p1.name}
            </p>
          ))}
          <p style={rowStyle}>• Perso {n + 1} : 2-3× planète usine → {plan.finalProduct.name}</p>
        </div>
        <p className="mt-2" style={{ color: "#f59e0b", fontSize: 11 }}>⚠ Nécessite de livrer les P1 au perso usine (hauling)</p>
      </div>
    );
  }

  // Many chars — show two options
  const extPerType = Math.max(1, Math.floor((charCount - 1) / n));
  return (
    <div className="flex flex-col gap-2">
      <div className="p-3 rounded-lg" style={{ background: `${tierColor}08`, border: `1px solid ${tierColor}25` }}>
        <p className="text-xs font-medium mb-1" style={{ color: tierColor }}>Option A — Simple (recommandé)</p>
        <p style={rowStyle}>{charCount} chaînes indépendantes = ×{charCount} production</p>
        <p style={mutedStyle}>Zéro logistique · chaque perso est autonome · {recommendedPlanets} planètes/perso</p>
      </div>
      <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-medium mb-1" style={{ color: "var(--text-primary)" }}>Option B — Production optimisée</p>
        <div className="flex flex-col gap-0.5">
          {plan.extractions.map((r) => (
            <p key={r.p0.id} style={rowStyle}>• {extPerType} perso(s) : {r.p0.name} → {r.p1.name} ({r.planetTypes.slice(0, 2).map((pt) => PLANET_TYPE_LABELS[pt]).join(" / ")})</p>
          ))}
          <p style={rowStyle}>• 1 perso : usine {plan.finalProduct.name}</p>
        </div>
        <p className="mt-1" style={{ color: "#f59e0b", fontSize: 11 }}>⚠ Logistique P1 → usine requise</p>
      </div>
    </div>
  );
}

export default function PICalculatorPage() {
  const [selectedId, setSelectedId] = useState<string>(P4_PRODUCTS[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [iskPerUnit, setIskPerUnit] = useState<string>("");
  const [runsPerDay, setRunsPerDay] = useState<number>(3);
  const [downloading, setDownloading] = useState<"factory" | "miner-ns" | "miner-ls" | null>(null);
  const [charCount, setCharCount] = useState(1);
  const [maxChars, setMaxChars] = useState(6);
  const [systemsData, setSystemsData]     = useState<SystemsData | null>(null);
  const [secFilter, setSecFilter]          = useState<SecurityFilter>("all");
  const [refSystemId, setRefSystemId]      = useState<string | null>(null);
  const [refQuery, setRefQuery]            = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ok" | "unauth" | "error">("loading");
  const [refSuggestions, setRefSuggestions] = useState<{ id: string; name: string; sec: number }[]>([]);
  const [refOpen, setRefOpen]              = useState(false);
  const [refActiveIdx, setRefActiveIdx]    = useState(-1);
  const refWrapperRef                      = useRef<HTMLDivElement>(null);
  const refInputRef                        = useRef<HTMLInputElement>(null);

  // Load planet data + character location in parallel
  useEffect(() => {
    fetch("/data/systems-planets.json")
      .then((r) => r.json())
      .then(setSystemsData)
      .catch(console.error);

    fetch("/api/location")
      .then((r) => r.json().then((data) => ({ ok: r.ok, status: r.status, data })))
      .then(({ ok, status, data }) => {
        if (ok && data?.systemId) {
          setRefSystemId(String(data.systemId));
          setLocationStatus("ok");
          if (data.characterCount >= 1) {
            const clamped = Math.min(data.characterCount, 6);
            setMaxChars(clamped);
            setCharCount(clamped);
          }
        } else if (status === 401) {
          setLocationStatus("unauth");
        } else {
          setLocationStatus("error");
        }
      })
      .catch(() => setLocationStatus("error"));
  }, []);

  // Sync ref input text when data + id both ready
  useEffect(() => {
    if (systemsData && refSystemId) {
      const name = systemsData[refSystemId]?.n;
      if (name) setRefQuery(name);
    }
  }, [systemsData, refSystemId]);

  // Build ref system autocomplete suggestions
  useEffect(() => {
    if (!systemsData || refQuery.length < 1) { setRefSuggestions([]); setRefActiveIdx(-1); return; }
    const q = refQuery.toLowerCase();
    const starts   = Object.entries(systemsData).filter(([, s]) => s.n.toLowerCase().startsWith(q));
    const contains = Object.entries(systemsData).filter(([, s]) => !s.n.toLowerCase().startsWith(q) && s.n.toLowerCase().includes(q));
    setRefSuggestions(
      [...starts, ...contains].slice(0, 8).map(([id, s]) => ({ id, name: s.n, sec: s.s }))
    );
    setRefActiveIdx(-1);
    setRefOpen(true);
  }, [refQuery, systemsData]);

  // Close ref dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (refWrapperRef.current && !refWrapperRef.current.contains(e.target as Node)) {
        setRefOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectRefSystem = useCallback((id: string, name: string) => {
    setRefSystemId(id);
    setRefQuery(name);
    setRefSuggestions([]);
    setRefOpen(false);
    refInputRef.current?.blur();
  }, []);

  function handleRefKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!refOpen || refSuggestions.length === 0) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setRefActiveIdx((i) => Math.min(i + 1, refSuggestions.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setRefActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter")  { e.preventDefault(); const it = refSuggestions[refActiveIdx] ?? refSuggestions[0]; if (it) selectRefSystem(it.id, it.name); }
    else if (e.key === "Escape") { setRefOpen(false); }
  }

  const showRefDropdown = refOpen && refSuggestions.length > 0;

  const compatibleSystems = useMemo(() => {
    if (!systemsData || !selectedId) return [];
    return findCompatibleSystems(systemsData, selectedId, {
      filter: secFilter,
      limit: 20,
      onlyFull: true,
      referenceSystemId: refSystemId ?? undefined,
    });
  }, [systemsData, selectedId, secFilter, refSystemId]);

  const plan = useMemo(() => selectedId ? getProductionPlan(selectedId) : null, [selectedId]);

  const filteredProducts = useMemo(() =>
    SELECTABLE_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );

  const chain = useMemo(() => {
    if (!selectedId || !ALL_PRODUCTS[selectedId]) return null;
    try { return buildChain(selectedId, 1); }
    catch { return null; }
  }, [selectedId]);

  const requiredPlanets = useMemo(() => {
    if (!selectedId || !ALL_PRODUCTS[selectedId]) return new Set<string>();
    try { return getRequiredPlanetTypes(selectedId); }
    catch { return new Set<string>(); }
  }, [selectedId]);

  const selectedProduct = ALL_PRODUCTS[selectedId];
  const tierColor = selectedProduct ? TIER_CONFIG[selectedProduct.tier].color : "#a3e635";

  const outputPerDay = useMemo(() => {
    if (!selectedProduct?.outputQty) return null;
    return selectedProduct.outputQty * runsPerDay;
  }, [selectedProduct, runsPerDay]);

  const iskPerDay = useMemo(() => {
    if (!outputPerDay || !iskPerUnit) return null;
    const perUnit = parseFloat(iskPerUnit.replace(/[^\d.]/g, ""));
    if (isNaN(perUnit)) return null;
    return outputPerDay * perUnit;
  }, [outputPerDay, iskPerUnit]);

  async function handleCopyFactory() {
    if (!selectedId || downloading) return;
    setDownloading("factory");
    try { await copyFactoryTemplate(selectedId); }
    catch (e) { console.error("Template copy failed:", e); }
    finally { setDownloading(null); }
  }

  async function handleCopyMiner(lowSec: boolean) {
    if (!selectedId || downloading) return;
    setDownloading(lowSec ? "miner-ls" : "miner-ns");
    try { await copyMinerTemplate(selectedId, lowSec); }
    catch (e) { console.error("Miner template copy failed:", e); }
    finally { setDownloading(null); }
  }

  function formatIsk(v: number): string {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)} M`;
    return `${(v / 1e3).toFixed(0)} K`;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header
          title="Calculateur de chaîne PI"
          subtitle="Sélectionnez un produit pour voir sa chaîne de production complète"
        />

        <div className="flex flex-1 gap-6 p-6">
          {/* Product selector */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Product list */}
            <div
              className="flex-1 rounded-xl overflow-y-auto"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
            >
              {(["P4 — Avancés", "P3 — Spécialisés", "P2 — Raffinés", "P1 — Extraction"] as const).map((group) => {
                const items = filteredProducts.filter((p) => p.group === group);
                if (items.length === 0) return null;
                const tier = group.split(" ")[0] as "P1" | "P2" | "P3" | "P4";
                return (
                  <div key={group}>
                    <div
                      className="px-3 py-2 text-xs font-semibold sticky top-0"
                      style={{
                        color: TIER_CONFIG[tier].color,
                        background: `${TIER_CONFIG[tier].color}12`,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {group}
                    </div>
                    {items.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedId(product.id)}
                        className="w-full text-left px-3 py-2 text-sm transition-colors duration-100 cursor-pointer"
                        style={{
                          background: selectedId === product.id ? `${TIER_CONFIG[tier].color}14` : "transparent",
                          color: selectedId === product.id ? TIER_CONFIG[tier].color : "var(--text-secondary)",
                          borderLeft: selectedId === product.id ? `2px solid ${TIER_CONFIG[tier].color}` : "2px solid transparent",
                        }}
                      >
                        {product.name}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chain view */}
          <div className="flex-1 flex flex-col gap-4">
            {selectedProduct && (
              <>
                {/* Product header */}
                <div
                  className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold"
                    style={{ background: `${tierColor}18`, color: tierColor }}
                  >
                    {selectedProduct.tier}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {selectedProduct.name}
                    </h2>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {TIER_CONFIG[selectedProduct.tier].label}
                    </p>
                  </div>
                  {selectedProduct.outputQty && (
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono" style={{ color: tierColor }}>
                        ×{selectedProduct.outputQty}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>par cycle</div>
                    </div>
                  )}
                  {hasFactoryTemplate(selectedId) && (
                    <button
                      onClick={handleCopyFactory}
                      disabled={!!downloading}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}40`, color: tierColor }}
                      title="Télécharger le template factory pour import en jeu"
                    >
                      <Copy size={14} />
                      {downloading === "factory" ? "Copié !" : "Copier template"}
                    </button>
                  )}
                  {hasMinerTemplate(selectedId) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyMiner(false)}
                        disabled={!!downloading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}40`, color: tierColor }}
                        title="Template miner nullsec"
                      >
                        <Copy size={14} />
                        {downloading === "miner-ns" ? "Copié !" : "NS"}
                      </button>
                      <button
                        onClick={() => handleCopyMiner(true)}
                        disabled={!!downloading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}40`, color: tierColor }}
                        title="Template miner lowsec"
                      >
                        <Copy size={14} />
                        {downloading === "miner-ls" ? "Copié !" : "LS"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Required planet types */}
                {requiredPlanets.size > 0 && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
                  >
                    <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                      Planètes requises ({requiredPlanets.size})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(requiredPlanets).map((type) => (
                        <PlanetBadge key={type} type={type} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Compatible systems */}
                {requiredPlanets.size > 0 && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} style={{ color: "var(--accent-lime)" }} />
                        <h3 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                          Systèmes compatibles
                        </h3>
                        {systemsData && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(163,230,53,0.1)", color: "var(--accent-lime)" }}>
                            {compatibleSystems.length}
                          </span>
                        )}
                      </div>

                      {/* Reference system picker */}
                      <div ref={refWrapperRef} className="relative flex-1 min-w-0 max-w-56">
                        {locationStatus === "unauth" && (
                          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                            <a href={`${GATEWAY_URL}/account/characters`} target="_blank" rel="noreferrer" style={{ color: "#f59e0b", textDecoration: "underline" }}>
                              Re-liez votre perso
                            </a>{" "}pour auto-détecter
                          </p>
                        )}
                        <div className="relative">
                          <Navigation size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: locationStatus === "ok" ? "var(--accent-lime)" : "var(--text-muted)" }} />
                          <input
                            ref={refInputRef}
                            type="text"
                            value={refQuery}
                            onChange={(e) => { setRefQuery(e.target.value); setRefSystemId(null); }}
                            onFocus={() => { if (refSuggestions.length > 0) setRefOpen(true); }}
                            onKeyDown={handleRefKeyDown}
                            placeholder={systemsData ? "Système de référence…" : "Chargement…"}
                            disabled={!systemsData}
                            autoComplete="off"
                            className="w-full pl-6 pr-2 py-1 rounded text-xs outline-none"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: `1px solid ${showRefDropdown ? "rgba(163,230,53,0.4)" : "var(--border)"}`,
                              color: "var(--text-primary)",
                              borderBottomLeftRadius: showRefDropdown ? 0 : undefined,
                              borderBottomRightRadius: showRefDropdown ? 0 : undefined,
                            }}
                          />
                        </div>
                        {showRefDropdown && (
                          <div
                            className="absolute z-20 w-full overflow-hidden shadow-2xl"
                            style={{
                              background: "rgba(8,12,20,0.98)",
                              border: "1px solid rgba(163,230,53,0.4)",
                              borderTop: "none",
                              borderBottomLeftRadius: 6,
                              borderBottomRightRadius: 6,
                              minWidth: 200,
                            }}
                          >
                            {refSuggestions.map((item, idx) => (
                              <button
                                key={item.id}
                                onMouseDown={(e) => { e.preventDefault(); selectRefSystem(item.id, item.name); }}
                                onMouseEnter={() => setRefActiveIdx(idx)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors"
                                style={{
                                  background: idx === refActiveIdx ? "rgba(163,230,53,0.08)" : "transparent",
                                  borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                }}
                              >
                                <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                                <span className="ml-auto font-mono shrink-0" style={{ color: secColor(item.sec) }}>
                                  {secLabel(item.sec)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        {(["all", "highsec", "lowsec", "nullsec"] as SecurityFilter[]).map((f) => (
                          <button
                            key={f}
                            onClick={() => setSecFilter(f)}
                            className="px-2 py-0.5 rounded text-xs transition-colors"
                            style={{
                              background: secFilter === f ? "rgba(163,230,53,0.15)" : "rgba(255,255,255,0.04)",
                              color: secFilter === f ? "var(--accent-lime)" : "var(--text-muted)",
                              border: `1px solid ${secFilter === f ? "rgba(163,230,53,0.3)" : "var(--border)"}`,
                            }}
                          >
                            {f === "all" ? "Tous" : f === "highsec" ? "HS" : f === "lowsec" ? "LS" : "NS"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!systemsData && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Chargement…</p>
                    )}

                    {systemsData && compatibleSystems.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Aucun système avec toutes les planètes requises dans ce filtre.
                      </p>
                    )}

                    {compatibleSystems.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {compatibleSystems.slice(0, 8).map((sys, idx) => (
                          <div
                            key={sys.systemId}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
                          >
                            <span className="text-xs font-mono w-4 shrink-0" style={{ color: "var(--text-muted)" }}>{idx + 1}</span>
                            <Globe size={10} style={{ color: secColor(sys.security), flexShrink: 0 }} />
                            <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                              {sys.name}
                            </span>
                            {sys.distance !== undefined && (
                              <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-muted)" }}>
                                {(sys.distance * 0.00106).toFixed(1)} AL
                              </span>
                            )}
                            <span className="text-xs font-mono shrink-0" style={{ color: secColor(sys.security) }}>
                              {formatSecurity(sys.security)}
                            </span>
                            <span className="text-xs font-bold shrink-0" style={{ color: secColor(sys.security), fontSize: 10, minWidth: 18 }}>
                              {secLabel(sys.security)}
                            </span>
                          </div>
                        ))}
                        <a
                          href="/finder"
                          className="text-xs text-center py-1 rounded transition-colors"
                          style={{ color: "var(--accent-lime)", opacity: 0.7 }}
                        >
                          {compatibleSystems.length > 8
                            ? `+ ${compatibleSystems.length - 8} autres → Finder`
                            : "→ Finder pour explorer"}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* ISK estimator */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={14} style={{ color: "var(--accent-gold)" }} />
                    <h3 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      Estimateur ISK/jour
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Prix de vente (ISK / unité)</span>
                      <input
                        type="text"
                        placeholder="ex: 450000"
                        value={iskPerUnit}
                        onChange={(e) => setIskPerUnit(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg outline-none font-mono"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Cycles par jour</span>
                      <select
                        value={runsPerDay}
                        onChange={(e) => setRunsPerDay(Number(e.target.value))}
                        className="px-3 py-2 text-sm rounded-lg outline-none cursor-pointer"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        {[1, 2, 3, 4, 6, 8, 12, 24].map((n) => (
                          <option key={n} value={n}>{n}×/jour</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-4">
                    {outputPerDay && (
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Production / jour</p>
                        <p className="text-lg font-mono font-bold" style={{ color: tierColor }}>{outputPerDay} unités</p>
                      </div>
                    )}
                    {iskPerDay !== null && (
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Revenus estimés / jour</p>
                        <p className="text-lg font-mono font-bold" style={{ color: "var(--accent-gold)" }}>{formatIsk(iskPerDay)} ISK</p>
                      </div>
                    )}
                    {iskPerDay !== null && (
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>/ mois (30j)</p>
                        <p className="text-lg font-mono font-bold" style={{ color: "var(--accent-gold)" }}>{formatIsk(iskPerDay * 30)} ISK</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chain tree */}
                {chain && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
                  >
                    <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                      Chaîne de production
                    </h3>
                    <ChainNodeRow node={chain} depth={0} />
                  </div>
                )}

                {/* Production plan */}
                {plan && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
                  >
                    <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
                      Plan de mise en place
                    </h3>

                    {/* Extraction roles */}
                    <div className="mb-4">
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Étape 1 — Extraction &amp; raffinage P0 → P1</p>
                      <div className="flex flex-col gap-2">
                        {plan.extractions.map((role) => (
                          <div
                            key={role.p0.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
                          >
                            <div className="flex flex-wrap gap-1 flex-1">
                              {role.planetTypes.map((pt) => (
                                <span
                                  key={pt}
                                  className="text-xs px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: `${PLANET_TYPE_COLORS[pt]}18`,
                                    color: PLANET_TYPE_COLORS[pt],
                                    border: `1px solid ${PLANET_TYPE_COLORS[pt]}30`,
                                    fontSize: 10,
                                  }}
                                >
                                  {PLANET_TYPE_LABELS[pt]}
                                </span>
                              ))}
                            </div>
                            <div className="text-right shrink-0 text-xs">
                              <span style={{ color: "var(--text-muted)" }}>{role.p0.name}</span>
                              <span className="mx-1" style={{ color: "var(--text-muted)" }}>→</span>
                              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{role.p1.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assembly step */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 flex-wrap"
                      style={{ background: `${tierColor}08`, border: `1px solid ${tierColor}25` }}
                    >
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Étape 2 — Usine</span>
                      {plan.extractions.map((r, i) => (
                        <span key={r.p1.id} className="text-xs flex items-center gap-1">
                          {i > 0 && <span style={{ color: "var(--text-muted)" }}>+</span>}
                          <span style={{ color: "var(--text-secondary)" }}>{r.p1.name}</span>
                        </span>
                      ))}
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                      <span className="text-xs font-bold" style={{ color: tierColor }}>
                        {plan.finalProduct.name} ×{plan.finalProduct.outputQty}
                      </span>
                    </div>

                    {/* Planet configuration guide */}
                    <div className="mb-4">
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Configuration des planètes</p>
                      <div className="flex flex-col gap-2">

                        {/* Extraction planets */}
                        {plan.extractions.map((role) => (
                          <div
                            key={`cfg-${role.p0.id}`}
                            className="p-3 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                                Planète extraction — {role.p1.name}
                              </p>
                              {hasMinerTemplate(role.p1.id) && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => copyMinerTemplate(role.p1.id, false)}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer transition-colors"
                                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                                    title={`Template miner nullsec — ${role.p1.name}`}
                                  >
                                    <Copy size={10} />NS
                                  </button>
                                  <button
                                    onClick={() => copyMinerTemplate(role.p1.id, true)}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer transition-colors"
                                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                                    title={`Template miner lowsec — ${role.p1.name}`}
                                  >
                                    <Copy size={10} />LS
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5" style={{ color: "var(--text-muted)", fontSize: 11 }}>
                              <p>• 1 ECU avec <strong style={{ color: "var(--text-secondary)" }}>3 à 5 têtes</strong> d'extraction</p>
                              <p>• 1 Basic Industry Facility (convertit {role.p0.name} → {role.p1.name} en continu)</p>
                              <p>• Cycle recommandé : <strong style={{ color: "var(--text-secondary)" }}>23h</strong> pour 1 connexion/jour</p>
                            </div>
                          </div>
                        ))}

                        {/* Factory planet */}
                        <div
                          className="p-3 rounded-lg"
                          style={{ background: `${tierColor}06`, border: `1px solid ${tierColor}20` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium" style={{ color: tierColor }}>
                              Planète usine — {plan.finalProduct.name}
                            </p>
                            {hasFactoryTemplate(selectedId) && (
                              <button
                                onClick={handleCopyFactory}
                                disabled={!!downloading}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer transition-colors disabled:opacity-50"
                                style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}40`, color: tierColor }}
                              >
                                <Copy size={10} />Copier
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5" style={{ color: "var(--text-muted)", fontSize: 11 }}>
                            <p>• Pas d'extracteur ici</p>
                            <p>• <strong style={{ color: "var(--text-secondary)" }}>2 à 4 Advanced Industry Facilities</strong> (selon votre skill CCU)</p>
                            <p>• Importe les P1 depuis vos planètes d'extraction via les routes</p>
                            <p>• 1 Launch Pad recommandé pour le stockage intermédiaire</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Char count picker */}
                    <div>
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Combien de personnages ?</p>
                      <div className="flex gap-1 mb-3">
                        {Array.from({ length: maxChars }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            onClick={() => setCharCount(n)}
                            className="px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer"
                            style={{
                              background: charCount === n ? `${tierColor}20` : "rgba(255,255,255,0.04)",
                              color: charCount === n ? tierColor : "var(--text-muted)",
                              border: `1px solid ${charCount === n ? `${tierColor}50` : "var(--border)"}`,
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>

                      <CharPlanAdvice plan={plan} charCount={charCount} tierColor={tierColor} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
