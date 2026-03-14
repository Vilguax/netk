"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CCU_GRID, IPC_MAX_PLANETS, STRUCTURE_COSTS, calculateConstraints } from "@/lib/pi-skills";
import {
  P0_RESOURCES, P1_PRODUCTS, P2_PRODUCTS, P3_PRODUCTS, P4_PRODUCTS,
  ALL_PRODUCTS, PLANET_TYPE_LABELS, PLANET_TYPE_COLORS, TIER_CONFIG,
  type PlanetType,
} from "@/data/pi-chains";

// ─── Reference setup costs (mirrors pi-skills.ts SETUPS) ────────────────────

const REF_SETUPS = [
  {
    key: "extractionP1",
    label: "Extraction P1",
    desc: "1 ECU (5 têtes) + 1 BIF + 1 Launchpad",
    cpu: 4_750, power: 6_850,
    minCCU: 1,
    tip: "Setup de départ — extrait P0 et produit P1 sur place.",
  },
  {
    key: "selfSufficientP2",
    label: "P2 autonome",
    desc: "2 ECU (3 têtes chacun) + 2 BIF + 1 AIF + 1 Launchpad",
    cpu: 5_960, power: 11_500,
    minCCU: 2,
    tip: "Planète autosuffisante en P2. Nécessite les 2 ressources P0 cibles sur place.",
  },
  {
    key: "factoryP3",
    label: "Usine P3",
    desc: "8 AIF + 1 Launchpad",
    cpu: 7_600, power: 6_300,
    minCCU: 2,
    tip: "Importe des P2 et produit des P3. Aucun extracteur.",
  },
  {
    key: "factoryP4",
    label: "Usine P4",
    desc: "6 HTPP + 1 Launchpad",
    cpu: 10_200, power: 3_100,
    minCCU: 3,
    tip: "Importe des P3 et produit des P4. Barren ou Temperate uniquement.",
  },
  {
    key: "fullChainP3",
    label: "Chaîne P3 complète",
    desc: "2 ECU (3 têtes) + 2 BIF + 6 AIF + 2 Launchpads",
    cpu: 13_260, power: 14_300,
    minCCU: 4,
    tip: "Extrait, raffine et produit du P3 sur une seule planète.",
  },
] as const;

// ─── Planet explorer helpers ─────────────────────────────────────────────────

function planetP0(type: PlanetType) {
  return P0_RESOURCES.filter(p => p.planetTypes?.includes(type));
}
function planetP1(type: PlanetType) {
  const p0ids = new Set(planetP0(type).map(p => p.id));
  return P1_PRODUCTS.filter(p => p.inputs?.every(i => p0ids.has(i.productId)));
}
function planetP2Autonomous(type: PlanetType) {
  const p1ids = new Set(planetP1(type).map(p => p.id));
  return P2_PRODUCTS.filter(p => p.inputs?.every(i => p1ids.has(i.productId)));
}

// ─── Structure cost table data ───────────────────────────────────────────────

const STRUCTURES_TABLE = [
  { name: "Extractor Control Unit", abbr: "ECU",  cpu: STRUCTURE_COSTS.extractorControlUnit.cpu, power: STRUCTURE_COSTS.extractorControlUnit.power, role: "Extraction", note: "1 ressource P0 par ECU" },
  { name: "Extractor Head",         abbr: "Head", cpu: STRUCTURE_COSTS.extractorHead.cpu,        power: STRUCTURE_COSTS.extractorHead.power,        role: "Extraction", note: "Max 10 par ECU" },
  { name: "Basic Industry Facility",abbr: "BIF",  cpu: STRUCTURE_COSTS.basicIndustry.cpu,        power: STRUCTURE_COSTS.basicIndustry.power,        role: "P0→P1",      note: "3 000 P0 → 20 P1" },
  { name: "Advanced Industry Facility", abbr: "AIF", cpu: STRUCTURE_COSTS.advancedIndustry.cpu,  power: STRUCTURE_COSTS.advancedIndustry.power,     role: "P1→P2 / P2→P3", note: "40+40 P1 → 5 P2 · 10+10 P2 → 3 P3" },
  { name: "High-Tech Production Plant", abbr: "HTPP", cpu: STRUCTURE_COSTS.highTechPlant.cpu,    power: STRUCTURE_COSTS.highTechPlant.power,        role: "P3→P4",      note: "6+6+6 P3 → 3 P4 · Barren/Temperate" },
  { name: "Storage Facility",       abbr: "Storage", cpu: STRUCTURE_COSTS.storageFacility.cpu,   power: STRUCTURE_COSTS.storageFacility.power,      role: "Stockage",   note: "12 000 m³" },
  { name: "Launchpad",              abbr: "LP",   cpu: STRUCTURE_COSTS.launchpad.cpu,             power: STRUCTURE_COSTS.launchpad.power,            role: "Stockage + orbite", note: "500 000 m³ — seul point d'accès orbital" },
];

