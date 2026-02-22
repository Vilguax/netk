"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useWalletData } from "@/hooks/useWalletData";
import { useCharacterSelection } from "@/contexts/CharacterContext";
import { CharacterPieChart } from "@/components/analytics/CharacterPieChart";
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
import { History, Download, Calendar, Filter } from "lucide-react";

function formatISK(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toLocaleString();
}

export default function HistoryPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");
  const { data: walletData, isLoading: walletLoading } = useWalletData(period);
  const { selectedCharacterIds } = useCharacterSelection();

  const dailyData = walletData?.chartData || [];
  const multipleCharacters = selectedCharacterIds.length > 1;

  // Export to CSV
  const exportCSV = () => {
    if (!walletData?.recentBounties) return;

    const headers = multipleCharacters
      ? ["Date", "Personnage", "Montant (ISK)", "Description"]
      : ["Date", "Montant (ISK)", "Description"];

    const rows = walletData.recentBounties.map((b) =>
      multipleCharacters
        ? [
            format(new Date(b.date), "yyyy-MM-dd HH:mm:ss"),
            b.characterName || "Unknown",
            b.amount.toString(),
            b.description,
          ]
        : [
            format(new Date(b.date), "yyyy-MM-dd HH:mm:ss"),
            b.amount.toString(),
            b.description,
          ]
    );

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bounties_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />

      <main className="ml-64">
        <Header />

        <div className="p-6">
          {/* Header with filters */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <History size={24} style={{ color: "var(--accent-blue)" }} />
              Historique
            </h2>

            <div className="flex items-center gap-4">
              {/* Period Filter */}
              <div className="flex items-center gap-2">
                <Filter size={16} style={{ color: "var(--text-secondary)" }} />
                <select
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value as "7d" | "30d" | "all")
                  }
                  className="px-3 py-2 rounded-lg border"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                  <option value="all">1 an</option>
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: "var(--accent-green)",
                  color: "white",
                }}
              >
                <Download size={16} />
                Exporter CSV
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div
              className="p-4 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Total Periode
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--accent-green)" }}
              >
                {formatISK(walletData?.stats.periodTotal || 0)}
              </p>
            </div>
            <div
              className="p-4 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Moyenne/Jour
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--accent-blue)" }}
              >
                {formatISK((walletData?.stats.periodTotal || 0) / (walletData?.stats.periodDays || 7))}
              </p>
            </div>
            <div
              className="p-4 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Nombre de Ticks
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--accent-gold)" }}
              >
                {walletData?.stats.tickCount || 0}
              </p>
            </div>
            <div
              className="p-4 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Meilleur Jour
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "#a855f7" }}
              >
                {formatISK(
                  Math.max(...(dailyData.map((d) => d.amount) || [0]))
                )}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Bar Chart - Daily Earnings */}
            <div
              className="p-6 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar size={20} style={{ color: "var(--accent-blue)" }} />
                Revenus par jour
              </h3>

              {walletLoading ? (
                <div
                  className="h-64 rounded-lg animate-pulse"
                  style={{ background: "var(--border)" }}
                />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
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
                          format(new Date(value), "dd/MM", { locale: fr })
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
              )}
            </div>

            {/* Pie Chart - By Character or placeholder */}
            {multipleCharacters ? (
              <CharacterPieChart
                data={walletData?.characterBreakdown || []}
                isLoading={walletLoading}
              />
            ) : (
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <h3 className="text-lg font-semibold mb-4">
                  Repartition par système
                </h3>

                <div className="h-64 flex items-center justify-center">
                  <p style={{ color: "var(--text-secondary)" }}>
                    Tracking par système bientôt disponible
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Table */}
          <div
            className="p-6 rounded-xl border"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
            }}
          >
            <h3 className="text-lg font-semibold mb-4">Transactions</h3>

            {walletLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded animate-pulse"
                    style={{ background: "var(--border)" }}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0" style={{ background: "var(--card-bg)" }}>
                    <tr
                      className="border-b"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <th
                        className="text-left py-3 px-4 font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Date
                      </th>
                      <th
                        className="text-left py-3 px-4 font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Heure
                      </th>
                      {multipleCharacters && (
                        <th
                          className="text-left py-3 px-4 font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Personnage
                        </th>
                      )}
                      <th
                        className="text-right py-3 px-4 font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletData?.recentBounties.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b hover:bg-white/5 transition-colors"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <td className="py-3 px-4">
                          {format(new Date(entry.date), "dd MMM yyyy", {
                            locale: fr,
                          })}
                        </td>
                        <td
                          className="py-3 px-4"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {format(new Date(entry.date), "HH:mm:ss")}
                        </td>
                        {multipleCharacters && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {entry.characterId && (
                                <img
                                  src={`https://images.evetech.net/characters/${entry.characterId}/portrait?size=32`}
                                  alt={entry.characterName || ""}
                                  className="w-6 h-6 rounded-full"
                                />
                              )}
                              <span className="text-sm">
                                {entry.characterName || "Unknown"}
                              </span>
                            </div>
                          </td>
                        )}
                        <td
                          className="py-3 px-4 text-right font-bold"
                          style={{ color: "var(--accent-green)" }}
                        >
                          +{formatISK(entry.amount)} ISK
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

