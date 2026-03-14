// PI skill constraints calculator
// Source: EVE University Wiki — https://wiki.eveuniversity.org/Planetary_Industry

export interface PISkills {
  "Command Center Upgrades": number;      // 0-5 — CPU/Power Grid de la Command Center
  "Interplanetary Consolidation": number; // 0-5 — nb de planètes exploitables
  "Planetology": number;                  // 0-5 — précision scan
  "Advanced Planetology": number;         // 0-5 — précision scan améliorée
  "Remote Sensing": number;               // 0-5 — scan à distance
}

// Command Center Upgrades → CPU (tf) et Power Grid (MW) disponibles
// Source: EVE University Wiki / Planetary buildings
export const CCU_GRID: Record<number, { cpu: number; power: number }> = {
  0: { cpu: 1_675,  power:  6_000 },
  1: { cpu: 7_057,  power:  9_000 },
  2: { cpu: 12_136, power: 12_000 },
  3: { cpu: 17_215, power: 15_000 },
  4: { cpu: 21_315, power: 17_000 },
  5: { cpu: 25_415, power: 19_000 },
};

// Interplanetary Consolidation → nb max de planètes
export const IPC_MAX_PLANETS: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6,
};

// Structure CPU/Power costs (EVE University Wiki)
export const STRUCTURE_COSTS = {
  extractorControlUnit: { cpu: 400,   power: 2_600 },
  extractorHead:        { cpu: 110,   power:   550 },  // per head, max 10/ECU
  basicIndustry:        { cpu: 200,   power:   800 },  // P0 → P1
  advancedIndustry:     { cpu: 500,   power:   700 },  // P1+P1 → P2, or P2+P2 → P3
  highTechPlant:        { cpu: 1_100, power:   400 },  // P3+P3+P3 → P4 (barren/temperate only)
  storageFacility:      { cpu: 500,   power:   700 },
  launchpad:            { cpu: 3_600, power:   700 },
};

// Reference setups — minimum structures needed per production type
// (not counting links which vary by planet layout)
const SETUPS = {
  // 1 ECU + 5 heads + 1 BIF + 1 Launchpad
  extractionP1: {
    cpu:   400 + 5 * 110 + 200 + 3_600,  // 4_750
    power: 2_600 + 5 * 550 + 800 + 700,   // 6_850
    label: "Extraction P1 (1 ECU 5 têtes + BIF + Launchpad)",
  },
  // 2 ECU + 3 heads each + 2 BIF + 1 AIF + 1 Launchpad (P2 self-sufficient)
  selfSufficientP2: {
    cpu:   2 * 400 + 6 * 110 + 2 * 200 + 500 + 3_600,   // 5_960
    power: 2 * 2_600 + 6 * 550 + 2 * 800 + 700 + 700,   // 11_500
    label: "P2 autonome (2 ECU + 2 BIF + 1 AIF + Launchpad)",
  },
  // 8 AIF + 1 Launchpad — P3 factory planet (imports P2)
  factoryP3: {
    cpu:   8 * 500 + 3_600,   // 7_600
    power: 8 * 700 + 700,     // 6_300
    label: "Usine P3 (8 AIF + Launchpad)",
  },
  // 6 High-Tech Plant + 1 Launchpad — P4 factory (barren/temperate)
  factoryP4: {
    cpu:   6 * 1_100 + 3_600,  // 10_200
    power: 6 * 400 + 700,      // 3_100
    label: "Usine P4 (6 HTPP + Launchpad)",
  },
  // Full P3 chain planet: 2 ECU + 6 heads + 2 BIF + 6 AIF + 2 Launchpad
  fullChainP3: {
    cpu:   2 * 400 + 6 * 110 + 2 * 200 + 6 * 500 + 2 * 3_600,  // 13_260
    power: 2 * 2_600 + 6 * 550 + 2 * 800 + 6 * 700 + 2 * 700,  // 14_300
    label: "Chaîne P3 complète (2 ECU + 2 BIF + 6 AIF + 2 Launchpads)",
  },
};

function fits(setup: { cpu: number; power: number }, grid: { cpu: number; power: number }): boolean {
  return setup.cpu <= grid.cpu && setup.power <= grid.power;
}

export interface PIConstraints {
  cpu: number;
  power: number;
  maxPlanets: number;
  // What setups fit at this CCU level
  canRunExtractionP1: boolean;
  canRunP2: boolean;         // self-sufficient P2 on one planet
  canRunP3Factory: boolean;  // P3 factory planet (separate supply planets)
  canRunP4Factory: boolean;  // P4 factory planet (separate supply planets)
  canRunFullP3Chain: boolean;// full P3 chain on one planet
  // Legacy booleans for UI compatibility
  canRunP3: boolean;
  canRunP4: boolean;
  canRunFullP4Chain: boolean;
}

