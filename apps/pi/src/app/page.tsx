"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronRight, ChevronDown, Globe, Search, Target, Download, MapPin } from "lucide-react";
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
  downloadFactoryTemplate,
  downloadMinerTemplate,
} from "@/data/pi-templates";
import {
  findCompatibleSystems,
  secColor,
  secLabel,
  formatSecurity,
  type SystemsData,
  type SecurityFilter,
} from "@/lib/pi-finder";

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

export default function PICalculatorPage() {
  const [selectedId, setSelectedId] = useState<string>(P4_PRODUCTS[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [iskPerUnit, setIskPerUnit] = useState<string>("");
  const [runsPerDay, setRunsPerDay] = useState<number>(3);
  const [downloading, setDownloading] = useState<"factory" | "miner-ns" | "miner-ls" | null>(null);
  const [systemsData, setSystemsData] = useState<SystemsData | null>(null);
  const [secFilter, setSecFilter] = useState<SecurityFilter>("all");

  // Lazy-load planet data on first render
  useEffect(() => {
    fetch("/data/systems-planets.json")
      .then((r) => r.json())
      .then(setSystemsData)
      .catch(console.error);
  }, []);

  const compatibleSystems = useMemo(() => {
    if (!systemsData || !selectedId) return [];
    return findCompatibleSystems(systemsData, selectedId, { filter: secFilter, limit: 12, onlyFull: true });
  }, [systemsData, selectedId, secFilter]);

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

  async function handleDownloadFactory() {
    if (!selectedId || downloading) return;
    setDownloading("factory");
    try { await downloadFactoryTemplate(selectedId); }
    catch (e) { console.error("Template download failed:", e); }
    finally { setDownloading(null); }
  }

  async function handleDownloadMiner(lowSec: boolean) {
    if (!selectedId || downloading) return;
    setDownloading(lowSec ? "miner-ls" : "miner-ns");
    try { await downloadMinerTemplate(selectedId, lowSec); }
    catch (e) { console.error("Miner template download failed:", e); }
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
                      onClick={handleDownloadFactory}
                      disabled={!!downloading}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}40`, color: tierColor }}
                      title="Télécharger le template factory pour import en jeu"
                    >
                      <Download size={14} />
                      {downloading === "factory" ? "…" : "Template factory"}
                    </button>
                  )}
                  {hasMinerTemplate(selectedId) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadMiner(false)}
                        disabled={!!downloading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}40`, color: tierColor }}
                        title="Template miner nullsec"
                      >
                        <Download size={14} />
                        {downloading === "miner-ns" ? "…" : "NS"}
                      </button>
                      <button
                        onClick={() => handleDownloadMiner(true)}
                        disabled={!!downloading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}40`, color: tierColor }}
                        title="Template miner lowsec"
                      >
                        <Download size={14} />
                        {downloading === "miner-ls" ? "…" : "LS"}
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
                    <div className="flex items-center justify-between mb-3">
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
                      <div className="grid grid-cols-2 gap-1.5">
                        {compatibleSystems.map((sys) => (
                          <div
                            key={sys.systemId}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
                          >
                            <Globe size={10} style={{ color: secColor(sys.security), flexShrink: 0 }} />
                            <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                              {sys.name}
                            </span>
                            <span className="ml-auto text-xs font-mono shrink-0" style={{ color: secColor(sys.security) }}>
                              {formatSecurity(sys.security)}
                            </span>
                            <span className="text-xs font-bold shrink-0" style={{ color: secColor(sys.security), fontSize: 10, minWidth: 18 }}>
                              {secLabel(sys.security)}
                            </span>
                          </div>
                        ))}
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
                    className="flex-1 rounded-xl p-4 overflow-y-auto"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
                  >
                    <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                      Chaîne de production
                    </h3>
                    <ChainNodeRow node={chain} depth={0} />
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
