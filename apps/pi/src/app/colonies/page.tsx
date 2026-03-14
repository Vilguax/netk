"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  RefreshCw, Globe, AlertTriangle, ChevronDown, ChevronUp,
  Bell, BellOff, Download, CheckCircle2, Clock, Zap, WifiOff,
  Navigation, Check, Plus, Trash2,
} from "lucide-react";
import { PLANET_TYPE_COLORS, PLANET_TYPE_LABELS, type PlanetType } from "@/data/pi-chains";
import { STRUCTURE_TYPE_IDS } from "@/data/pi-type-ids";

// ─── API types ────────────────────────────────────────────────────────────────

interface ColonyExtractor {
  pinId: number;
  typeId: number;
  productTypeId: number | null;
  productTypeName: string | null;
  qtyPerCycle: number | null;
  expiryTime: string | null;
  installTime: string | null;
  lastCycleStart: string | null;
}

interface ColonyFactory {
  pinId: number;
  typeId: number;
  outputTypeId: number | null;
  outputTypeName: string | null;
}

interface ColonyPlanet {
  planetId: number;
  planetType: string;
  upgradeLevel: number;
  solarSystemId: number;
  systemName: string;
  numPins: number;
  lastUpdate: string;
  extractors: ColonyExtractor[];
  factories: ColonyFactory[];
  infrastructureCount: number;
}

interface ColonyCharacter {
  characterId: string;
  characterName: string;
  status: "ok" | "no_token" | "no_scope" | "esi_error";
  planets: ColonyPlanet[];
}

interface ColoniesResponse { characters: ColonyCharacter[] }

// ─── Manual timer types (localStorage) ───────────────────────────────────────

interface ManualTimer {
  id: string;
  characterName: string;
  planetName: string;
  planetType: PlanetType;
  lastRun: string;
  cycleDurationH: number;
  product: string;
}