export function calculateConstraints(skills: PISkills): PIConstraints {
  const ccu = skills["Command Center Upgrades"];
  const ipc = skills["Interplanetary Consolidation"];
  const grid = CCU_GRID[ccu] ?? CCU_GRID[0];
  const maxPlanets = IPC_MAX_PLANETS[ipc] ?? 1;

  const canRunP3Factory = fits(SETUPS.factoryP3, grid);
  const canRunP4Factory = fits(SETUPS.factoryP4, grid);
  const canRunFullP3Chain = fits(SETUPS.fullChainP3, grid);

  return {
    cpu: grid.cpu,
    power: grid.power,
    maxPlanets,
    canRunExtractionP1: fits(SETUPS.extractionP1, grid),
    canRunP2: fits(SETUPS.selfSufficientP2, grid),
    canRunP3Factory,
    canRunP4Factory,
    canRunFullP3Chain,
    // Legacy
    canRunP3: canRunP3Factory && maxPlanets >= 3,
    canRunP4: canRunP4Factory && maxPlanets >= 5,
    canRunFullP4Chain: canRunP4Factory && maxPlanets >= 6,
  };
}

// ─── Skill Plan Generator ───────────────────────────────────────────────────

const BASE_SP_CUMULATIVE = [0, 250, 1_415, 8_000, 45_255, 256_000];

function spForLevel(fromLevel: number): number {
  return BASE_SP_CUMULATIVE[fromLevel + 1] - BASE_SP_CUMULATIVE[fromLevel];
}

const SKILL_RANK: Record<keyof PISkills, number> = {
  "Command Center Upgrades":      3,
  "Interplanetary Consolidation": 4,
  "Planetology":                  3,
  "Advanced Planetology":         5,
  "Remote Sensing":               3,
};

const ROMAN = ["0", "I", "II", "III", "IV", "V"];

export interface SkillStep {
  skill: keyof PISkills;
  toLevel: number;
  sp: number;
  totalSp: number;
}

export function getSkillPlan(skills: PISkills): SkillStep[] {
  const steps: SkillStep[] = [];
  for (const skillName of Object.keys(skills) as (keyof PISkills)[]) {
    const current = skills[skillName];
    const rank = SKILL_RANK[skillName];
    for (let lvl = current; lvl < 5; lvl++) {
      steps.push({ skill: skillName, toLevel: lvl + 1, sp: spForLevel(lvl) * rank, totalSp: 0 });
    }
  }
  steps.sort((a, b) => a.sp - b.sp);
  let cumul = 0;
  for (const step of steps) { cumul += step.sp; step.totalSp = cumul; }
  return steps;
}

export function formatSkillPlanText(steps: SkillStep[]): string {
  return steps.map((s) => `${s.skill} ${ROMAN[s.toLevel]}`).join("\n");
}

export function formatSp(sp: number): string {
  if (sp >= 1_000_000) return `${(sp / 1_000_000).toFixed(2)} M SP`;
  if (sp >= 1_000) return `${Math.round(sp / 1_000)} K SP`;
  return `${sp} SP`;
}

export const SKILL_DESCRIPTIONS: Record<keyof PISkills, string> = {
  "Command Center Upgrades":      "CPU et Power Grid de la Command Center (structures placées)",
  "Interplanetary Consolidation": "Nombre de planètes exploitables simultanément",
  "Planetology":                  "Précision de scan des ressources planétaires",
  "Advanced Planetology":         "Précision de scan avancée",
  "Remote Sensing":               "Scan de planètes à distance sans y être présent",
};

export function skillLevelDots(level: number, max = 5): string {
  return "●".repeat(level) + "○".repeat(max - level);
}

// ─── Setup Recommender ─────────────────────────────────────────────────────

export type RecommendedSetup =
  | { tier: "P1"; reason: string }
  | { tier: "P2"; product: string; reason: string }
  | { tier: "P3"; product: string; reason: string }
  | { tier: "P4"; product: string; reason: string };

const RECOMMENDED_P3 = [
  { name: "Robotics",      planets: 2, note: "Très rentable, seulement 2 types de planètes" },
  { name: "Condensates",   planets: 2, note: "Bonne marge, 2 types" },
  { name: "Data Chips",    planets: 3, note: "Valeur stable" },
  { name: "Supercomputers",planets: 3, note: "Demande T2 constante" },
];