const ROLE_COLORS: Record<string, string> = {
  "Extraction":        "#a8845a",
  "P0→P1":            "#3b82f6",
  "P1→P2 / P2→P3":   "#10b981",
  "P3→P4":            "#f59e0b",
  "Stockage":         "#64748b",
  "Stockage + orbite":"#a3e635",
};

// ─── Abbr tooltip ────────────────────────────────────────────────────────────

const ABBR_MAP: Record<string, string> = {
  ECU:   "Extractor Control Unit",
  BIF:   "Basic Industry Facility",
  AIF:   "Advanced Industry Facility",
  HTPP:  "High-Tech Production Plant",
  CCU:   "Command Center Upgrades",
  IPC:   "Interplanetary Consolidation",
  LP:    "Launchpad",
  POCO:  "Player-Owned Customs Office",
};

function Abbr({ children, full, color }: { children: React.ReactNode; full?: string; color?: string }) {
  const [show, setShow] = useState(false);
  const label = typeof children === "string" ? (full ?? ABBR_MAP[children] ?? children) : full;
  return (
    <span className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      <strong style={{
        color: color ?? "var(--text-primary)",
        borderBottom: "1px dotted rgba(255,255,255,0.3)",
        cursor: "help",
      }}>
        {children}
      </strong>
      {show && label && (
        <span className="absolute bottom-full left-1/2 pointer-events-none z-50"
          style={{
            transform: "translateX(-50%)",
            marginBottom: 5,
            background: "rgba(8,12,20,0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            padding: "3px 9px",
            whiteSpace: "nowrap",
            fontSize: 11,
            color: "var(--text-primary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}>
          {label}
        </span>
      )}
    </span>
  );
}

// Replaces known acronyms in a plain string with <Abbr> components
function parseAbbr(text: string): React.ReactNode {
  const pattern = new RegExp(`\\b(${Object.keys(ABBR_MAP).join("|")})\\b`, "g");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    ABBR_MAP[part] ? <Abbr key={i}>{part}</Abbr> : part
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-bold mb-1 scroll-mt-6" style={{ color: "var(--text-primary)" }}>
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>{children}</p>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-5 ${className}`} style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  );
}

// ─── Section 1 : Simulateur CCU / IPC ────────────────────────────────────────

function SimulateurSection() {
  const [ccu, setCcu] = useState(3);
  const [ipc, setIpc] = useState(3);

  const grid = CCU_GRID[ccu];
  const maxPlanets = IPC_MAX_PLANETS[ipc];

  const mockSkills = {
    "Command Center Upgrades": ccu,
    "Interplanetary Consolidation": ipc,
    "Planetology": 0,
    "Advanced Planetology": 0,
    "Remote Sensing": 0,
  };
  const constraints = calculateConstraints(mockSkills);

  function fits(cpu: number, power: number) {
    return cpu <= grid.cpu && power <= grid.power;
  }

  return (
    <div className="space-y-4">
      {/* Sliders */}
      <Card>
        <div className="grid grid-cols-2 gap-6">
          {/* CCU */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Command Center Upgrades
              </span>
              <span className="text-sm font-bold px-2 py-0.5 rounded" style={{ background: "rgba(163,230,53,0.15)", color: "var(--accent-lime)" }}>
                {ccu}
              </span>
            </div>
            <input type="range" min={0} max={5} value={ccu} onChange={e => setCcu(Number(e.target.value))}
              className="w-full accent-lime-400 cursor-pointer" />
            <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {[0,1,2,3,4,5].map(l => <span key={l}>{l}</span>)}
            </div>
          </div>
          {/* IPC */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Interplanetary Consolidation
              </span>
              <span className="text-sm font-bold px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                {ipc}
              </span>
            </div>
            <input type="range" min={0} max={5} value={ipc} onChange={e => setIpc(Number(e.target.value))}
              className="w-full cursor-pointer" style={{ accentColor: "#3b82f6" }} />
            <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {[0,1,2,3,4,5].map(l => <span key={l}>{l}</span>)}
            </div>
          </div>
        </div>

        {/* Grid values */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="rounded-lg p-3 text-center" style={{ background: "rgba(163,230,53,0.07)", border: "1px solid rgba(163,230,53,0.2)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>CPU disponible</div>
            <div className="text-base font-bold" style={{ color: "var(--accent-lime)" }}>
              {grid.cpu.toLocaleString()} tf
            </div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Power Grid</div>
            <div className="text-base font-bold" style={{ color: "#3b82f6" }}>
              {grid.power.toLocaleString()} MW
            </div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Planètes max</div>
            <div className="text-base font-bold" style={{ color: "#fbbf24" }}>
              {maxPlanets}
            </div>
          </div>
        </div>
      </Card>

      {/* Setup cards */}
      <div className="grid grid-cols-1 gap-2">
        {REF_SETUPS.map(s => {
          const ok = fits(s.cpu, s.power);
          const cpuPct  = Math.min(100, Math.round(s.cpu   / grid.cpu   * 100));
          const powPct  = Math.min(100, Math.round(s.power / grid.power * 100));
          return (
            <div key={s.key} className="rounded-xl p-4 transition-all"
              style={{
                background: ok ? "rgba(163,230,53,0.05)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${ok ? "rgba(163,230,53,0.3)" : "var(--border)"}`,
                opacity: ok ? 1 : 0.55,
              }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: ok ? "var(--accent-lime)" : "var(--text-secondary)" }}>
                      {s.label}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{parseAbbr(s.desc)}</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{parseAbbr(s.tip)}</p>

                  {/* Bars */}
                  <div className="flex gap-4 mt-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                        <span>CPU {s.cpu.toLocaleString()} tf</span>
                        <span style={{ color: ok ? "var(--accent-lime)" : "#f87171" }}>{cpuPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${cpuPct}%`, background: ok ? "rgba(163,230,53,0.7)" : "rgba(248,113,113,0.7)" }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                        <span>Power {s.power.toLocaleString()} MW</span>
                        <span style={{ color: ok ? "var(--accent-lime)" : "#f87171" }}>{powPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${powPct}%`, background: ok ? "rgba(163,230,53,0.7)" : "rgba(248,113,113,0.7)" }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-lg shrink-0">{ok ? "✓" : "✗"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation text */}
      <Card>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Comment ça fonctionne</h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Chaque structure que tu poses consomme du <strong style={{ color: "var(--accent-lime)" }}>CPU (tf)</strong> et du{" "}
          <strong style={{ color: "#3b82f6" }}>Power Grid (MW)</strong>. La somme de toutes tes structures ne doit pas dépasser
          la grille disponible. Le niveau de <Abbr>CCU</Abbr> définit
          cette grille — c'est la compétence à monter en priorité.
          Les liens entre structures consomment aussi de la grille selon leur distance : minimise les distances pour préserver du CPU/MW.
        </p>
      </Card>
    </div>
  );
}

