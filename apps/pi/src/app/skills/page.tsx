"use client";

import { useEffect, useState } from "react";
import { BookOpen, Globe, Wrench, Cpu, Satellite, ScanLine, Lightbulb, ChevronRight, Copy, Check } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  calculateConstraints,
  getRecommendedSetup,
  getSkillPlan,
  formatSkillPlanText,
  formatSp,
  SKILL_DESCRIPTIONS,
  type PISkills,
  type SkillStep,
} from "@/lib/pi-skills";

interface CharacterSkillData {
  characterId: string;
  characterName: string;
  skills: PISkills | null;
  status: "ok" | "no_token" | "esi_error";
}

const SKILL_ICONS: Record<keyof PISkills, React.ElementType> = {
  "Command Center Upgrades": Wrench,
  "Interplanetary Consolidation": Globe,
  "Planetology": ScanLine,
  "Advanced Planetology": Satellite,
  "Remote Sensing": Cpu,
};

const TIER_COLORS: Record<string, string> = {
  P1: "#64748b",
  P2: "#3b82f6",
  P3: "#f59e0b",
  P4: "#a3e635",
};

function SkillBar({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className="w-4 h-1.5 rounded-sm"
          style={{
            background: i < level ? "var(--accent-lime)" : "rgba(148, 163, 184, 0.2)",
          }}
        />
      ))}
    </div>
  );
}

