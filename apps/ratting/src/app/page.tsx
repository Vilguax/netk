"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useWalletData } from "@/hooks/useWalletData";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useCharacterSelection } from "@/contexts/CharacterContext";
import { Coins, TrendingUp, Target, Trophy, Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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

export default function DashboardPage() {
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useWalletData();
  const { data: characterData, isLoading: characterLoading, refetch: refetchCharacter } = useCharacterData();
  const { selectedCharacterIds } = useCharacterSelection();

  const multipleCharacters = selectedCharacterIds.length > 1;

  const handleManualRefresh = () => {
    refetchWallet();
    refetchCharacter();
  };

  // Check for stale ESI data (latest bounty > 1 hour old)
  const staleCharacters = walletData?.characterFetchStatus?.filter((c: { latestBountyDate?: string }) => {
    if (!c.latestBountyDate) return false;
    const age = Date.now() - new Date(c.latestBountyDate).getTime();
    return age > 60 * 60 * 1000; // > 1 hour
  }) || [];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />

      {/* Main content area */}
      <main className="ml-64">
        <Header />

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              title="ISK Aujourd'hui"
              value={
                walletLoading
                  ? "..."
                  : `${formatISK(walletData?.stats.todayTotal || 0)}`
              }
              trend={walletData?.stats.trend}
              icon={<Coins size={24} />}
              color="var(--accent-green)"
            />
            <StatCard
              title="ISK/Heure"
              value={
                walletLoading
                  ? "..."
                  : `${formatISK(walletData?.stats.iskPerHour || 0)}`
              }
              icon={<TrendingUp size={24} />}
              color="var(--accent-blue)"
            />
            <StatCard
              title="Tick Moyen"
              value={
                walletLoading
                  ? "..."
                  : `${formatISK(walletData?.stats.avgTick || 0)}`
              }
              icon={<Target size={24} />}
              color="var(--accent-gold)"
            />
            <StatCard
              title="Meilleur Tick"
              value={
                walletLoading
                  ? "..."
                  : `${formatISK(walletData?.stats.bestTick || 0)}`
              }
              icon={<Trophy size={24} />}
              color="#a855f7"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <EarningsChart
              data={walletData?.chartData || []}
              isLoading={walletLoading}
            />
            <RecentActivity
              entries={walletData?.recentBounties || []}
              isLoading={walletLoading}
              showCharacter={multipleCharacters}
            />
          </div>

          {/* Character Info - Multi-character view */}
          {characterData?.characters && characterData.characters.length > 0 && (
            <div
              className="p-4 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">
                    {multipleCharacters ? "Personnages" : "Position Actuelle"}
                  </h3>
                  <button
                    onClick={handleManualRefresh}
                    disabled={walletLoading}
                    className="flex items-center gap-1.5 px-2 py-1 rounded transition-all hover:bg-white/10 disabled:opacity-50"
                    title="Rafraîchir les données ESI"
                  >
                    <RefreshCw
                      size={14}
                      className={walletLoading ? "animate-spin" : ""}
                      style={{ color: "var(--text-secondary)" }}
                    />
                  </button>
                </div>
                {multipleCharacters && (
                  <div className="flex items-center gap-2">
                    <Wallet size={16} style={{ color: "var(--accent-green)" }} />
                    <span style={{ color: "var(--accent-green)" }} className="font-medium">
                      {formatISK(characterData.totalBalance)} ISK
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {characterData.characters.map((char) => (
                  <div
                    key={char.characterId}
                    className="flex items-center gap-4 p-2 rounded-lg"
                    style={{ background: "rgba(255, 255, 255, 0.02)" }}
                  >
                    {/* Portrait */}
                    <img
                      src={`https://images.evetech.net/characters/${char.characterId}/portrait?size=32`}
                      alt={char.characterName}
                      className="w-8 h-8 rounded-full"
                    />

                    {/* Name */}
                    <div className="min-w-30">
                      <span className="font-medium text-sm">{char.characterName}</span>
                    </div>

                    {/* Location */}
                    {char.location && (
                      <>
                        <div>
                          <span style={{ color: "var(--text-secondary)" }} className="text-sm">
                            Système:{" "}
                          </span>
                          <span className="font-medium text-sm">
                            {char.location.systemName}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)" }} className="text-sm">
                            Sec:{" "}
                          </span>
                          <span
                            className="font-medium text-sm"
                            style={{
                              color:
                                char.location.securityStatus <= 0
                                  ? "#ef4444"
                                  : char.location.securityStatus < 0.5
                                  ? "#f59e0b"
                                  : "#10b981",
                            }}
                          >
                            {char.location.securityStatus.toFixed(1)}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Balance */}
                    <div className="ml-auto">
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--accent-green)" }}
                      >
                        {formatISK(char.balance)} ISK
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ESI Status Warning */}
              {staleCharacters.length > 0 && (
                <div
                  className="mt-4 p-3 rounded-lg flex items-start gap-3"
                  style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)" }}
                >
                  <AlertTriangle size={18} style={{ color: "var(--accent-gold)", flexShrink: 0, marginTop: 2 }} />
                  <div className="text-sm">
                    <p style={{ color: "var(--accent-gold)" }} className="font-medium mb-1">
                      Données ESI en retard
                    </p>
                    <p style={{ color: "var(--text-secondary)" }}>
                      L'API EVE (ESI) peut avoir jusqu'à plusieurs heures de retard sur le journal wallet.
                      Les bounties apparaîtront automatiquement une fois l'ESI mis à jour.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {walletData?.characterFetchStatus?.map((c: { characterId: string; characterName: string; latestBountyDate?: string }) => {
                        const age = c.latestBountyDate
                          ? formatDistanceToNow(new Date(c.latestBountyDate), { locale: fr, addSuffix: true })
                          : "jamais";
                        return (
                          <span
                            key={c.characterId}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: "rgba(0,0,0,0.2)" }}
                          >
                            {c.characterName.split(" ").pop()}: {age}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