// ─── Section 2 : Explorateur de planètes ─────────────────────────────────────

const PLANET_TYPES: PlanetType[] = ["barren", "gas", "ice", "lava", "oceanic", "plasma", "storm", "temperate"];

function PlanetSection() {
  const [selected, setSelected] = useState<PlanetType | null>("barren");

  const p0 = useMemo(() => selected ? planetP0(selected) : [], [selected]);
  const p1 = useMemo(() => selected ? planetP1(selected) : [], [selected]);
  const p2auto = useMemo(() => selected ? planetP2Autonomous(selected) : [], [selected]);

  return (
    <div className="space-y-4">
      {/* Planet buttons */}
      <div className="flex flex-wrap gap-2">
        {PLANET_TYPES.map(t => {
          const color = PLANET_TYPE_COLORS[t];
          const active = selected === t;
          return (
            <button key={t} onClick={() => setSelected(prev => prev === t ? null : t)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={{
                background: active ? `${color}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? color + "80" : "rgba(255,255,255,0.1)"}`,
                color: active ? color : "var(--text-secondary)",
                boxShadow: active ? `0 0 10px ${color}30` : "none",
              }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              {PLANET_TYPE_LABELS[t]}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="grid grid-cols-3 gap-4">
          {/* P0 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                style={{ background: `${TIER_CONFIG.P0.color}22`, color: TIER_CONFIG.P0.color }}>P0</div>
              <span className="text-xs font-semibold" style={{ color: TIER_CONFIG.P0.color }}>Ressources brutes</span>
            </div>
            <div className="space-y-1">
              {p0.map(r => (
                <div key={r.id} className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>
                  {r.name}
                </div>
              ))}
            </div>
          </Card>

          {/* P1 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                style={{ background: `${TIER_CONFIG.P1.color}22`, color: TIER_CONFIG.P1.color }}>P1</div>
              <span className="text-xs font-semibold" style={{ color: TIER_CONFIG.P1.color }}>Produits P1 disponibles</span>
            </div>
            <div className="space-y-1">
              {p1.map(r => (
                <div key={r.id} className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>
                  {r.name}
                </div>
              ))}
            </div>
          </Card>

          {/* P2 auto */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                style={{ background: `${TIER_CONFIG.P2.color}22`, color: TIER_CONFIG.P2.color }}>P2</div>
              <span className="text-xs font-semibold" style={{ color: TIER_CONFIG.P2.color }}>P2 autonomes sur cette planète</span>
            </div>
            {p2auto.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Aucun P2 ne peut être produit entièrement sur ce type de planète — les P1 requis viennent de types différents.
              </p>
            ) : (
              <div className="space-y-1">
                {p2auto.map(r => (
                  <div key={r.id} className="text-xs px-2 py-1 rounded"
                    style={{ background: `${TIER_CONFIG.P2.color}11`, color: TIER_CONFIG.P2.color, border: `1px solid ${TIER_CONFIG.P2.color}33` }}>
                    {r.name}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <Card>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Ressources rares — à retenir</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { p0: "Reactive Gas",       types: ["gas", "storm"],                         note: "Nano-Factory (P4)" },
            { p0: "Noble Gas",          types: ["gas", "ice", "storm"],                  note: "Oxides → Condensates" },
            { p0: "Felsic Magma",       types: ["barren", "lava"],                       note: "Silicon → Silicate Glass" },
            { p0: "Noble Metals",       types: ["barren", "plasma"],                     note: "Precious Metals → Mécanique" },
            { p0: "Complex Organisms",  types: ["oceanic", "storm", "temperate"],        note: "Proteins → chaînes bio" },
            { p0: "Planktic Colonies",  types: ["gas", "ice", "oceanic", "temperate"],  note: "Biomass → Supertensile..." },
          ].map(r => (
            <div key={r.p0} className="flex items-center gap-2 p-2 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{r.p0}</div>
                <div style={{ color: "var(--text-muted)" }}>{r.note}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {(r.types as PlanetType[]).map(t => (
                  <div key={t} className="w-2 h-2 rounded-full" style={{ background: PLANET_TYPE_COLORS[t] }} title={PLANET_TYPE_LABELS[t]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Section 3 : Structures ───────────────────────────────────────────────────

function StructuresSection() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border)" }}>
              {["Structure", "Abrév.", "CPU (tf)", "Power (MW)", "Rôle", "Notes"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STRUCTURES_TABLE.map((s, i) => {
              const roleColor = ROLE_COLORS[s.role] ?? "#64748b";
              return (
                <tr key={s.abbr} style={{
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>{s.name}</td>
                  <td className="px-3 py-2 font-mono font-bold" style={{ color: roleColor }}>{s.abbr}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: "var(--accent-lime)" }}>{s.cpu.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: "#3b82f6" }}>{s.power.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}33` }}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--text-muted)" }}>{s.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Card>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Le <Abbr full="Launchpad — 500 000 m³, seul point d'accès orbital" color="var(--accent-lime)">Launchpad</Abbr> est incontournable sur chaque planète : c'est
          le seul point depuis lequel tu peux envoyer tes produits en orbite pour les récupérer en vaisseau (via le <Abbr>POCO</Abbr>).
          Le <Abbr>HTPP</Abbr> ne peut être posé que sur les planètes{" "}
          <strong style={{ color: "#a8845a" }}>Barren</strong> et <strong style={{ color: "#4caf6e" }}>Temperate</strong>.
        </p>
      </Card>
    </div>
  );
}

// ─── Section 4 : Recettes ────────────────────────────────────────────────────

type RecipeTier = "P2" | "P3" | "P4";

function RecipesSection() {
  const [tier, setTier] = useState<RecipeTier>("P2");
  const [search, setSearch] = useState("");

  const products = useMemo(() => {
    const list = tier === "P2" ? P2_PRODUCTS : tier === "P3" ? P3_PRODUCTS : P4_PRODUCTS;
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.inputs?.some(i => (ALL_PRODUCTS[i.productId]?.name ?? "").toLowerCase().includes(q))
    );
  }, [tier, search]);

  const tierColor = TIER_CONFIG[tier].color;

  return (
    <div className="space-y-4">
      {/* Tier tabs + search */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
          {(["P2", "P3", "P4"] as RecipeTier[]).map(t => {
            const active = tier === t;
            const c = TIER_CONFIG[t].color;
            return (
              <button key={t} onClick={() => setTier(t)}
                className="px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: active ? `${c}22` : "transparent",
                  color: active ? c : "var(--text-muted)",
                  border: active ? `1px solid ${c}44` : "1px solid transparent",
                }}>
                {t}
              </button>
            );
          })}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un produit ou ingrédient..."
          className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Recipe cards */}
      <div className="grid grid-cols-2 gap-2">
        {products.map(p => {
          const inputs = p.inputs ?? [];
          return (
            <div key={p.id} className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${tierColor}22` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ background: `${tierColor}22`, color: tierColor }}>{tier}</div>
                <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{p.name}</span>
              </div>
              <div className="space-y-1">
                {inputs.map((inp, idx) => {
                  const inputProduct = ALL_PRODUCTS[inp.productId];
                  const inputTier = inputProduct?.tier ?? "P0";
                  const inputColor = TIER_CONFIG[inputTier as keyof typeof TIER_CONFIG]?.color ?? "#64748b";
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                        style={{ background: `${inputColor}22`, color: inputColor }}>{inputTier}</div>
                      <span style={{ color: "var(--text-secondary)" }}>{inputProduct?.name ?? inp.productId}</span>
                      <span className="ml-auto font-mono" style={{ color: "var(--text-muted)" }}>×{inp.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section 5 : Chaîne de production ────────────────────────────────────────

function ChainSection() {
  const tiers = [
    { tier: "P0", color: TIER_CONFIG.P0.color, label: "Ressources brutes",    desc: "Extraites par ECU",                          ratio: "—" },
    { tier: "P1", color: TIER_CONFIG.P1.color, label: "Commodités de base",   desc: "Transformées en BIF (cycle 30 min)",         ratio: "3 000 P0 → 20 P1" },
    { tier: "P2", color: TIER_CONFIG.P2.color, label: "Raffinés",             desc: "Transformés en AIF (cycle 1h)",              ratio: "40+40 P1 → 5 P2" },
    { tier: "P3", color: TIER_CONFIG.P3.color, label: "Spécialisés",          desc: "Transformés en AIF (cycle 1h)",              ratio: "10+10 P2 → 3 P3" },
    { tier: "P4", color: TIER_CONFIG.P4.color, label: "Avancés",              desc: "Transformés en HTPP (cycle 1h) · Barren/Temperate", ratio: "6+6+6 P3 → 3 P4" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-0">
        {tiers.map((t, i) => (
          <div key={t.tier} className="flex-1 flex items-stretch">
            <div className="flex-1 rounded-xl p-4" style={{
              background: `${t.color}09`,
              border: `1px solid ${t.color}33`,
              marginLeft: i === 0 ? 0 : 4,
            }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mb-3"
                style={{ background: `${t.color}22`, color: t.color }}>{t.tier}</div>
              <div className="text-xs font-semibold mb-1" style={{ color: t.color }}>{t.label}</div>
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{t.desc}</div>
              {t.ratio !== "—" && (
                <div className="text-xs px-2 py-1 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                  {t.ratio}
                </div>
              )}
            </div>
            {i < tiers.length - 1 && (
              <div className="flex items-center px-1 text-base shrink-0" style={{ color: "var(--text-muted)" }}>→</div>
            )}
          </div>
        ))}
      </div>

      <Card>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Règles clés</h3>
        <ul className="space-y-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          <li>• Un <Abbr>BIF</Abbr> traite une seule ressource P0 à la fois. Il faut un <Abbr>BIF</Abbr> par P0 différent.</li>
          <li>• Un <Abbr>AIF</Abbr> traite une seule recette (P2 ou P3) à la fois. Plusieurs <Abbr>AIF</Abbr> en parallèle pour plusieurs recettes.</li>
          <li>• Un <Abbr>HTPP</Abbr> produit 1 recette P4 et nécessite <strong style={{ color: "var(--text-primary)" }}>3 types de P3 différents</strong>.</li>
          <li>• Les structures doivent être connectées par des <strong style={{ color: "var(--text-primary)" }}>liens</strong> pour s'échanger des matériaux automatiquement.</li>
          <li>• Le <Abbr>LP</Abbr> et les Storage Facilities servent de <strong style={{ color: "var(--text-primary)" }}>tampons</strong> — sans eux les structures s'arrêtent si les buffers sont pleins.</li>
        </ul>
      </Card>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "competences", label: "Compétences & Contraintes" },
  { id: "planetes",    label: "Planètes & Ressources" },
  { id: "chaine",      label: "Chaîne de production" },
  { id: "structures",  label: "Structures & Coûts" },
  { id: "recettes",    label: "Recettes" },
];

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("competences");

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header title="Guide PI" subtitle="Apprendre la Planetary Interaction — interactif" />

        <div className="flex flex-1 min-h-0">
          {/* Left nav */}
          <nav className="w-52 shrink-0 p-4 sticky top-10 self-start" style={{ borderRight: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Sections</p>
            <div className="space-y-0.5">
              {SECTIONS.map(s => {
                const active = activeSection === s.id;
                return (
                  <button key={s.id} onClick={() => {
                    setActiveSection(s.id);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer"
                    style={{
                      background: active ? "rgba(163,230,53,0.1)" : "transparent",
                      color: active ? "var(--accent-lime)" : "var(--text-secondary)",
                      borderLeft: active ? "2px solid var(--accent-lime)" : "2px solid transparent",
                    }}>
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Outils NETK PI</p>
              {[
                { href: "/",        label: "Calculateur" },
                { href: "/finder",  label: "Finder" },
                { href: "/skills",  label: "Skills" },
                { href: "/timers",  label: "Timers" },
                { href: "/craft",   label: "Craft" },
              ].map(l => (
                <a key={l.href} href={l.href}
                  className="block px-3 py-1.5 rounded text-xs transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                  → {l.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 p-6 space-y-12 overflow-y-auto">

            {/* ── Compétences ── */}
            <section id="competences">
              <SectionTitle id="competences">Compétences & Contraintes</SectionTitle>
              <SectionSub>
                Règle les sliders à tes niveaux actuels — les setups disponibles se mettent à jour en temps réel.
              </SectionSub>
              <SimulateurSection />
            </section>

            {/* ── Planètes ── */}
            <section id="planetes">
              <SectionTitle id="planetes">Planètes & Ressources</SectionTitle>
              <SectionSub>
                Clique sur un type de planète pour voir les ressources P0 extractibles, les P1 produisibles et les P2 réalisables en autonome sur ce type.
              </SectionSub>
              <PlanetSection />
            </section>

            {/* ── Chaîne ── */}
            <section id="chaine">
              <SectionTitle id="chaine">Chaîne de production</SectionTitle>
              <SectionSub>
                Chaque tier transforme les matériaux du tier précédent. Plus le tier est élevé, plus la valeur ajoutée est grande.
              </SectionSub>
              <ChainSection />
            </section>

            {/* ── Structures ── */}
            <section id="structures">
              <SectionTitle id="structures">Structures & Coûts</SectionTitle>
              <SectionSub>
                Coûts CPU et Power Grid réels (source : EVE University Wiki). La somme de toutes tes structures ne doit pas dépasser la grille disponible.
              </SectionSub>
              <StructuresSection />
            </section>

            {/* ── Recettes ── */}
            <section id="recettes">
              <SectionTitle id="recettes">Recettes de production</SectionTitle>
              <SectionSub>
                Toutes les recettes P2, P3 et P4. Recherche par nom de produit ou d'ingrédient.
              </SectionSub>
              <RecipesSection />
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
