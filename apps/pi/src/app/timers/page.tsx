"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, Globe, RefreshCw, AlertTriangle, Zap, WifiOff, Navigation, ChevronDown, Check } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { PLANET_TYPE_LABELS, PLANET_TYPE_COLORS, type PlanetType } from "@/data/pi-chains";

// ─── Shared helpers ────────────────────────────────────────────────────────

function formatCountdown(ms: number): { text: string; urgent: boolean; overdue: boolean } {
  if (ms < 0) {
    const h = Math.floor(Math.abs(ms) / 3600000);
    const m = Math.floor((Math.abs(ms) % 3600000) / 60000);
    return { text: `Expiré depuis ${h}h ${m}m`, urgent: true, overdue: true };
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { text: `${h}h ${m}m`, urgent: h < 2, overdue: false };
}

// ─── AUTO MODE ─────────────────────────────────────────────────────────────

interface Extractor {
  pinId: number;
  typeId: number;
  expiryTime: string | null;
  installTime: string | null;
  lastCycleStart: string | null;
}

interface AutoPlanet {
  planetId: number;
  planetType: string;
  upgradeLevel: number;
  solarSystemId: number;
  systemName: string;
  numPins: number;
  lastUpdate: string;
  extractors: Extractor[];
}

interface AutoCharacter {
  characterId: string;
  characterName: string;
  status: "ok" | "no_token" | "no_scope" | "esi_error";
  planets: AutoPlanet[];
}

function ExtractorCard({ extractor, planetType }: { extractor: Extractor; planetType: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const planetColor = PLANET_TYPE_COLORS[planetType as PlanetType] ?? "#64748b";
  const expiryMs = extractor.expiryTime ? new Date(extractor.expiryTime).getTime() : null;
  const ms = expiryMs !== null ? expiryMs - now : null;
  const { text, urgent, overdue } = ms !== null ? formatCountdown(ms) : { text: "Pas d'extracteur actif", urgent: false, overdue: false };

  const installMs = extractor.installTime ? new Date(extractor.installTime).getTime() : null;
  const totalDuration = expiryMs && installMs ? expiryMs - installMs : null;
  const progress = totalDuration && ms !== null
    ? Math.max(0, Math.min(100, ((totalDuration - ms) / totalDuration) * 100))
    : 0;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "rgba(0,0,0,0.2)",
        border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : urgent ? "rgba(245,158,11,0.2)" : "var(--border)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: planetColor }} />
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            Pin #{extractor.pinId.toString().slice(-4)}
          </span>
        </div>
        {expiryMs && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {new Date(expiryMs).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {totalDuration && (
        <div className="h-1 rounded-full mb-2" style={{ background: "rgba(148,163,184,0.1)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: overdue ? "#ef4444" : urgent ? "#f59e0b" : "var(--accent-lime)",
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {(overdue || urgent) && <AlertTriangle size={11} style={{ color: overdue ? "#ef4444" : "#f59e0b" }} />}
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: overdue ? "#ef4444" : urgent ? "#f59e0b" : "var(--text-secondary)" }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

function AutoPlanetCard({
  planet,
  characterName,
  destoCharId,
  hasDestoChar,
}: {
  planet: AutoPlanet;
  characterName: string;
  destoCharId: string | null;
  hasDestoChar: boolean;
}) {
  const planetColor = PLANET_TYPE_COLORS[planet.planetType as PlanetType] ?? "#64748b";
  const activeExtractors = planet.extractors.filter((e) => e.expiryTime);
  const [destoState, setDestoState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function setDesto() {
    if (!destoCharId) return;
    setDestoState("loading");
    try {
      const r = await fetch("/api/waypoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: destoCharId, systemId: planet.solarSystemId }),
      });
      setDestoState(r.ok ? "ok" : "err");
    } catch {
      setDestoState("err");
    }
    setTimeout(() => setDestoState("idle"), 2500);
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: planetColor }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {planet.systemName}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{characterName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: `${planetColor}18`, color: planetColor }}
          >
            {PLANET_TYPE_LABELS[planet.planetType as PlanetType] ?? planet.planetType}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>CC {planet.upgradeLevel}</span>
          {hasDestoChar && (
            <button
              onClick={setDesto}
              disabled={destoState === "loading" || !destoCharId}
              title={`Set desto → ${planet.systemName}`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 transition-colors duration-150"
              style={{
                background: destoState === "ok"
                  ? "rgba(163,230,53,0.15)"
                  : destoState === "err"
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(148,163,184,0.08)",
                color: destoState === "ok"
                  ? "var(--accent-lime)"
                  : destoState === "err"
                    ? "#ef4444"
                    : "var(--text-muted)",
                border: `1px solid ${destoState === "ok" ? "rgba(163,230,53,0.3)" : destoState === "err" ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
              }}
            >
              {destoState === "ok" ? <Check size={10} /> : destoState === "err" ? <AlertTriangle size={10} /> : <Navigation size={10} />}
              {destoState === "ok" ? "Ok" : destoState === "err" ? "Erreur" : "Desto"}
            </button>
          )}
        </div>
      </div>

      {activeExtractors.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun extracteur actif</p>
      ) : (
        <div className="space-y-2">
          {activeExtractors.map((ext) => (
            <ExtractorCard key={ext.pinId} extractor={ext} planetType={planet.planetType} />
          ))}
        </div>
      )}
    </div>
  );
}

function AutoMode() {
  const [characters, setCharacters] = useState<AutoCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [destoCharId, setDestoCharId] = useState<string | null>(null);

  const fetchColonies = useCallback(() => {
    setLoading(true);
    fetch("/api/colonies")
      .then((r) => r.json())
      .then((data) => {
        if (data.characters) {
          setCharacters(data.characters);
          // Auto-select first character with waypoint scope
          setDestoCharId((prev) => {
            if (prev) return prev;
            const eligible = (data.characters as AutoCharacter[]).find(
              (c) => c.status === "ok"
            );
            return eligible?.characterId ?? null;
          });
        }
        setLastFetch(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchColonies(); }, [fetchColonies]);

  const noScopeChars = characters.filter((c) => c.status === "no_scope");
  const okChars = characters.filter((c) => c.status === "ok");
  const allPlanets = okChars.flatMap((c) =>
    c.planets.map((p) => ({ planet: p, characterName: c.characterName, characterId: c.characterId }))
  );

  // Sort: planets with soonest expiry first
  const sorted = [...allPlanets].sort((a, b) => {
    const aExpiry = Math.min(...a.planet.extractors.map((e) => e.expiryTime ? new Date(e.expiryTime).getTime() : Infinity));
    const bExpiry = Math.min(...b.planet.extractors.map((e) => e.expiryTime ? new Date(e.expiryTime).getTime() : Infinity));
    return aExpiry - bExpiry;
  });

  // Characters eligible for set-desto (need waypoint scope — included in default scopes)
  const destoEligible = characters.filter((c) => c.status === "ok");

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap size={15} style={{ color: "var(--accent-lime)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {loading ? "Chargement…" : `${allPlanets.length} planète${allPlanets.length !== 1 ? "s" : ""} • ESI`}
          </span>
          {lastFetch && !loading && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              màj {lastFetch.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {destoEligible.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Navigation size={12} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Desto via</span>
              <div className="relative">
                <select
                  value={destoCharId ?? ""}
                  onChange={(e) => setDestoCharId(e.target.value || null)}
                  className="pl-2 pr-6 py-1 text-xs rounded-lg outline-none cursor-pointer appearance-none"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                >
                  {destoEligible.map((c) => (
                    <option key={c.characterId} value={c.characterId}>{c.characterName}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
          )}
          <button
            onClick={fetchColonies}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer disabled:opacity-40"
            style={{ background: "rgba(163, 230, 53, 0.1)", color: "var(--accent-lime)", border: "1px solid rgba(163, 230, 53, 0.2)" }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </div>

      {/* No scope warning */}
      {noScopeChars.length > 0 && (
        <div
          className="rounded-xl p-4 mb-4 flex items-start gap-3"
          style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}
        >
          <WifiOff size={16} className="mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#f59e0b" }}>Scope manquant</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {noScopeChars.map((c) => c.characterName).join(", ")} — Re-linkez ce{noScopeChars.length > 1 ? "s" : ""} personnage{noScopeChars.length > 1 ? "s" : ""} depuis la page <strong>Compte → Personnages</strong> pour accorder le scope <code>esi-planets.manage_planets.v1</code>.
            </p>
          </div>
        </div>
      )}

      {/* Planets grid */}
      {loading && (
        <div className="flex items-center gap-2 py-8" style={{ color: "var(--text-muted)" }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-lime)", borderTopColor: "transparent" }} />
          Chargement des colonies depuis ESI…
        </div>
      )}

      {!loading && sorted.length === 0 && noScopeChars.length === 0 && (
        <div className="rounded-xl p-12 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
          <Globe size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Aucune colonie PI détectée.
          </p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(({ planet, characterName, characterId }) => (
            <AutoPlanetCard
              key={`${characterId}-${planet.planetId}`}
              planet={planet}
              characterName={characterName}
              destoCharId={destoCharId}
              hasDestoChar={destoEligible.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MANUAL MODE ───────────────────────────────────────────────────────────

interface ColonyTimer {
  id: string;
  characterName: string;
  planetName: string;
  planetType: PlanetType;
  lastRun: string;
  cycleDurationH: number;
  product: string;
}

const CYCLE_DURATIONS = [
  { label: "23 h", value: 23 },
  { label: "24 h", value: 24 },
  { label: "3 jours", value: 72 },
  { label: "4 jours", value: 96 },
];

const STORAGE_KEY = "netk-pi-timers";

function loadTimers(): ColonyTimer[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function saveTimers(timers: ColonyTimer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
}

function getNextRun(timer: ColonyTimer): Date {
  return new Date(new Date(timer.lastRun).getTime() + timer.cycleDurationH * 3600 * 1000);
}

function ManualTimerCard({ timer, onDelete, onRerun }: { timer: ColonyTimer; onDelete: () => void; onRerun: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nextRun = getNextRun(timer);
  const ms = nextRun.getTime() - now;
  const { text, urgent, overdue } = formatCountdown(ms);
  const progress = Math.max(0, Math.min(100, ((timer.cycleDurationH * 3600000 - ms) / (timer.cycleDurationH * 3600000)) * 100));
  const planetColor = PLANET_TYPE_COLORS[timer.planetType] ?? "#64748b";

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--card-bg)",
        border: `1px solid ${overdue ? "rgba(239,68,68,0.4)" : urgent ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: planetColor }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{timer.planetName}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{timer.characterName}</p>
          </div>
        </div>
        <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${planetColor}18`, color: planetColor }}>
          {PLANET_TYPE_LABELS[timer.planetType]}
        </div>
      </div>

      {timer.product && (
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          Produit : <span style={{ color: "var(--text-primary)" }}>{timer.product}</span>
        </p>
      )}

      <div className="h-1.5 rounded-full mb-2" style={{ background: "rgba(148,163,184,0.1)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: overdue ? "#ef4444" : urgent ? "#f59e0b" : "var(--accent-lime)",
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {(overdue || urgent) && <AlertTriangle size={12} style={{ color: overdue ? "#ef4444" : "#f59e0b" }} />}
          <span className="text-sm font-mono font-semibold" style={{ color: overdue ? "#ef4444" : urgent ? "#f59e0b" : "var(--text-secondary)" }}>
            {text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRerun} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "rgba(163,230,53,0.1)", color: "var(--accent-lime)" }} title="Relancé maintenant">
            <RefreshCw size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }} title="Supprimer">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  characterName: "", planetName: "", planetType: "barren" as PlanetType,
  lastRun: new Date().toISOString().slice(0, 16), cycleDurationH: 24, product: "",
};

function ManualMode() {
  const [timers, setTimers] = useState<ColonyTimer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { setTimers(loadTimers()); }, []);

  const persist = useCallback((updated: ColonyTimer[]) => {
    setTimers(updated);
    saveTimers(updated);
  }, []);

  function addTimer() {
    if (!form.characterName || !form.planetName) return;
    persist([...timers, { id: crypto.randomUUID(), ...form, lastRun: new Date(form.lastRun).toISOString() }]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  const sorted = [...timers].sort((a, b) => getNextRun(a).getTime() - getNextRun(b).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock size={15} style={{ color: "var(--accent-lime)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {timers.length} colonie{timers.length !== 1 ? "s" : ""} suivie{timers.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{ background: "rgba(163,230,53,0.15)", color: "var(--accent-lime)", border: "1px solid rgba(163,230,53,0.3)" }}
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-5 mb-6" style={{ background: "var(--card-bg)", border: "1px solid rgba(163,230,53,0.25)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Nouvelle colonie</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Personnage", key: "characterName", type: "text", placeholder: "Nom du personnage" },
              { label: "Nom de la planète", key: "planetName", type: "text", placeholder: "ex: Jita IV" },
              { label: "Produit", key: "product", type: "text", placeholder: "ex: Coolant, Robotics…" },
            ].map(({ label, key, type, placeholder }) => (
              <label key={key} className="flex flex-col gap-1.5">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg outline-none"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </label>
            ))}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Type de planète</span>
              <select
                value={form.planetType}
                onChange={(e) => setForm({ ...form, planetType: e.target.value as PlanetType })}
                className="px-3 py-2 text-sm rounded-lg outline-none cursor-pointer"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                {(Object.keys(PLANET_TYPE_LABELS) as PlanetType[]).map((t) => (
                  <option key={t} value={t}>{PLANET_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Dernière relance</span>
              <input
                type="datetime-local"
                value={form.lastRun}
                onChange={(e) => setForm({ ...form, lastRun: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)", colorScheme: "dark" }}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Durée du cycle</span>
              <select
                value={form.cycleDurationH}
                onChange={(e) => setForm({ ...form, cycleDurationH: Number(e.target.value) })}
                className="px-3 py-2 text-sm rounded-lg outline-none cursor-pointer"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                {CYCLE_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-3 py-2 rounded-lg text-sm cursor-pointer"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Annuler
            </button>
            <button
              onClick={addTimer}
              disabled={!form.characterName || !form.planetName}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-40"
              style={{ background: "rgba(163,230,53,0.2)", color: "var(--accent-lime)", border: "1px solid rgba(163,230,53,0.4)" }}
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
          <Clock size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Aucune colonie suivie. Ajoutez-en une pour commencer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((timer) => (
            <ManualTimerCard
              key={timer.id}
              timer={timer}
              onDelete={() => persist(timers.filter((t) => t.id !== timer.id))}
              onRerun={() => persist(timers.map((t) => t.id === timer.id ? { ...t, lastRun: new Date().toISOString() } : t))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

type Tab = "auto" | "manuel";

export default function TimersPage() {
  const [tab, setTab] = useState<Tab>("auto");

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header
          title="Timers de colonies"
          subtitle="Suivi des cycles d'extraction PI"
        />

        <div className="p-6">
          {/* Tab switcher */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
            {(["auto", "manuel"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
                style={{
                  background: tab === t ? "var(--card-bg)" : "transparent",
                  color: tab === t ? "var(--accent-lime)" : "var(--text-muted)",
                  boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {t === "auto" ? <Zap size={13} /> : <Clock size={13} />}
                {t === "auto" ? "Auto (ESI)" : "Manuel"}
              </button>
            ))}
          </div>

          {tab === "auto" ? <AutoMode /> : <ManualMode />}
        </div>
      </div>
    </div>
  );
}