function ConstraintRow({ label, value, color = "var(--accent-lime)" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="text-sm font-mono font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

export default function SkillsPage() {
  const [characters, setCharacters] = useState<CharacterSkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setCharacters(data.characters);
        if (data.characters.length > 0) {
          setSelectedCharId(data.characters[0].characterId);
        }
      })
      .catch(() => setError("Erreur de connexion"))
      .finally(() => setLoading(false));
  }, []);

  const selected = characters.find((c) => c.characterId === selectedCharId);
  const constraints = selected?.skills ? calculateConstraints(selected.skills) : null;
  const recommendation = constraints && selected?.skills ? getRecommendedSetup(constraints, selected.skills) : null;
  const skillPlan = selected?.skills ? getSkillPlan(selected.skills) : null;

  function handleCopyPlan() {
    if (!skillPlan) return;
    navigator.clipboard.writeText(formatSkillPlanText(skillPlan)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header
          title="Skills PI"
          subtitle="Vos compétences de Planetary Interaction et setup recommandé"
        />

        <div className="p-6 flex flex-col gap-6">
          {loading && (
            <div className="flex items-center gap-3" style={{ color: "var(--text-secondary)" }}>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-lime)", borderTopColor: "transparent" }} />
              Chargement des skills…
            </div>
          )}

          {error && (
            <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444" }}>
              {error === "Non authentifié"
                ? "Connectez-vous pour voir vos skills."
                : error}
            </div>
          )}

          {!loading && !error && characters.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Character selector + skills */}
              <div className="flex flex-col gap-4">
                {/* Character tabs */}
                {characters.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {characters.map((c) => (
                      <button
                        key={c.characterId}
                        onClick={() => setSelectedCharId(c.characterId)}
                        className="px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer"
                        style={{
                          background: selectedCharId === c.characterId ? "rgba(163, 230, 53, 0.15)" : "var(--card-bg)",
                          color: selectedCharId === c.characterId ? "var(--accent-lime)" : "var(--text-secondary)",
                          border: `1px solid ${selectedCharId === c.characterId ? "rgba(163, 230, 53, 0.4)" : "var(--border)"}`,
                        }}
                      >
                        {c.characterName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Skills card */}
                {selected && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen size={16} style={{ color: "var(--accent-lime)" }} />
                      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {selected.characterName}
                      </h2>
                    </div>

                    {selected.status !== "ok" || !selected.skills ? (
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {selected.status === "no_token" ? "Token ESI manquant. Re-linkez le personnage." : "Erreur lors du chargement des skills."}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {(Object.keys(selected.skills) as (keyof PISkills)[]).map((skillName) => {
                          const Icon = SKILL_ICONS[skillName];
                          const level = selected.skills![skillName];
                          return (
                            <div key={skillName}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <Icon size={13} style={{ color: "var(--text-muted)" }} />
                                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{skillName}</span>
                                </div>
                                <span className="text-sm font-mono font-bold" style={{ color: "var(--accent-lime)" }}>
                                  {level} / 5
                                </span>
                              </div>
                              <SkillBar level={level} />
                              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                {SKILL_DESCRIPTIONS[skillName]}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Constraints card */}
                {constraints && (
                  <div className="rounded-xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                      Contraintes calculées
                    </h3>
                    <ConstraintRow label="Planètes max" value={`${constraints.maxPlanets}`} />
                    <ConstraintRow label="CPU disponible" value={`${constraints.cpu.toLocaleString()} tf`} />
                    <ConstraintRow label="Power Grid" value={`${constraints.power.toLocaleString()} MW`} />
                    <ConstraintRow label="Production P2" value={constraints.canRunP2 ? "✓ Possible" : "✗ Impossible"} color={constraints.canRunP2 ? "var(--accent-green)" : "var(--accent-red)"} />
                    <ConstraintRow label="Production P3" value={constraints.canRunP3 ? "✓ Possible" : "✗ Impossible"} color={constraints.canRunP3 ? "var(--accent-green)" : "var(--accent-red)"} />
                    <ConstraintRow label="Production P4" value={constraints.canRunP4 ? "✓ Possible" : "✗ Impossible"} color={constraints.canRunP4 ? "var(--accent-green)" : "var(--accent-red)"} />
                    <div className="pt-2">
                      <ConstraintRow label="Chaîne P4 complète" value={constraints.canRunFullP4Chain ? "✓ Possible" : "✗ Impossible"} color={constraints.canRunFullP4Chain ? "#a3e635" : "var(--accent-red)"} />
                    </div>
                  </div>
                )}
              </div>

              {/* Recommender */}
              {recommendation && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb size={16} style={{ color: "#f59e0b" }} />
                      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Setup recommandé
                      </h2>
                    </div>

                    {/* Primary recommendation */}
                    <div
                      className="rounded-lg p-4 mb-4"
                      style={{
                        background: `${TIER_COLORS[recommendation.primary.tier]}10`,
                        border: `1px solid ${TIER_COLORS[recommendation.primary.tier]}30`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                          style={{ background: `${TIER_COLORS[recommendation.primary.tier]}20`, color: TIER_COLORS[recommendation.primary.tier] }}
                        >
                          {recommendation.primary.tier}
                        </span>
                        {"product" in recommendation.primary && (
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {recommendation.primary.product}
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {recommendation.primary.reason}
                      </p>
                    </div>

                    {/* Alternatives */}
                    {recommendation.alternatives.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Alternatives</p>
                        <div className="space-y-2">
                          {recommendation.alternatives.map((alt, i) => (
                            <div key={i} className="flex items-start gap-2 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                              <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: TIER_COLORS[alt.tier] }} />
                              <div>
                                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                  {"product" in alt ? alt.product : alt.tier}
                                </span>
                                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{alt.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tips */}
                  {recommendation.tips.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: "rgba(163, 230, 53, 0.05)", border: "1px solid rgba(163, 230, 53, 0.15)" }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--accent-lime)" }}>Conseils</p>
                      <ul className="space-y-1.5">
                        {recommendation.tips.map((tip, i) => (
                          <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text-secondary)" }}>
                            <span style={{ color: "var(--accent-lime)" }}>→</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skill plan */}
                  {skillPlan && skillPlan.length > 0 && (
                    <div className="rounded-xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            Plan d&apos;entraînement PI
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            Trié par coût SP croissant — gains rapides en premier
                          </p>
                        </div>
                        <button
                          onClick={handleCopyPlan}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer"
                          style={{
                            background: copied ? "rgba(163, 230, 53, 0.15)" : "var(--card-bg)",
                            border: `1px solid ${copied ? "rgba(163, 230, 53, 0.4)" : "var(--border)"}`,
                            color: copied ? "var(--accent-lime)" : "var(--text-secondary)",
                          }}
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? "Copié !" : "Copier"}
                        </button>
                      </div>

                      <div className="space-y-1">
                        {skillPlan.map((step, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                            style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="text-xs font-mono font-bold w-6 text-center flex-shrink-0"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {i + 1}
                              </span>
                              <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                                {step.skill}
                              </span>
                              <span
                                className="text-xs font-mono font-bold flex-shrink-0"
                                style={{ color: "var(--accent-lime)" }}
                              >
                                {["I","II","III","IV","V"][step.toLevel - 1]}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                                +{formatSp(step.sp)}
                              </span>
                              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                                {formatSp(step.totalSp)} total
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: "1px solid var(--border)" }}>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {skillPlan.length} level{skillPlan.length > 1 ? "s" : ""} restants
                        </span>
                        <span className="text-xs font-mono font-semibold" style={{ color: "var(--accent-lime)" }}>
                          {formatSp(skillPlan[skillPlan.length - 1]?.totalSp ?? 0)} au total
                        </span>
                      </div>
                    </div>
                  )}

                  {skillPlan && skillPlan.length === 0 && (
                    <div className="rounded-xl p-4 text-center" style={{ background: "rgba(163, 230, 53, 0.05)", border: "1px solid rgba(163, 230, 53, 0.2)" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--accent-lime)" }}>
                        Tous les skills PI sont à niveau 5 !
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
