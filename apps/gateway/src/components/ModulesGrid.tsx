"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, Target, Scan, Calculator, Map, BarChart2, Globe, Factory,
  type LucideIcon,
} from "lucide-react";

type AppStatus = "online" | "offline" | "maintenance" | "coming";

interface ModuleConfig {
  name: string;
  description: string;
  url: string;
  healthUrl: string;
  gradient: string;
  icon: LucideIcon;
  defaultStatus: AppStatus;
}

const MODULE_CONFIGS: ModuleConfig[] = [
  {
    name: "Flipper",
    description: "Scanner de contrats - Trouvez les opportunités de flip profitables dans les hubs majeurs",
    url: process.env.NEXT_PUBLIC_FLIPPER_URL || "http://localhost:3001",
    healthUrl: (process.env.NEXT_PUBLIC_FLIPPER_URL || "http://localhost:3001") + "/api/health",
    gradient: "from-blue-500 to-cyan-400",
    icon: TrendingUp,
    defaultStatus: "online",
  },
  {
    name: "Ratting",
    description: "Tracker de bounties - Suivez vos gains de ratting en temps réel avec stats détaillées",
    url: process.env.NEXT_PUBLIC_RATTING_URL || "http://localhost:3002",
    healthUrl: (process.env.NEXT_PUBLIC_RATTING_URL || "http://localhost:3002") + "/api/health",
    gradient: "from-emerald-500 to-green-400",
    icon: Target,
    defaultStatus: "online",
  },
  {
    name: "Rock Radar",
    description: "Analyseur de belt mining - Scannez vos belts et estimez les profits en temps réel",
    url: process.env.NEXT_PUBLIC_ROCK_RADAR_URL || "http://localhost:3003",
    healthUrl: (process.env.NEXT_PUBLIC_ROCK_RADAR_URL || "http://localhost:3003") + "/api/health",
    gradient: "from-amber-500 to-yellow-400",
    icon: Scan,
    defaultStatus: "online",
  },
  {
    name: "Appraisal",
    description: "Évaluateur d'items - Collez vos items pour obtenir leur valeur marché instantanément",
    url: process.env.NEXT_PUBLIC_APPRAISAL_URL || "http://localhost:3004",
    healthUrl: (process.env.NEXT_PUBLIC_APPRAISAL_URL || "http://localhost:3004") + "/api/health",
    gradient: "from-violet-500 to-purple-400",
    icon: Calculator,
    defaultStatus: "online",
  },
  {
    name: "Fleet Manager",
    description: "Contrôlez votre fleet avec carte interactive - Set destination pour tous les membres NETK",
    url: process.env.NEXT_PUBLIC_FLEET_URL || "http://localhost:3005",
    healthUrl: (process.env.NEXT_PUBLIC_FLEET_URL || "http://localhost:3005") + "/api/health",
    gradient: "from-cyan-500 to-teal-400",
    icon: Map,
    defaultStatus: "online",
  },
  {
    name: "Market",
    description: "Analyseur de marché - Prix en temps réel, historique et tendances sur tous les hubs",
    url: process.env.NEXT_PUBLIC_MARKET_URL || "http://localhost:3006",
    healthUrl: (process.env.NEXT_PUBLIC_MARKET_URL || "http://localhost:3006") + "/api/health",
    gradient: "from-red-500 to-orange-400",
    icon: BarChart2,
    defaultStatus: "online",
  },
  {
    name: "Planetary Interaction",
    description: "Calculateur PI - Timers de colonies ESI, set destination par perso, finder de chaînes et setup recommandé selon vos skills",
    url: process.env.NEXT_PUBLIC_PI_URL || "http://localhost:3007",
    healthUrl: (process.env.NEXT_PUBLIC_PI_URL || "http://localhost:3007") + "/api/health",
    gradient: "from-lime-500 to-green-400",
    icon: Globe,
    defaultStatus: "online",
  },
  {
    name: "Industry",
    description: "Calculateur de blueprints, réactions et manufacturing",
    url: "#",
    healthUrl: "",
    gradient: "from-pink-500 to-rose-400",
    icon: Factory,
    defaultStatus: "coming",
  },
];

async function checkHealth(url: string): Promise<AppStatus> {
  if (!url) return "coming";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      // Could return "maintenance" from the API if needed
      return data.status === "maintenance" ? "maintenance" : "online";
    }
    return "offline";
  } catch {
    return "offline";
  }
}

export function ModulesGrid() {
  const [statuses, setStatuses] = useState<Record<string, AppStatus>>({});

  useEffect(() => {
    async function checkAllHealth() {
      const results: Record<string, AppStatus> = {};

      await Promise.all(
        MODULE_CONFIGS.map(async (module) => {
          if (module.defaultStatus === "coming") {
            results[module.name] = "coming";
          } else {
            results[module.name] = await checkHealth(module.healthUrl);
          }
        })
      );

      setStatuses(results);
    }

    // Initial check
    checkAllHealth();

    // Poll every 30 seconds
    const interval = setInterval(checkAllHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {MODULE_CONFIGS.map((module) => (
        <ModuleCard
          key={module.name}
          name={module.name}
          description={module.description}
          href={module.url}
          gradient={module.gradient}
          icon={module.icon}
          status={statuses[module.name] || module.defaultStatus}
        />
      ))}
    </div>
  );
}

function ModuleCard({
  name,
  description,
  href,
  gradient,
  icon: Icon,
  status,
}: {
  name: string;
  description: string;
  href: string;
  gradient: string;
  icon: LucideIcon;
  status: AppStatus;
}) {
  const isDisabled = status !== "online";

  const statusBadge = {
    online: (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        En ligne
      </span>
    ),
    offline: (
      <span className="flex items-center gap-1.5 text-xs text-red-400">
        <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
        Hors ligne
      </span>
    ),
    maintenance: (
      <span className="flex items-center gap-1.5 text-xs text-amber-400">
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
        Maintenance
      </span>
    ),
    coming: (
      <span className="text-xs text-slate-500 tracking-wider uppercase">Bientôt</span>
    ),
  };

  const content = (
    <>
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl`} />

      {/* Border glow */}
      <div className={`absolute inset-0 rounded-2xl border border-transparent bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} style={{ padding: '1px', background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`, WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />

      <div className="relative p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white`}>
            <Icon size={32} strokeWidth={1.5} />
          </div>
          {statusBadge[status]}
        </div>

        {/* Content */}
        <h4 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all duration-300">
          {name}
        </h4>
        <p className="text-sm text-slate-400 flex-1">{description}</p>

        {/* Arrow */}
        {!isDisabled && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 group-hover:text-white transition-colors duration-300">
            <span>Accéder</span>
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        )}
      </div>
    </>
  );

  if (isDisabled) {
    return (
      <div className="group relative rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden opacity-50 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      className="group relative rounded-2xl bg-slate-900/50 border border-slate-700/50 hover:border-transparent overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1"
    >
      {content}
    </a>
  );
}


