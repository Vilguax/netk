"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface ChartDataPoint {
  date: string;
  amount: number;
}

interface TrendChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
  periodDays: number;
}

function formatISK(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
}

export function TrendChart({ data, isLoading, periodDays }: TrendChartProps) {
  if (isLoading) {
    return (
      <div
        className="p-6 rounded-xl border"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <h3 className="text-lg font-semibold mb-4">Evolution sur {periodDays} jours</h3>
        <div className="h-64 animate-pulse rounded-lg" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  // Calculate average
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);
  const average = data.length > 0 ? totalAmount / data.length : 0;

  // Calculate 7-day moving average
  const dataWithMA = data.map((point, index) => {
    const start = Math.max(0, index - 6);
    const window = data.slice(start, index + 1);
    const ma = window.reduce((sum, d) => sum + d.amount, 0) / window.length;
    return { ...point, movingAverage: ma };
  });

  // Find best and worst days
  const bestDay = data.reduce(
    (best, d) => (d.amount > best.amount ? d : best),
    { date: "", amount: 0 }
  );
  const activeDays = data.filter((d) => d.amount > 0);

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Evolution sur {periodDays} jours</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: "#10b981" }} />
            <span style={{ color: "var(--text-secondary)" }}>Journalier</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: "#3b82f6" }} />
            <span style={{ color: "var(--text-secondary)" }}>Moyenne 7j</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>Aucune donnée</p>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dataWithMA}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) =>
                    format(parseISO(date), periodDays > 14 ? "dd/MM" : "EEE", { locale: fr })
                  }
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  interval={periodDays > 14 ? Math.floor(periodDays / 7) : 0}
                />
                <YAxis
                  tickFormatter={(v) => formatISK(v)}
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(date) =>
                    format(parseISO(date as string), "EEEE d MMMM", { locale: fr })
                  }
                  formatter={(value: number, name: string) => [
                    `${formatISK(value)} ISK`,
                    name === "amount" ? "Journalier" : "Moyenne 7j",
                  ]}
                />
                <ReferenceLine
                  y={average}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{
                    value: `Moy: ${formatISK(average)}`,
                    fill: "#f59e0b",
                    fontSize: 11,
                    position: "right",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorAmount)"
                />
                <Area
                  type="monotone"
                  dataKey="movingAverage"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="none"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Total periode
              </p>
              <p className="font-bold" style={{ color: "var(--accent-green)" }}>
                {formatISK(totalAmount)} ISK
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Moyenne/jour
              </p>
              <p className="font-bold">{formatISK(average)} ISK</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Meilleur jour
              </p>
              <p className="font-bold" style={{ color: "var(--accent-gold)" }}>
                {formatISK(bestDay.amount)} ISK
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Jours actifs
              </p>
              <p className="font-bold">
                {activeDays.length}/{data.length}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