const RECOMMENDED_P4 = [
  { name: "Wetware Mainframe",             planets: 6, note: "Top valeur ISK/h" },
  { name: "Organic Mortar Applicators",    planets: 5, note: "Bonne valeur, 5 planètes" },
  { name: "Self-Harmonizing Power Core",   planets: 5, note: "Demande constante" },
];

export function getRecommendedSetup(constraints: PIConstraints, skills: PISkills): {
  primary: RecommendedSetup;
  alternatives: RecommendedSetup[];
  tips: string[];
} {
  const tips: string[] = [];
  const ccu = skills["Command Center Upgrades"];
  const ipc = skills["Interplanetary Consolidation"];
  const grid = CCU_GRID[ccu] ?? CCU_GRID[0];

  // Find next CCU level that unlocks a new setup
  const nextCCUForP2 = Object.entries(CCU_GRID).find(
    ([lvl, g]) => Number(lvl) > ccu && fits(SETUPS.selfSufficientP2, g)
  );
  const nextCCUForP3 = Object.entries(CCU_GRID).find(
    ([lvl, g]) => Number(lvl) > ccu && fits(SETUPS.factoryP3, g) && Number(lvl) > ccu
  );

  if (!constraints.canRunExtractionP1) {
    tips.push(`CCU ${ccu} trop bas — CPU ${grid.cpu} tf / ${grid.power} MW insuffisant pour poser un ECU + BIF + Launchpad. Montez CCU I.`);
  }
  if (!constraints.canRunP2 && nextCCUForP2) {
    tips.push(`CCU ${nextCCUForP2[0]} débloque la P2 autonome sur une planète (${nextCCUForP2[1].cpu} tf / ${nextCCUForP2[1].power} MW). Vous êtes CCU ${ccu}.`);
  }
  if (constraints.canRunP2 && !constraints.canRunP3) {
    if (nextCCUForP3) {
      tips.push(`CCU ${nextCCUForP3[0]} débloque la production P3 (usine 8 AIF). Vous êtes CCU ${ccu}.`);
    }
    if (ipc < 3) {
      tips.push(`Montez IPC au niveau 3 pour avoir 4 planètes (extraction + usine P2/P3). Vous êtes IPC ${ipc}.`);
    }
  }
  if (constraints.canRunP4 && ipc >= 5) {
    tips.push("CCU V + IPC V : chaîne P4 complète possible — Wetware Mainframe recommandé.");
  } else if (constraints.canRunP4Factory && ipc < 5) {
    tips.push(`Montez IPC à V pour 6 planètes et une chaîne P4 complète. Vous êtes IPC ${ipc}.`);
  }

  // Grid info always useful
  tips.push(`Votre Command Center : ${grid.cpu.toLocaleString()} tf CPU / ${grid.power.toLocaleString()} MW Power Grid.`);

  if (!constraints.canRunP2) {
    return {
      primary: {
        tier: "P1",
        reason: `CCU ${ccu} — ${grid.cpu} tf / ${grid.power} MW. Extraction P1 uniquement pour l'instant.`,
      },
      alternatives: [],
      tips,
    };
  }

  if (!constraints.canRunP3) {
    return {
      primary: {
        tier: "P2",
        product: "Coolant ou Construction Blocks",
        reason: `CCU ${ccu} (${grid.cpu} tf / ${grid.power} MW) — P2 autonome possible sur une planète.`,
      },
      alternatives: [
        { tier: "P2", product: "Consumer Electronics", reason: "Forte demande modules T2." },
        { tier: "P2", product: "Mechanical Parts", reason: "Utilisé massivement en industrie." },
      ],
      tips,
    };
  }

  if (!constraints.canRunFullP4Chain || constraints.maxPlanets < 5) {
    const best = RECOMMENDED_P3.find((r) => r.planets <= constraints.maxPlanets) ?? RECOMMENDED_P3[0];
    return {
      primary: {
        tier: "P3",
        product: best.name,
        reason: `${best.note}. ${best.planets} planètes requises — vous en avez ${constraints.maxPlanets}.`,
      },
      alternatives: RECOMMENDED_P3.slice(1).map((r) => ({
        tier: "P3" as const,
        product: r.name,
        reason: `${r.note}. ${r.planets} planètes.`,
      })),
      tips,
    };
  }

  const best = RECOMMENDED_P4[0];
  return {
    primary: {
      tier: "P4",
      product: best.name,
      reason: `${best.note}. ${constraints.maxPlanets} planètes disponibles.`,
    },
    alternatives: RECOMMENDED_P4.slice(1).map((r) => ({
      tier: "P4" as const,
      product: r.name,
      reason: `${r.note}.`,
    })),
    tips,
  };
}
