export interface FactionTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  gradient: string;
  particleColor: string;
}

export const FACTION_THEMES: Record<string, FactionTheme> = {
  caldari: {
    name: "Caldari",
    primary: "#3b82f6", // blue-500
    secondary: "#1e40af", // blue-800
    accent: "#60a5fa", // blue-400
    background: "#0f172a", // slate-900
    text: "#e2e8f0", // slate-200
    gradient: "from-blue-900/50 via-slate-900 to-slate-950",
    particleColor: "#3b82f6",
  },
  amarr: {
    name: "Amarr",
    primary: "#f59e0b", // amber-500
    secondary: "#92400e", // amber-800
    accent: "#fbbf24", // amber-400
    background: "#1c1917", // stone-900
    text: "#fef3c7", // amber-100
    gradient: "from-amber-900/50 via-stone-900 to-stone-950",
    particleColor: "#f59e0b",
  },
  minmatar: {
    name: "Minmatar",
    primary: "#f97316", // orange-500
    secondary: "#9a3412", // orange-800
    accent: "#fb923c", // orange-400
    background: "#1c1917", // stone-900
    text: "#fed7aa", // orange-200
    gradient: "from-orange-900/50 via-stone-900 to-stone-950",
    particleColor: "#f97316",
  },
  gallente: {
    name: "Gallente",
    primary: "#22c55e", // green-500
    secondary: "#166534", // green-800
    accent: "#4ade80", // green-400
    background: "#0f172a", // slate-900
    text: "#dcfce7", // green-100
    gradient: "from-green-900/50 via-slate-900 to-slate-950",
    particleColor: "#22c55e",
  },
};

export function getThemeForRegion(regionSlug: string): FactionTheme {
  const factionMap: Record<string, string> = {
    "the-forge": "caldari",
    domain: "amarr",
    heimatar: "minmatar",
    "sinq-laison": "gallente",
  };

  return FACTION_THEMES[factionMap[regionSlug] || "caldari"];
}
