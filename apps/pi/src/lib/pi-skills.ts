// PI skill constraints calculator

export interface PISkills {
  "Command Center Upgrades": number;      // 0-5 — installations par planète
  "Interplanetary Consolidation": number; // 0-5 — nb de planètes exploitables
  "Planetology": number;                  // 0-5 — précision scan
  "Advanced Planetology": number;         // 0-5 — précision scan améliorée
  "Remote Sensing": number;               // 0-5 — scan à distance
}

// Command Center Upgrades → nb max d'installations par planète
// lvl 0 = 1 (juste le CC), lvl 1 = 1, lvl 2 = 2, lvl 3 = 4, lvl 4 = 7, lvl 5 = 12
const CCU_MAX_INSTALLATIONS: Record<number, number> = {
  0: 1,
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 12,
};

// Interplanetary Consolidation → nb max de planètes
// lvl 0 = 1, lvl 1 = 2, lvl 2 = 3, lvl 3 = 4, lvl 4 = 5, lvl 5 = 6
const IPC_MAX_PLANETS: Record<number, number> = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
};

export interface PIConstraints {
  maxPlanets: number;
  maxInstallationsPerPlanet: number;
  // What's possible at this skill level
  canRunP1: boolean;    // toujours oui
  canRunP2: boolean;    // besoin d'au moins 2 installations + CC = 3 min
  canRunP3: boolean;    // besoin de ~6 installations minimum
  canRunP4: boolean;    // besoin de ~12 installations (CCU 5)
  canRunFullP4Chain: boolean; // assez de planètes pour une chaîne P4 complète
}

export function calculateConstraints(skills: PISkills): PIConstraints {
  const ccu = skills["Command Center Upgrades"];
  const ipc = skills["Interplanetary Consolidation"];

  const maxPlanets = IPC_MAX_PLANETS[ipc] ?? 1;
  const maxInstallations = CCU_MAX_INSTALLATIONS[ccu] ?? 1;

  return {
    maxPlanets,
    maxInstallationsPerPlanet: maxInstallations,
    canRunP1: true,
    canRunP2: maxInstallations >= 3,   // CC + Extractor + Basic + Advanced = au moins 3
    canRunP3: maxInstallations >= 6,
    canRunP4: maxInstallations >= 12,  // CCU 5 requis
    canRunFullP4Chain: maxPlanets >= 6 && maxInstallations >= 6,
  };
}

// Skill level display helpers
export function skillLevelDots(level: number, max = 5): string {
  return "●".repeat(level) + "○".repeat(max - level);
}

export const SKILL_DESCRIPTIONS: Record<keyof PISkills, string> = {
  "Command Center Upgrades": "Nombre d'installations par planète",
  "Interplanetary Consolidation": "Nombre de planètes exploitables",
  "Planetology": "Précision de scan des ressources planétaires",
  "Advanced Planetology": "Précision de scan avancée",
  "Remote Sensing": "Distance de scan sans être dans le système",
};

// ─── Setup Recommender ─────────────────────────────────────────────────────

export type RecommendedSetup =
  | { tier: "P1"; reason: string }
  | { tier: "P2"; product: string; reason: string }
  | { tier: "P3"; product: string; reason: string }
  | { tier: "P4"; product: string; reason: string };

// Meilleurs produits P3/P4 pour une chaîne la plus autonome possible
// (peu de types de planètes différents, haute valeur)
const RECOMMENDED_P3 = [
  { id: "robotics",      name: "Robotics",     planets: 2, note: "Très rentable, 2 types de planètes" },
  { id: "condensates",   name: "Condensates",  planets: 2, note: "Bonne marge, 2 types" },
  { id: "data_chips",    name: "Data Chips",   planets: 3, note: "Valeur stable" },
  { id: "supercomputers",name: "Supercomputers",planets: 3, note: "Demande T2 constante" },
];

const RECOMMENDED_P4 = [
  { id: "wetware_mainframe", name: "Wetware Mainframe", planets: 6, note: "Top valeur ISK/h" },
  { id: "organic_mortar_applicators", name: "Organic Mortar Applicators", planets: 5, note: "Bonne valeur" },
  { id: "self_harmonizing_power_core", name: "Self-Harmonizing Power Core", planets: 5, note: "Demande constante" },
];

export function getRecommendedSetup(constraints: PIConstraints): {
  primary: RecommendedSetup;
  alternatives: RecommendedSetup[];
  tips: string[];
} {
  const tips: string[] = [];

  if (!constraints.canRunP2) {
    tips.push("Montez Command Center Upgrades à niveau 2 pour débloquer la production P2.");
  }
  if (constraints.maxPlanets < 3) {
    tips.push("Montez Interplanetary Consolidation pour accéder à plus de planètes.");
  }
  if (constraints.canRunP4) {
    tips.push("Avec CCU 5, vous pouvez faire des chaînes complètes sur une seule planète.");
  }

  if (!constraints.canRunP2) {
    return {
      primary: { tier: "P1", reason: "Skills insuffisants pour P2. Entraînez Command Center Upgrades." },
      alternatives: [],
      tips,
    };
  }

  if (!constraints.canRunP3) {
    return {
      primary: { tier: "P2", product: "Coolant ou Construction Blocks", reason: "Produits P2 rentables avec peu d'installations." },
      alternatives: [
        { tier: "P2", product: "Consumer Electronics", reason: "Forte demande T2." },
        { tier: "P2", product: "Mechanical Parts", reason: "Utilisé massivement en industrie." },
      ],
      tips: [...tips, "Objectif : CCU niveau 3+ pour accéder aux P3."],
    };
  }

  if (!constraints.canRunFullP4Chain || constraints.maxPlanets < 5) {
    const best = RECOMMENDED_P3.filter(
      (r) => r.planets <= constraints.maxPlanets
    )[0] ?? RECOMMENDED_P3[0];
    return {
      primary: {
        tier: "P3",
        product: best.name,
        reason: `${best.note}. Nécessite ${best.planets} planètes.`,
      },
      alternatives: RECOMMENDED_P3.slice(1).map((r) => ({
        tier: "P3" as const,
        product: r.name,
        reason: `${r.note}. ${r.planets} planètes requises.`,
      })),
      tips: [...tips, "Pour du P4, montez IPC à 5 et CCU à 5."],
    };
  }

  const best = RECOMMENDED_P4[0];
  return {
    primary: {
      tier: "P4",
      product: best.name,
      reason: `${best.note}. Chaîne P4 complète possible.`,
    },
    alternatives: RECOMMENDED_P4.slice(1).map((r) => ({
      tier: "P4" as const,
      product: r.name,
      reason: r.note,
    })),
    tips,
  };
}
