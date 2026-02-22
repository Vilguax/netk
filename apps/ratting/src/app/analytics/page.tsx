"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { CharacterComparison } from "@/components/analytics/CharacterComparison";
import { CharacterPieChart } from "@/components/analytics/CharacterPieChart";
import { HourlyHeatmap } from "@/components/analytics/HourlyHeatmap";
import { TrendChart } from "@/components/analytics/TrendChart";
import { useWalletData } from "@/hooks/useWalletData";
import { useCharacterSelection } from "@/contexts/CharacterContext";
import {
  Coins,
  TrendingUp,
  Calendar,
  Trophy,
  Users,
  Clock,
} from "lucide-react";

type Period = "7d" | "30d" | "all";

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
  return value.toLocaleString();
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const { data: walletData, isLoading } = useWalletData(period);
  const { selectedCharacterIds, characters } = useCharacterSelection();

  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 365;
  const multipleCharacters = selectedCharacterIds.length > 1;

  // Calculate additional stats
  const avgPerDay =
    walletData?.stats.periodTotal && walletData.stats.periodDays
      ? walletData.stats.periodTotal / walletData.stats.periodDays
      : 0;

  const activeDays =
    walletData?.chartData.filter((d) => d.amount > 0).length || 0;

  // Find best character
  const bestCharacter =
    walletData?.characterBreakdown?.reduce(
      (best, char) => (char.total > best.total ? char : best),
      { characterId: "", characterName: "N/A", total: 0, tickCount: 0 }
    ) || { characterId: "", characterName: "N/A", total: 0, tickCount: 0 };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />

      <main className="ml-64">
        <Header />

        <div className="p-6">
          {/* Period selector */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p style={{ color: "var(--text-secondary)" }}>
                Vue d'ensemble de vos performances de ratting
              </p>
            </div>
            <div className="flex gap-2">
              {(["7d", "30d", "all"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background:
                      period === p
                        ? "var(--accent-green)"
                        : "rgba(255, 255, 255, 0.05)",
                    color: period === p ? "black" : "var(--text-secondary)",
                  }}
                >
                  {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "1 an"}
                </button>
              ))}
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Periode"
              value={isLoading ? "..." : formatISK(walletData?.stats.periodTotal || 0)}
              icon={<Coins size={24} />}
              color="var(--accent-green)"
            />
            <StatCard
              title="Moyenne/Jour"
              value={isLoading ? "..." : formatISK(avgPerDay)}
              icon={<TrendingUp size={24} />}
              color="var(--accent-blue)"
            />
            <StatCard
              title="Jours Actifs"
              value={isLoading ? "..." : `${activeDays}/${periodDays}`}
              icon={<Calendar size={24} />}
              color="var(--accent-gold)"
            />
            <StatCard
              title={multipleCharacters ? "Meilleur Perso" : "Total Ticks"}
              value={
                isLoading
                  ? "..."
                  : multipleCharacters
                  ? bestCharacter.characterName.split(" ")[0]
                  : (walletData?.stats.tickCount || 0).toString()
              }
              icon={multipleCharacters ? <Trophy size={24} /> : <Clock size={24} />}
              color="#a855f7"
            />
          </div>

          {/* Main Trend Chart */}
          <div className="mb-6">
            <TrendChart
              data={walletData?.chartData || []}
              isLoading={isLoading}
              periodDays={periodDays}
            />
          </div>

          {/* Character analysis (only if multiple characters) */}
          {multipleCharacters && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              <CharacterComparison
                data={walletData?.characterBreakdown || []}
                isLoading={isLoading}
              />
              <CharacterPieChart
                data={walletData?.characterBreakdown || []}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Time analysis */}
          <div className={multipleCharacters ? "" : "max-w-2xl"}>
            <HourlyHeatmap
              hourlyData={walletData?.hourlyData || {}}
              dayOfWeekData={walletData?.dayOfWeekData || {}}
              isLoading={isLoading}
            />
          </div>

          {/* Performance insights */}
          <div
            className="mt-6 p-6 rounded-xl border"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
            }}
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={20} style={{ color: "var(--accent-green)" }} />
              Insights
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Efficacite
                </p>
                <p className="text-lg font-medium">
                  {activeDays > 0
                    ? `${((activeDays / periodDays) * 100).toFixed(0)}% de jours actifs`
                    : "Aucune activite"}
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  {activeDays > 0 && walletData?.stats.periodTotal
                    ? `${formatISK(walletData.stats.periodTotal / activeDays)} ISK/jour actif`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Projection mensuelle
                </p>
                <p className="text-lg font-medium" style={{ color: "var(--accent-green)" }}>
                  {formatISK(avgPerDay * 30)} ISK
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  Base sur la moyenne actuelle
                </p>
              </div>
              {multipleCharacters && (
                <>
                  <div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Personnages actifs
                    </p>
                    <p className="text-lg font-medium">
                      {walletData?.characterBreakdown?.filter((c) => c.total > 0).length || 0}/
                      {selectedCharacterIds.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Contribution du meilleur
                    </p>
                    <p className="text-lg font-medium" style={{ color: "var(--accent-gold)" }}>
                      {walletData?.stats.periodTotal && bestCharacter.total
                        ? `${((bestCharacter.total / walletData.stats.periodTotal) * 100).toFixed(0)}%`
                        : "N/A"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
