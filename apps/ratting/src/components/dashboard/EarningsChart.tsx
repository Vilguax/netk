"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChartDataPoint {
  date: string;
  amount: number;
}

interface EarningsChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
}

function formatISK(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

export function EarningsChart({ data, isLoading }: EarningsChartProps) {
  if (isLoading) {
    return (
      <div
        className="h-80 rounded-xl border flex items-center justify-center"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
            style={{ borderColor: "var(--accent-green)" }}
          />
          <p style={{ color: "var(--text-secondary)" }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="h-80 rounded-xl border flex items-center justify-center"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <p style={{ color: "var(--text-secondary)" }}>
          Aucune donnée disponible
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Revenus (7 derniers jours)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={(value) =>
                format(new Date(value), "dd MMM", { locale: fr })
              }
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={formatISK}
            />
            <Tooltip
              contentStyle={{
                background: "#1a2235",
                border: "1px solid #2d3748",
                borderRadius: "8px",
              }}
              labelFormatter={(value) =>
                format(new Date(value), "EEEE d MMMM", { locale: fr })
              }
              formatter={(value: number) => [
                `${formatISK(value)} ISK`,
                "Bounties",
              ]}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAmount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

