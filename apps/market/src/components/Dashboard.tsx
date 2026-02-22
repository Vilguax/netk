"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface DashboardData {
  wallet: number;
  orders: { sell: number; buy: number; total: number; escrow: number; sellValue: number };
  profit: { today: number; period: number; avgPerDay: number };
  topItems: Array<{
    typeId: number;
    typeName: string;
    totalProfit: number;
    totalQuantity: number;
  }>;
  volume: { bought: number; sold: number; txCount: number };
  profitChart: Array<{ date: string; profit: number; cumulative: number }>;
  characters: Array<{
    characterId: string;
    characterName: string;
    balance: number;
  }>;
  alerts: Array<{
    type: "expired";
    typeName: string;
    typeId: number;
    isBuyOrder: boolean;
    price: number;
    volumeRemain: number;
    date: string;
  }>;
  period: number;
}

function formatIsk(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
    >
      <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      <div className="text-xl font-bold" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard?days=${days}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erreur");
        }
        const json: DashboardData = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [days]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: "var(--border)", borderTopColor: "#f87171" }}
        />
        <p style={{ color: "var(--text-secondary)" }}>Chargement du dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "var(--accent-red)" }}>{error}</p>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Connectez-vous et liez un personnage EVE pour voir le dashboard.
        </p>
      </div>
    );
  }

  if (!data) return null;

  const profitColor = data.profit.period >= 0 ? "var(--accent-green)" : "var(--accent-red)";

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className="px-4 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: days === d ? "rgba(239, 68, 68, 0.2)" : "transparent",
                color: days === d ? "#f87171" : "var(--text-secondary)",
              }}
              onClick={() => setDays(d)}
            >
              {d}j
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards - Row 1: Main metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Solde Wallet"
          value={`${formatIsk(data.wallet)}`}
          color="var(--accent-gold)"
          sub={data.characters.length > 1 ? `${data.characters.length} persos` : undefined}
        />
        <StatCard
          label={`Profit (${days}j)`}
          value={`${data.profit.period >= 0 ? "+" : ""}${formatIsk(data.profit.period)}`}
          color={profitColor}
          sub={`Aujourd'hui: ${data.profit.today >= 0 ? "+" : ""}${formatIsk(data.profit.today)}`}
        />
        <StatCard
          label="Profit/jour moy."
          value={`${data.profit.avgPerDay >= 0 ? "+" : ""}${formatIsk(data.profit.avgPerDay)}`}
          color={data.profit.avgPerDay >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
        />
        <StatCard
          label="Ordres actifs"
          value={data.orders.total.toString()}
          color="var(--accent-cyan)"
          sub={`${data.orders.sell} sell / ${data.orders.buy} buy`}
        />
        <StatCard
          label="ISK en Sell Orders"
          value={formatIsk(data.orders.sellValue)}
          color="var(--accent-green)"
          sub={`${data.orders.sell} ordres`}
        />
        <StatCard
          label="ISK en Escrow"
          value={formatIsk(data.orders.escrow)}
          color="var(--accent-blue)"
          sub={`${data.orders.buy} buy orders`}
        />
      </div>

      {/* KPI Cards - Row 2: Volume */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label={`Volume ventes (${days}j)`}
          value={`${formatIsk(data.volume.sold)}`}
          color="var(--accent-green)"
        />
        <StatCard
          label={`Volume achats (${days}j)`}
          value={`${formatIsk(data.volume.bought)}`}
          color="var(--accent-blue)"
        />
        <StatCard
          label="Transactions"
          value={data.volume.txCount.toString()}
          color="var(--accent-purple)"
          sub={`sur ${days} jours`}
        />
      </div>

      {/* Profit Chart */}
      {data.profitChart.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
            Profit journalier ({days} derniers jours)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.profitChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                stroke="rgba(148,163,184,0.2)"
              />
              <YAxis
                yAxisId="daily"
                tickFormatter={(v: number) => formatIsk(v)}
                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                stroke="rgba(148,163,184,0.2)"
              />
              <YAxis
                yAxisId="cumul"
                orientation="right"
                tickFormatter={(v: number) => formatIsk(v)}
                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                stroke="rgba(148,163,184,0.2)"
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `${formatIsk(value)} ISK`,
                  name === "profit" ? "Profit jour" : "Cumulé",
                ]}
                labelFormatter={formatChartDate}
              />
              <Legend
                formatter={(value: string) =>
                  value === "profit" ? "Profit / jour" : "Profit cumule"
                }
              />
              <Bar
                yAxisId="daily"
                dataKey="profit"
                fill="rgba(16, 185, 129, 0.4)"
                stroke="var(--accent-green)"
                strokeWidth={1}
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="cumul"
                type="monotone"
                dataKey="cumulative"
                stroke="var(--accent-gold)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row: Top Items + Alerts + Wallet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top 5 profitable items */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
            Top 5 items profitables ({days}j)
          </h3>
          {data.topItems.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-secondary)" }}>
              Aucune donnée de profit
            </p>
          ) : (
            <div className="space-y-2">
              {data.topItems.map((item, i) => (
                <div
                  key={item.typeId}
                  className="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/[0.02]"
                >
                  <span
                    className="text-xs font-bold w-5 text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {i + 1}
                  </span>
                  <img
                    src={`https://images.evetech.net/types/${item.typeId}/icon?size=32`}
                    alt=""
                    className="w-6 h-6 rounded"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.typeName}</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {item.totalQuantity.toLocaleString("fr-FR")} unités
                    </div>
                  </div>
                  <div
                    className="text-sm font-mono font-medium"
                    style={{
                      color: item.totalProfit >= 0 ? "var(--accent-green)" : "var(--accent-red)",
                    }}
                  >
                    {item.totalProfit >= 0 ? "+" : ""}
                    {formatIsk(item.totalProfit)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
            Alertes
          </h3>
          {data.alerts.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2" style={{ color: "var(--accent-green)", opacity: 0.5 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Aucune alerte
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-2 px-2 rounded text-xs"
                  style={{ background: "rgba(239, 68, 68, 0.05)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <img
                    src={`https://images.evetech.net/types/${alert.typeId}/icon?size=32`}
                    alt=""
                    className="w-5 h-5 rounded flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{alert.typeName}</span>
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      background: alert.isBuyOrder ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                      color: alert.isBuyOrder ? "var(--accent-blue)" : "var(--accent-green)",
                    }}
                  >
                    {alert.isBuyOrder ? "BUY" : "SELL"}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {timeAgo(alert.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wallet per character */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
            Solde par personnage
          </h3>
          {data.characters.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-secondary)" }}>
              Aucun personnage connecté
            </p>
          ) : (
            <div className="space-y-2">
              {data.characters
                .sort((a, b) => b.balance - a.balance)
                .map((char) => (
                  <div
                    key={char.characterId}
                    className="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/[0.02]"
                  >
                    <img
                      src={`https://images.evetech.net/characters/${char.characterId}/portrait?size=32`}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{char.characterName}</div>
                    </div>
                    <div className="text-sm font-mono" style={{ color: "var(--accent-gold)" }}>
                      {formatIsk(char.balance)} ISK
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

