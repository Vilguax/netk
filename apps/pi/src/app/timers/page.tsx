"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, Globe, RefreshCw, AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { PLANET_TYPE_LABELS, PLANET_TYPE_COLORS, type PlanetType } from "@/data/pi-chains";

interface ColonyTimer {
  id: string;
  characterName: string;
  planetName: string;
  planetType: PlanetType;
  lastRun: string;       // ISO datetime
  cycleDurationH: number; // heures
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
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTimers(timers: ColonyTimer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
}

function getNextRun(timer: ColonyTimer): Date {
  return new Date(new Date(timer.lastRun).getTime() + timer.cycleDurationH * 3600 * 1000);
}

function formatCountdown(ms: number): { text: string; urgent: boolean; overdue: boolean } {
  if (ms < 0) {
    const overMs = Math.abs(ms);
    const h = Math.floor(overMs / 3600000);
    const m = Math.floor((overMs % 3600000) / 60000);
    return { text: `En retard de ${h}h ${m}m`, urgent: true, overdue: true };
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h < 2) return { text: `${h}h ${m}m`, urgent: true, overdue: false };
  if (h < 6) return { text: `${h}h ${m}m`, urgent: false, overdue: false };
  return { text: `${h}h ${m}m`, urgent: false, overdue: false };
}

function TimerCard({ timer, onDelete, onRerun }: { timer: ColonyTimer; onDelete: () => void; onRerun: () => void }) {
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
        border: `1px solid ${overdue ? "rgba(239, 68, 68, 0.4)" : urgent ? "rgba(245, 158, 11, 0.3)" : "var(--border)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: planetColor }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{timer.planetName}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{timer.characterName}</p>
          </div>
        </div>
        <div
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: `${planetColor}18`, color: planetColor }}
        >
          {PLANET_TYPE_LABELS[timer.planetType]}
        </div>
      </div>

      {/* Product */}
      {timer.product && (
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          Produit : <span style={{ color: "var(--text-primary)" }}>{timer.product}</span>
        </p>
      )}

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-2" style={{ background: "rgba(148, 163, 184, 0.1)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            background: overdue ? "#ef4444" : urgent ? "#f59e0b" : "var(--accent-lime)",
          }}
        />
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {(overdue || urgent) && <AlertTriangle size={12} style={{ color: overdue ? "#ef4444" : "#f59e0b" }} />}
          <span
            className="text-sm font-mono font-semibold"
            style={{ color: overdue ? "#ef4444" : urgent ? "#f59e0b" : "var(--text-secondary)" }}
          >
            {text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRerun}
            className="p-1.5 rounded-lg transition-colors duration-150 cursor-pointer"
            style={{ background: "rgba(163, 230, 53, 0.1)", color: "var(--accent-lime)" }}
            title="Marquer comme relancé maintenant"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors duration-150 cursor-pointer"
            style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
            title="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  characterName: "",
  planetName: "",
  planetType: "barren" as PlanetType,
  lastRun: new Date().toISOString().slice(0, 16),
  cycleDurationH: 24,
  product: "",
};

export default function TimersPage() {
  const [timers, setTimers] = useState<ColonyTimer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    setTimers(loadTimers());
  }, []);

  const persist = useCallback((updated: ColonyTimer[]) => {
    setTimers(updated);
    saveTimers(updated);
  }, []);

  function addTimer() {
    if (!form.characterName || !form.planetName) return;
    const newTimer: ColonyTimer = {
      id: crypto.randomUUID(),
      ...form,
      lastRun: new Date(form.lastRun).toISOString(),
    };
    persist([...timers, newTimer]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function deleteTimer(id: string) {
    persist(timers.filter((t) => t.id !== id));
  }

  function rerunTimer(id: string) {
    persist(timers.map((t) => t.id === id ? { ...t, lastRun: new Date().toISOString() } : t));
  }

  // Sort: overdue first, then urgent, then by next run
  const sorted = [...timers].sort((a, b) => {
    const na = getNextRun(a).getTime();
    const nb = getNextRun(b).getTime();
    return na - nb;
  });

  const overdueCount = timers.filter((t) => getNextRun(t).getTime() < Date.now()).length;

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header
          title="Timers de colonies"
          subtitle={overdueCount > 0 ? `${overdueCount} colonie${overdueCount > 1 ? "s" : ""} en retard` : "Suivez vos cycles d'extraction"}
        />

        <div className="p-6">
          {/* Actions bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock size={16} style={{ color: "var(--accent-lime)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {timers.length} colonie{timers.length !== 1 ? "s" : ""} suivie{timers.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer"
              style={{ background: "rgba(163, 230, 53, 0.15)", color: "var(--accent-lime)", border: "1px solid rgba(163, 230, 53, 0.3)" }}
            >
              <Plus size={14} />
              Ajouter une colonie
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div
              className="rounded-xl p-5 mb-6"
              style={{ background: "var(--card-bg)", border: "1px solid rgba(163, 230, 53, 0.25)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Nouvelle colonie</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Personnage</span>
                  <input
                    type="text"
                    placeholder="Nom du personnage"
                    value={form.characterName}
                    onChange={(e) => setForm({ ...form, characterName: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Nom de la planète</span>
                  <input
                    type="text"
                    placeholder="ex: Jita IV"
                    value={form.planetName}
                    onChange={(e) => setForm({ ...form, planetName: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </label>

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
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Produit</span>
                  <input
                    type="text"
                    placeholder="ex: Coolant, Robotics…"
                    value={form.product}
                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                    className="px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
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
                  style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  Annuler
                </button>
                <button
                  onClick={addTimer}
                  disabled={!form.characterName || !form.planetName}
                  className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-40"
                  style={{ background: "rgba(163, 230, 53, 0.2)", color: "var(--accent-lime)", border: "1px solid rgba(163, 230, 53, 0.4)" }}
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}

          {/* Timers grid */}
          {sorted.length === 0 ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
            >
              <Clock size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Aucune colonie suivie. Ajoutez-en une pour commencer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((timer) => (
                <TimerCard
                  key={timer.id}
                  timer={timer}
                  onDelete={() => deleteTimer(timer.id)}
                  onRerun={() => rerunTimer(timer.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