const STORAGE_KEY = "netk-pi-timers";
function loadTimers(): ManualTimer[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveTimers(t: ManualTimer[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

// ─── Countdown / time helpers ─────────────────────────────────────────────────

function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

function fmtCountdown(ms: number): { text: string; urgent: boolean; overdue: boolean } {
  if (ms < 0) {
    const h = Math.floor(Math.abs(ms) / 3600000);
    const m = Math.floor((Math.abs(ms) % 3600000) / 60000);
    return { text: `Expiré ${h}h${m}m`, urgent: true, overdue: true };
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { text: `${h}h ${m}m`, urgent: h < 2, overdue: false };
}

function urgencyColor(overdue: boolean, urgent: boolean) {
  return overdue ? "#ef4444" : urgent ? "#f59e0b" : "#4caf6e";
}

function nearestExpiry(planet: ColonyPlanet): number {
  const times = planet.extractors
    .map(e => e.expiryTime ? new Date(e.expiryTime).getTime() : null)
    .filter((t): t is number => t !== null);
  return times.length ? Math.min(...times) : Infinity;
}

// ─── Extractor row (inside planet card) ──────────────────────────────────────

function ExtractorRow({ ext, planetType, now }: { ext: ColonyExtractor; planetType: string; now: number }) {
  const pColor  = PLANET_TYPE_COLORS[planetType as PlanetType] ?? "#64748b";
  const expiryMs = ext.expiryTime ? new Date(ext.expiryTime).getTime() : null;
  const ms       = expiryMs != null ? expiryMs - now : null;
  const { text, urgent, overdue } = ms != null ? fmtCountdown(ms) : { text: "Inactif", urgent: false, overdue: false };
  const installMs   = ext.installTime ? new Date(ext.installTime).getTime() : null;
  const totalDur    = expiryMs && installMs ? expiryMs - installMs : null;
  const progress    = totalDur && ms != null ? Math.max(0, Math.min(100, ((totalDur - ms) / totalDur) * 100)) : 0;

  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : urgent ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          Pin #{String(ext.pinId).slice(-4)}
          {ext.productTypeName && (
            <span style={{ color: pColor }}> · {ext.productTypeName}</span>
          )}
        </span>
        {expiryMs && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {new Date(expiryMs).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      {totalDur != null && (
        <div className="h-1 rounded-full mb-1.5" style={{ background: "rgba(148,163,184,0.1)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: urgencyColor(overdue, urgent) }} />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        {(overdue || urgent) && <AlertTriangle size={10} style={{ color: urgencyColor(overdue, urgent) }} />}
        <span className="text-sm font-mono font-semibold" style={{ color: urgencyColor(overdue, urgent) }}>{text}</span>
      </div>
    </div>
  );
}

// ─── Planet card (ESI) ────────────────────────────────────────────────────────

function PlanetCard({ planet, characterName, characterId, now, notifEnabled, onNotifToggle }: {
  planet: ColonyPlanet;
  characterName: string;
  characterId: string;
  now: number;
  notifEnabled: boolean;
  onNotifToggle: () => void;
}) {
  const [expanded, setExpanded]           = useState(false);
  const [destoState, setDestoState]       = useState<"idle" | "loading" | "ok" | "err">("idle");
  const pColor = PLANET_TYPE_COLORS[planet.planetType as PlanetType] ?? "#64748b";

  const expiry  = nearestExpiry(planet);
  const ms      = expiry !== Infinity ? expiry - now : null;
  const cd      = ms != null ? fmtCountdown(ms) : null;

  async function setDesto() {
    setDestoState("loading");
    try {
      const r = await fetch("/api/waypoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, systemId: planet.solarSystemId }),
      });
      setDestoState(r.ok ? "ok" : "err");
    } catch { setDestoState("err"); }
    setTimeout(() => setDestoState("idle"), 2500);
  }

  const extractedP0    = [...new Set(planet.extractors.map(e => e.productTypeName).filter((n): n is string => n != null))];
  const runningProducts = [...new Set(planet.factories.map(f => f.outputTypeName).filter((n): n is string => n != null))];
  const activeExtractors = planet.extractors.filter(e => e.expiryTime);

  const infraLabel = planet.infrastructureCount > 0 ? `${planet.infrastructureCount}× LP/Storage` : null;
  const structureLabel = [
    activeExtractors.length > 0 ? `${activeExtractors.length}× ECU` : null,
    planet.factories.length > 0 ? `${planet.factories.length}× Usine` : null,
    infraLabel,
  ].filter(Boolean).join(" · ");

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${cd?.overdue ? "rgba(239,68,68,0.4)" : cd?.urgent ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{planet.systemName}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: pColor }}>{PLANET_TYPE_LABELS[planet.planetType as PlanetType] ?? planet.planetType}</span>
            {" · niv. "}{planet.upgradeLevel}
            {" · "}{characterName}
          </p>
        </div>

        {/* Timer badge */}
        {cd && (
          <div
            className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-semibold"
            style={{ background: urgencyColor(cd.overdue, cd.urgent) + "18", color: urgencyColor(cd.overdue, cd.urgent), border: `1px solid ${urgencyColor(cd.overdue, cd.urgent)}40` }}
          >
            <Clock size={10} />
            {cd.text}
          </div>
        )}
      </div>

      {/* P0 extraction tags */}
      {extractedP0.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {extractedP0.map(name => (
            <span key={name} className="text-xs px-1.5 py-0.5 rounded" style={{ background: pColor + "18", color: pColor, border: `1px solid ${pColor}35` }}>
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Factory outputs */}
      {runningProducts.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {runningProducts.map(name => (
            <span key={name} className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Expandable extractor detail */}
      {activeExtractors.length > 0 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-4 py-1.5 text-xs transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span>{structureLabel}</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {expanded && activeExtractors.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {activeExtractors.map(ext => <ExtractorRow key={ext.pinId} ext={ext} planetType={planet.planetType} now={now} />)}
        </div>
      )}

      {/* Footer actions */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.15)" }}
      >
        {!expanded && structureLabel && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{structureLabel}</span>
        )}
        {expanded && <span />}

        <div className="flex items-center gap-2">
          <button
            onClick={onNotifToggle}
            title={notifEnabled ? "Désactiver alertes" : "Activer alertes"}
            className="p-1 rounded transition-colors hover:bg-white/5"
            style={{ color: notifEnabled ? "#4caf6e" : "var(--text-muted)" }}
          >
            {notifEnabled ? <Bell size={13} /> : <BellOff size={13} />}
          </button>
          <button
            onClick={setDesto}
            disabled={destoState === "loading"}
            title={`Set destination → ${planet.systemName}`}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all disabled:opacity-50"
            style={{
              background: destoState === "ok" ? "rgba(163,230,53,0.15)" : destoState === "err" ? "rgba(239,68,68,0.15)" : "rgba(56,189,248,0.1)",
              color:      destoState === "ok" ? "var(--accent-lime)"     : destoState === "err" ? "#ef4444"               : "#38bdf8",
              border:     `1px solid ${destoState === "ok" ? "rgba(163,230,53,0.3)" : destoState === "err" ? "rgba(239,68,68,0.3)" : "rgba(56,189,248,0.25)"}`,
            }}
          >
            {destoState === "ok" ? <Check size={11} /> : destoState === "err" ? <AlertTriangle size={11} /> : <Navigation size={11} />}
            {destoState === "ok" ? "Défini !" : destoState === "err" ? "Erreur" : destoState === "loading" ? "…" : "Set desto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Character section (grouped view) ────────────────────────────────────────

function CharacterSection({ char, now, notifPlanets, onNotifToggle }: {
  char: ColonyCharacter;
  now: number;
  notifPlanets: Set<number>;
  onNotifToggle: (id: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const expired = char.planets.filter(p => p.extractors.some(e => e.expiryTime && new Date(e.expiryTime).getTime() < now)).length;
  const urgent  = char.planets.filter(p => !p.extractors.some(e => e.expiryTime && new Date(e.expiryTime).getTime() < now) && p.extractors.some(e => { if (!e.expiryTime) return false; const ms = new Date(e.expiryTime).getTime() - now; return ms > 0 && ms < 7200000; })).length;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden bg-white/10">
          <img src={`https://images.evetech.net/characters/${char.characterId}/portrait?size=64`} alt={char.characterName} className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-semibold flex-1 text-left" style={{ color: "var(--text-primary)" }}>{char.characterName}</span>
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: "var(--text-muted)" }}>{char.planets.length} planète{char.planets.length > 1 ? "s" : ""}</span>
          {expired > 0 && <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>{expired} expiré{expired > 1 ? "s" : ""}</span>}
          {urgent  > 0 && <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{urgent} urgent{urgent > 1 ? "s" : ""}</span>}
        </div>
        {open ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
      </button>

      {char.status !== "ok" && (
        <div className="px-4 py-3 flex items-center gap-2 text-sm" style={{ color: "#f59e0b" }}>
          <WifiOff size={14} />
          {char.status === "no_scope" && "Scope manquant — relinkez depuis Compte → Personnages"}
          {char.status === "no_token" && "Token ESI expiré — reconnectez le personnage"}
          {char.status === "esi_error" && "Erreur ESI"}
        </div>
      )}

      {open && char.status === "ok" && char.planets.length > 0 && (
        <div className="p-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {[...char.planets].sort((a, b) => nearestExpiry(a) - nearestExpiry(b)).map(p => (
            <PlanetCard key={p.planetId} planet={p} characterName={char.characterName} characterId={char.characterId} now={now} notifEnabled={notifPlanets.has(p.planetId)} onNotifToggle={() => onNotifToggle(p.planetId)} />
          ))}
        </div>
      )}
      {open && char.status === "ok" && char.planets.length === 0 && (
        <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Aucune colonie PI active</p>
      )}
    </div>
  );
}

// ─── Production summary ───────────────────────────────────────────────────────

function ProductionSummary({ data }: { data: ColoniesResponse }) {
  const p0Map: Record<string, number> = {};
  const prodMap: Record<string, number> = {};
  for (const c of data.characters) for (const p of c.planets) {
    for (const e of p.extractors) if (e.productTypeName) p0Map[e.productTypeName] = (p0Map[e.productTypeName] ?? 0) + 1;
    for (const f of p.factories) if (f.outputTypeName) prodMap[f.outputTypeName] = (prodMap[f.outputTypeName] ?? 0) + 1;
  }
  const p0s  = Object.entries(p0Map).sort((a, b) => b[1] - a[1]);
  const prods = Object.entries(prodMap).sort((a, b) => b[1] - a[1]);
  if (!p0s.length && !prods.length) return null;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Résumé de production</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {p0s.length > 0 && (
          <div>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Ressources extraites (P0)</p>
            <div className="space-y-1">
              {p0s.map(([name, n]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>{name}</span>
                  <span style={{ color: "var(--text-muted)" }}>{n}× ECU</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {prods.length > 0 && (
          <div>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Produits en cours</p>
            <div className="space-y-1">
              {prods.map(([name, n]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span style={{ color: "#a855f7" }}>{name}</span>
                  <span style={{ color: "var(--text-muted)" }}>{n}× usine</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(data: ColoniesResponse) {
  const rows = ["Personnage,Système,Type,Niveau,Extraction P0,Production,Expiration"];
  for (const c of data.characters) for (const p of c.planets) {
    const p0  = p.extractors.map(e => e.productTypeName ?? "").filter(Boolean).join(" | ");
    const sc  = p.factories.map(f => f.outputTypeName ?? "").filter(Boolean).join(" | ");
    const exp = p.extractors.map(e => e.expiryTime ? new Date(e.expiryTime).toLocaleString("fr-FR") : "").filter(Boolean).join(" | ");
    rows.push([c.characterName, p.systemName, PLANET_TYPE_LABELS[p.planetType as PlanetType] ?? p.planetType, p.upgradeLevel, p0, sc, exp].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" }));
  a.download = "colonies-pi.csv"; a.click();
}

// ─── Manual timer card ────────────────────────────────────────────────────────

const CYCLE_DURATIONS = [{ label: "23h", value: 23 }, { label: "24h", value: 24 }, { label: "3 jours", value: 72 }, { label: "4 jours", value: 96 }];
const EMPTY_FORM = { characterName: "", planetName: "", planetType: "barren" as PlanetType, lastRun: new Date().toISOString().slice(0, 16), cycleDurationH: 24, product: "" };

function ManualCard({ timer, now, onDelete, onRerun }: { timer: ManualTimer; now: number; onDelete: () => void; onRerun: () => void }) {
  const nextRun = new Date(new Date(timer.lastRun).getTime() + timer.cycleDurationH * 3_600_000);
  const ms      = nextRun.getTime() - now;
  const { text, urgent, overdue } = fmtCountdown(ms);
  const progress  = Math.max(0, Math.min(100, ((timer.cycleDurationH * 3_600_000 - ms) / (timer.cycleDurationH * 3_600_000)) * 100));
  const pColor    = PLANET_TYPE_COLORS[timer.planetType] ?? "#64748b";

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${overdue ? "rgba(239,68,68,0.4)" : urgent ? "rgba(245,158,11,0.3)" : "var(--border)"}` }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: pColor }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{timer.planetName}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{timer.characterName} · {PLANET_TYPE_LABELS[timer.planetType]}</p>
          </div>
        </div>
        <span className="text-xs px-1.5 py-0.5 rounded shrink-0 ml-2" style={{ background: pColor + "18", color: pColor }}>{timer.cycleDurationH}h</span>
      </div>
      {timer.product && <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{timer.product}</p>}
      <div className="h-1.5 rounded-full mb-2" style={{ background: "rgba(148,163,184,0.1)" }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: urgencyColor(overdue, urgent) }} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {(overdue || urgent) && <AlertTriangle size={11} style={{ color: urgencyColor(overdue, urgent) }} />}
          <span className="text-sm font-mono font-semibold" style={{ color: urgencyColor(overdue, urgent) }}>{text}</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onRerun} className="p-1.5 rounded" style={{ background: "rgba(163,230,53,0.1)", color: "var(--accent-lime)" }} title="Relancer maintenant"><RefreshCw size={13} /></button>
          <button onClick={onDelete} className="p-1.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }} title="Supprimer"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── ESI section (shared fetch logic) ────────────────────────────────────────

function useColonies() {
  const [data, setData]       = useState<ColoniesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/colonies");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
      setLastFetch(new Date());
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur inconnue"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, lastFetch, reload: load };
}

// ─── Main page ────────────────────────────────────────────────────────────────

type View = "urgence" | "personnage" | "manuel";

export default function ColoniesPage() {
  const { data, loading, error, lastFetch, reload } = useColonies();
  const [view, setView]               = useState<View>("urgence");
  const [notifPlanets, setNotifPlanets] = useState<Set<number>>(new Set());
  const [manualTimers, setManualTimers] = useState<ManualTimer[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const now = useNow();

  useEffect(() => { setManualTimers(loadTimers()); }, []);

  // Browser notifications
  const notifRef = useRef<NotificationPermission | null>(null);
  useEffect(() => { if ("Notification" in window) notifRef.current = Notification.permission; }, []);

  useEffect(() => {
    if (!data || notifPlanets.size === 0) return;
    const id = setInterval(() => {
      for (const c of data.characters) for (const p of c.planets) {
        if (!notifPlanets.has(p.planetId)) continue;
        for (const e of p.extractors) {
          if (!e.expiryTime) continue;
          const ms = new Date(e.expiryTime).getTime() - Date.now();
          if (ms > 0 && ms < 65_000 && Notification.permission === "granted") {
            new Notification("NETK PI — Extraction expire bientôt", {
              body: `${c.characterName} · ${p.systemName} (${PLANET_TYPE_LABELS[p.planetType as PlanetType] ?? p.planetType})`,
              icon: "/favicon.ico",
            });
          }
        }
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [data, notifPlanets]);

  async function handleNotifToggle(planetId: number) {
    if (Notification.permission === "default") await Notification.requestPermission();
    setNotifPlanets(prev => { const n = new Set(prev); n.has(planetId) ? n.delete(planetId) : n.add(planetId); return n; });
  }

  function persistTimers(t: ManualTimer[]) { setManualTimers(t); saveTimers(t); }

  function addManualTimer() {
    if (!form.characterName || !form.planetName) return;
    persistTimers([...manualTimers, { id: crypto.randomUUID(), ...form, lastRun: new Date(form.lastRun).toISOString() }]);
    setForm(EMPTY_FORM); setShowForm(false);
  }

  const allPlanets = data?.characters.flatMap(c => c.planets.map(p => ({ planet: p, characterName: c.characterName, characterId: c.characterId }))) ?? [];
  const sortedByUrgency = [...allPlanets].sort((a, b) => nearestExpiry(a.planet) - nearestExpiry(b.planet));
  const expiredCount = allPlanets.filter(({ planet }) => planet.extractors.some(e => e.expiryTime && new Date(e.expiryTime).getTime() < now)).length;
  const urgentCount  = allPlanets.filter(({ planet }) => !planet.extractors.some(e => e.expiryTime && new Date(e.expiryTime).getTime() < now) && planet.extractors.some(e => { if (!e.expiryTime) return false; const ms = new Date(e.expiryTime).getTime() - now; return ms > 0 && ms < 7_200_000; })).length;

  const VIEWS: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "urgence",    label: "Par urgence",    icon: <Zap size={13} /> },
    { key: "personnage", label: "Par personnage",  icon: <Globe size={13} /> },
    { key: "manuel",     label: "Timers manuels", icon: <Clock size={13} /> },
  ];

  return (
    <div className="flex h-[calc(100vh-40px)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: 224 }}>
        <Header title="Colonies" subtitle="Suivi des colonies PI et cycles d'extraction" />

        <main className="flex-1 overflow-auto p-4 md:p-6 space-y-5">

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
              {VIEWS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: view === v.key ? "rgba(255,255,255,0.08)" : "transparent",
                    color: view === v.key ? "var(--accent-lime)" : "var(--text-muted)",
                    boxShadow: view === v.key ? "0 1px 6px rgba(0,0,0,0.3)" : "none",
                  }}
                >
                  {v.icon}{v.label}
                </button>
              ))}
            </div>

            {/* Stats */}
            {!loading && data && view !== "manuel" && (
              <>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{allPlanets.length} planète{allPlanets.length > 1 ? "s" : ""}</span>
                {expiredCount > 0 && <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}><AlertTriangle size={11} />{expiredCount} expiré{expiredCount > 1 ? "s" : ""}</span>}
                {urgentCount  > 0 && <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}><Zap size={11} />{urgentCount} urgent{urgentCount > 1 ? "s" : ""}</span>}
                {!expiredCount && !urgentCount && allPlanets.length > 0 && <span className="text-xs flex items-center gap-1" style={{ color: "#4caf6e" }}><CheckCircle2 size={13} />Tout OK</span>}
              </>
            )}
            {view === "manuel" && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{manualTimers.length} timer{manualTimers.length > 1 ? "s" : ""}</span>
            )}

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2">
              {lastFetch && !loading && view !== "manuel" && (
                <span className="text-xs hidden sm:block" style={{ color: "var(--text-muted)" }}>màj {lastFetch.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
              {data && view !== "manuel" && (
                <button onClick={() => exportCSV(data)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-white/5 transition-colors" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <Download size={13} />CSV
                </button>
              )}
              {view !== "manuel" && (
                <button onClick={reload} disabled={loading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-white/5 transition-colors disabled:opacity-40" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                  {loading ? "Chargement…" : "Actualiser"}
                </button>
              )}
              {view === "manuel" && (
                <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium" style={{ background: "rgba(163,230,53,0.12)", color: "var(--accent-lime)", border: "1px solid rgba(163,230,53,0.3)" }}>
                  <Plus size={13} />Ajouter
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg flex items-center gap-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
              <AlertTriangle size={16} /><span className="text-sm">{error}</span>
            </div>
          )}

          {/* Loading */}
          {loading && !data && view !== "manuel" && (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }} />)}</div>
          )}

          {/* ── View: Par urgence ── */}
          {view === "urgence" && !loading && data && (
            <>
              {sortedByUrgency.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Globe size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Aucune colonie active</p>
                </div>
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {sortedByUrgency.map(({ planet, characterName, characterId }) => (
                    <PlanetCard key={`${characterId}-${planet.planetId}`} planet={planet} characterName={characterName} characterId={characterId} now={now} notifEnabled={notifPlanets.has(planet.planetId)} onNotifToggle={() => handleNotifToggle(planet.planetId)} />
                  ))}
                </div>
              )}
              {data && <ProductionSummary data={data} />}
            </>
          )}

          {/* ── View: Par personnage ── */}
          {view === "personnage" && !loading && data && (
            <div className="space-y-4">
              {data.characters.map(c => (
                <CharacterSection key={c.characterId} char={c} now={now} notifPlanets={notifPlanets} onNotifToggle={handleNotifToggle} />
              ))}
              <ProductionSummary data={data} />
            </div>
          )}

          {/* ── View: Timers manuels ── */}
          {view === "manuel" && (
            <>
              {showForm && (
                <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(163,230,53,0.25)" }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Nouveau timer</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { label: "Personnage", key: "characterName", placeholder: "Nom du personnage" },
                      { label: "Planète", key: "planetName", placeholder: "ex: Jita IV" },
                      { label: "Produit", key: "product", placeholder: "ex: Coolant, Robotics…" },
                    ].map(({ label, key, placeholder }) => (
                      <label key={key} className="flex flex-col gap-1.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                        <input type="text" placeholder={placeholder} value={form[key as keyof typeof form] as string}
                          onChange={e => setForm({ ...form, [key]: e.target.value })}
                          className="px-3 py-2 text-sm rounded-lg outline-none"
                          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                      </label>
                    ))}
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Type de planète</span>
                      <select value={form.planetType} onChange={e => setForm({ ...form, planetType: e.target.value as PlanetType })}
                        className="px-3 py-2 text-sm rounded-lg outline-none cursor-pointer"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                        {(Object.keys(PLANET_TYPE_LABELS) as PlanetType[]).map(t => <option key={t} value={t}>{PLANET_TYPE_LABELS[t]}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Dernière relance</span>
                      <input type="datetime-local" value={form.lastRun} onChange={e => setForm({ ...form, lastRun: e.target.value })}
                        className="px-3 py-2 text-sm rounded-lg outline-none"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)", colorScheme: "dark" }} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Durée du cycle</span>
                      <select value={form.cycleDurationH} onChange={e => setForm({ ...form, cycleDurationH: Number(e.target.value) })}
                        className="px-3 py-2 text-sm rounded-lg outline-none cursor-pointer"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                        {CYCLE_DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>Annuler</button>
                    <button onClick={addManualTimer} disabled={!form.characterName || !form.planetName} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-40" style={{ background: "rgba(163,230,53,0.2)", color: "var(--accent-lime)", border: "1px solid rgba(163,230,53,0.4)" }}>Ajouter</button>
                  </div>
                </div>
              )}

              {manualTimers.length === 0 && !showForm ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Clock size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Aucun timer manuel</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Pour les persos sans scope ESI planets.</p>
                </div>
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                  {[...manualTimers].sort((a, b) => new Date(a.lastRun).getTime() + a.cycleDurationH * 3_600_000 - new Date(b.lastRun).getTime() - b.cycleDurationH * 3_600_000).map(t => (
                    <ManualCard key={t.id} timer={t} now={now}
                      onDelete={() => persistTimers(manualTimers.filter(x => x.id !== t.id))}
                      onRerun={() => persistTimers(manualTimers.map(x => x.id === t.id ? { ...x, lastRun: new Date().toISOString() } : x))} />
                  ))}
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
