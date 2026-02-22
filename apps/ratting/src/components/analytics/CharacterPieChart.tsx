"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface CharacterBreakdown {
  characterId: string;
  characterName: string;
  total: number;
  tickCount: number;
}

interface CharacterPieChartProps {
  data: CharacterBreakdown[];
  isLoading?: boolean;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function formatISK(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString();
}

export function CharacterPieChart({ data, isLoading }: CharacterPieChartProps) {
  if (isLoading) {
    return (
      <div
        className="p-6 rounded-xl border h-80"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <h3 className="text-lg font-semibold mb-4">Repartition des Gains</h3>
        <div className="h-56 animate-pulse rounded-full mx-auto w-56" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.total, 0);
  const chartData = data.map((d) => ({
    ...d,
    percentage: total > 0 ? ((d.total / total) * 100).toFixed(1) : 0,
  }));

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Repartition des Gains</h3>

      {data.length === 0 || total === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>Aucune donnée</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="total"
                nameKey="characterName"
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.characterId} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "12px",
                }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div
                      className="rounded-lg p-3"
                      style={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary, #fff)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={`https://images.evetech.net/characters/${data.characterId}/portrait?size=32`}
                          alt={data.characterName}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="font-semibold" style={{ color: "var(--text-primary, #fff)" }}>
                          {data.characterName}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span style={{ color: "var(--text-secondary)" }}>ISK:</span>
                          <span className="font-medium" style={{ color: "var(--accent-green)" }}>
                            {formatISK(data.total)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span style={{ color: "var(--text-secondary)" }}>Ticks:</span>
                          <span className="font-medium" style={{ color: "var(--text-primary, #fff)" }}>
                            {data.tickCount}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span style={{ color: "var(--text-secondary)" }}>Part:</span>
                          <span className="font-medium" style={{ color: "var(--text-primary, #fff)" }}>
                            {data.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Custom legend with percentages */}
      <div className="mt-4 space-y-2">
        {chartData.map((char, index) => (
          <div key={char.characterId} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <img
                src={`https://images.evetech.net/characters/${char.characterId}/portrait?size=32`}
                alt={char.characterName}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm">{char.characterName}</span>
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {char.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

