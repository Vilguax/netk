"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CharacterBreakdown {
  characterId: string;
  characterName: string;
  total: number;
  tickCount: number;
}

interface CharacterComparisonProps {
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

export function CharacterComparison({ data, isLoading }: CharacterComparisonProps) {
  if (isLoading) {
    return (
      <div
        className="p-6 rounded-xl border h-80"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <h3 className="text-lg font-semibold mb-4">Comparaison par Personnage</h3>
        <div className="h-56 animate-pulse rounded-lg" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b.total - a.total);

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Comparaison par Personnage</h3>

      {data.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>Aucune donnée</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v) => formatISK(v)}
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                type="category"
                dataKey="characterName"
                tick={{ fill: "#ffffff", fontSize: 12 }}
                axisLine={{ stroke: "var(--border)" }}
                width={100}
              />
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
                  const total = sortedData.reduce((sum, d) => sum + d.total, 0);
                  const percentage = total > 0 ? ((data.total / total) * 100).toFixed(1) : 0;
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
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={entry.characterId} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend with portraits */}
      <div className="mt-4 flex flex-wrap gap-3">
        {sortedData.map((char, index) => (
          <div key={char.characterId} className="flex items-center gap-2">
            <img
              src={`https://images.evetech.net/characters/${char.characterId}/portrait?size=32`}
              alt={char.characterName}
              className="w-6 h-6 rounded-full"
              style={{ border: `2px solid ${COLORS[index % COLORS.length]}` }}
            />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {char.tickCount} ticks
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

