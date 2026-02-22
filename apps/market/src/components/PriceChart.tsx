"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface HistoryPoint {
  date: string;
  buyPrice: number;
  sellPrice: number;
  buyVolume: number;
  sellVolume: number;
}

function formatIsk(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + "B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value.toFixed(0);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function PriceChart({
  data,
  regionName,
}: {
  data: HistoryPoint[];
  regionName: string;
}) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}
      >
        <p style={{ color: "var(--text-secondary)" }}>
          Pas de données historiques pour {regionName}
        </p>
      </div>
    );
  }

  // Aggregate data by day (take last entry per day)
  const byDay = new Map<string, HistoryPoint>();
  for (const point of data) {
    const dayKey = new Date(point.date).toISOString().split("T")[0];
    byDay.set(dayKey, point);
  }

  const chartData = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => ({
      date: point.date,
      sell: point.sellPrice,
      buy: point.buyPrice,
      volume: point.sellVolume + point.buyVolume,
    }));

  return (
    <div
      className="rounded-xl p-4"
      style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}
    >
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.1)" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="price"
            tickFormatter={formatIsk}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={65}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tickFormatter={formatIsk}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: 8,
              fontSize: 12,
              color: "#e2e8f0",
            }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            labelFormatter={(label) =>
              new Date(label).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            }
            formatter={(value: number, name: string) => [
              formatIsk(value) + (name === "volume" ? "" : " ISK"),
              name === "sell" ? "Sell" : name === "buy" ? "Buy" : "Volume",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) =>
              value === "sell" ? "Sell" : value === "buy" ? "Buy" : "Volume"
            }
          />
          <Bar
            yAxisId="volume"
            dataKey="volume"
            fill="rgba(148, 163, 184, 0.25)"
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="sell"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#10b981" }}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="buy"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

