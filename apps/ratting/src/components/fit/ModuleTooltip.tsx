"use client";

import { useState, ReactNode } from "react";

interface ModuleStats {
  shieldBonus?: number;
  armorDamageAmount?: number;
  capacitorNeed?: number;
  power?: number;
  cpu?: number;
  damageMultiplier?: number;
  emDamage?: number;
  explosiveDamage?: number;
  kineticDamage?: number;
  thermalDamage?: number;
  speedBonus?: number;
  duration?: number;
  capacitorCapacity?: number;
}

interface ModuleTooltipProps {
  name: string;
  stats: ModuleStats;
  children: ReactNode;
}

function formatStatValue(key: string, value: number): string {
  switch (key) {
    case "shieldBonus":
      return `+${value.toFixed(0)} HP`;
    case "armorDamageAmount":
      return `+${value.toFixed(0)} HP`;
    case "capacitorNeed":
      return `${value.toFixed(0)} GJ`;
    case "power":
      return `${value.toFixed(0)} MW`;
    case "cpu":
      return `${value.toFixed(0)} tf`;
    case "damageMultiplier":
      return `x${value.toFixed(2)}`;
    case "emDamage":
    case "explosiveDamage":
    case "kineticDamage":
    case "thermalDamage":
      return `${value.toFixed(0)} HP`;
    case "speedBonus":
      return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
    case "duration":
      return `${(value / 1000).toFixed(1)}s`;
    case "capacitorCapacity":
      return `${value.toFixed(0)} GJ`;
    default:
      return value.toString();
  }
}

function getStatLabel(key: string): string {
  const labels: Record<string, string> = {
    shieldBonus: "Shield Boost",
    armorDamageAmount: "Armor Repair",
    capacitorNeed: "Cap Usage",
    power: "Powergrid",
    cpu: "CPU",
    damageMultiplier: "Damage Mod",
    emDamage: "EM Damage",
    explosiveDamage: "Explosive",
    kineticDamage: "Kinetic",
    thermalDamage: "Thermal",
    speedBonus: "Speed Bonus",
    duration: "Cycle Time",
    capacitorCapacity: "Cap Amount",
  };
  return labels[key] || key;
}

export function ModuleTooltip({ name, stats, children }: ModuleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const statsEntries = Object.entries(stats).filter(
    ([_, value]) => value !== undefined && value !== 0
  );

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          className="absolute z-50 left-full ml-2 top-0 min-w-48 p-3 rounded-lg shadow-xl"
          style={{
            background: "#1a2235",
            border: "1px solid #2d3748",
          }}
        >
          {/* Module Name */}
          <p className="font-semibold text-sm mb-2 pb-2 border-b border-slate-700">
            {name}
          </p>

          {/* Stats */}
          {statsEntries.length > 0 ? (
            <div className="space-y-1">
              {statsEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-xs"
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    {getStatLabel(key)}
                  </span>
                  <span
                    className="font-medium"
                    style={{
                      color:
                        key === "capacitorNeed"
                          ? "#f59e0b"
                          : key.includes("Damage") || key === "damageMultiplier"
                          ? "#ef4444"
                          : key.includes("Bonus") || key.includes("Amount")
                          ? "#10b981"
                          : "var(--foreground)",
                    }}
                  >
                    {formatStatValue(key, value as number)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              Aucune stat disponible
            </p>
          )}
        </div>
      )}
    </div>
  );
}
