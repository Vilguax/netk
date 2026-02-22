"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatNumber, formatVolume } from "@/lib/format";

interface OreData {
  oreName: string;
  totalVolume: number;
  totalQuantity: number;
  count: number;
}

interface OreChartProps {
  oreBreakdown: OreData[];
}

// EVE-themed colors for ores
const ORE_COLORS: Record<string, string> = {
  Veldspar: "#a8a8a8",
  "Concentrated Veldspar": "#b8b8b8",
  "Dense Veldspar": "#c8c8c8",
  Scordite: "#d4a574",
  "Condensed Scordite": "#e4b584",
  "Massive Scordite": "#f4c594",
  Pyroxeres: "#8b7355",
  "Solid Pyroxeres": "#9b8365",
  "Viscous Pyroxeres": "#ab9375",
  Plagioclase: "#6b8e6b",
  "Azure Plagioclase": "#7b9e7b",
  "Rich Plagioclase": "#8bae8b",
  Omber: "#cd853f",
  "Silvery Omber": "#dd954f",
  "Golden Omber": "#eda55f",
  Kernite: "#8fbc8f",
  "Luminous Kernite": "#9fcc9f",
  "Fiery Kernite": "#afddaf",
  Jaspet: "#6495ed",
  "Pure Jaspet": "#74a5fd",
  "Pristine Jaspet": "#84b5ff",
  Hemorphite: "#9370db",
  "Vivid Hemorphite": "#a380eb",
  "Radiant Hemorphite": "#b390fb",
  Hedbergite: "#708090",
  "Vitric Hedbergite": "#8090a0",
  "Glazed Hedbergite": "#90a0b0",
  Gneiss: "#4682b4",
  "Iridescent Gneiss": "#5692c4",
  "Prismatic Gneiss": "#66a2d4",
  "Dark Ochre": "#2f4f4f",
  "Onyx Ochre": "#3f5f5f",
  "Obsidian Ochre": "#4f6f6f",
  Spodumain: "#7cfc00",
  "Bright Spodumain": "#8cff10",
  "Gleaming Spodumain": "#9cff20",
  Crokite: "#ff6347",
  "Sharp Crokite": "#ff7357",
  "Crystalline Crokite": "#ff8367",
  Bistot: "#20b2aa",
  "Triclinic Bistot": "#30c2ba",
  "Monoclinic Bistot": "#40d2ca",
  Arkonor: "#ffd700",
  "Crimson Arkonor": "#ffe710",
  "Prime Arkonor": "#fff720",
  Mercoxit: "#ff4500",
  "Magma Mercoxit": "#ff5510",
  "Vitreous Mercoxit": "#ff6520",
};

const DEFAULT_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function getOreColor(oreName: string, index: number): string {
  return ORE_COLORS[oreName] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

export function OreChart({ oreBreakdown }: OreChartProps) {
  if (oreBreakdown.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        Aucune donnée
      </div>
    );
  }

  const chartData = oreBreakdown.map((ore, index) => ({
    name: ore.oreName,
    value: ore.totalVolume,
    quantity: ore.totalQuantity,
    count: ore.count,
    fill: getOreColor(ore.oreName, index),
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) =>
              percent > 0.05 ? `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""
            }
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                  <p className="text-white font-medium">{data.name}</p>
                  <p className="text-sm text-slate-400">
                    Volume: {formatVolume(data.value)}
                  </p>
                  <p className="text-sm text-slate-400">
                    Quantite: {formatNumber(data.quantity)} unités
                  </p>
                  <p className="text-sm text-slate-400">
                    Rochers: {data.count}
                  </p>
                </div>
              );
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-sm text-slate-300">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

