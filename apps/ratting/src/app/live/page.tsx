"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useWalletData } from "@/hooks/useWalletData";
import { useCharacterData } from "@/hooks/useCharacterData";
import { useCharacterSelection } from "@/contexts/CharacterContext";
import {
  Radio,
  Clock,
  Crosshair,
  MapPin,
  Shield,
  TrendingUp,
  Play,
  Pause,
  Users,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";

// EVE ESI returns UTC timestamps. Use UTC for all comparisons.
function getUTCTimestamp(): number {
  return Date.now();
}

function parseEveDate(dateString: string): Date {
  // EVE dates are ISO 8601 UTC format
  return new Date(dateString);
}

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

const STORAGE_KEY = "ratting_live_session";

export default function LivePage() {
  // Refresh every 30 seconds for live tracking
  const { data: walletData, isLoading: walletLoading, refetch } = useWalletData("7d", 30000);
  const { data: characterData, isLoading: characterLoading } = useCharacterData();
  const { selectedCharacterIds } = useCharacterSelection();
  const [sessionActive, setSessionActive] = useState(false);
  // Store session start as UTC timestamp (ms since epoch)
  const [sessionStartTimestamp, setSessionStartTimestamp] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const multipleCharacters = selectedCharacterIds.length > 1;

  // Track when data updates
  useEffect(() => {
    if (walletData) {
      setLastUpdate(new Date());
    }
  }, [walletData]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Load session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { startTime, startTimestamp } = JSON.parse(saved);
        // Support both old format (startTime) and new format (startTimestamp)
        const timestamp = startTimestamp || (startTime ? new Date(startTime).getTime() : null);
        if (timestamp) {
          // Only restore if session is less than 24 hours old
          if (getUTCTimestamp() - timestamp < 24 * 60 * 60 * 1000) {
            setSessionStartTimestamp(timestamp);
            setSessionActive(true);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Session timer
  useEffect(() => {
    if (!sessionActive || !sessionStartTimestamp) return;

    const interval = setInterval(() => {
      const diff = getUTCTimestamp() - sessionStartTimestamp;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsedTime(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionActive, sessionStartTimestamp]);

  const toggleSession = () => {
    if (sessionActive) {
      setSessionActive(false);
      setSessionStartTimestamp(null);
      setElapsedTime("00:00:00");
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const timestamp = getUTCTimestamp();
      setSessionActive(true);
      setSessionStartTimestamp(timestamp);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ startTimestamp: timestamp }));
    }
  };

  // Calculate session stats using useMemo to ensure proper updates
  const sessionBounties = useMemo(() => {
    if (!sessionStartTimestamp || !walletData?.recentBounties) return [];
    return walletData.recentBounties.filter((b) => {
      const bountyTimestamp = parseEveDate(b.date).getTime();
      return bountyTimestamp >= sessionStartTimestamp;
    });
  }, [sessionStartTimestamp, walletData?.recentBounties]);

  const sessionTotal = useMemo(
    () => sessionBounties.reduce((sum, b) => sum + b.amount, 0),
    [sessionBounties]
  );
  const sessionTicks = sessionBounties.length;

  // Time since last tick (using UTC)
  const lastTick = walletData?.recentBounties[0];
  const timeSinceLastTick = useMemo(() => {
    if (!lastTick) return null;
    const bountyTimestamp = parseEveDate(lastTick.date).getTime();
    return Math.floor((getUTCTimestamp() - bountyTimestamp) / (1000 * 60));
  }, [lastTick, lastUpdate]); // lastUpdate triggers recalc on refresh

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />

      <main className="ml-64">
        <Header />

        <div className="p-6">
          {/* Session Control */}
          <div
            className="p-6 rounded-xl border mb-6"
            style={{
              background: sessionActive
                ? "rgba(16, 185, 129, 0.1)"
                : "var(--card-bg)",
              borderColor: sessionActive
                ? "var(--accent-green)"
                : "var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-4 h-4 rounded-full ${
                    sessionActive ? "animate-pulse" : ""
                  }`}
                  style={{
                    background: sessionActive
                      ? "var(--accent-green)"
                      : "var(--text-secondary)",
                  }}
                />
                <div>
                  <h2 className="text-xl font-bold">
                    {sessionActive ? "Session en cours" : "Session inactive"}
                  </h2>
                  <p style={{ color: "var(--text-secondary)" }}>
                    {sessionActive
                      ? `Durée: ${elapsedTime}`
                      : "Démarrez une session pour tracker vos gains"}
                  </p>
                </div>
              </div>

              <button
                onClick={toggleSession}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
                style={{
                  background: sessionActive
                    ? "rgba(239, 68, 68, 0.2)"
                    : "var(--accent-green)",
                  color: sessionActive ? "#ef4444" : "white",
                }}
              >
                {sessionActive ? (
                  <>
                    <Pause size={20} /> Arrêter
                  </>
                ) : (
                  <>
                    <Play size={20} /> Demarrer
                  </>
                )}
              </button>
            </div>

            {/* Session Stats */}
            {sessionActive && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div
                  className="p-4 rounded-lg"
                  style={{ background: "rgba(16, 185, 129, 0.15)" }}
                >
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    ISK Session
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--accent-green)" }}
                  >
                    {formatISK(sessionTotal)}
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{ background: "rgba(59, 130, 246, 0.15)" }}
                >
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Ticks Session
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    {sessionTicks}
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{ background: "rgba(245, 158, 11, 0.15)" }}
                >
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    ISK/Heure (session)
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--accent-gold)" }}
                  >
                    {sessionStartTimestamp
                      ? formatISK(
                          sessionTotal /
                            Math.max(
                              1,
                              (getUTCTimestamp() - sessionStartTimestamp) /
                                (1000 * 60 * 60)
                            )
                        )
                      : "0"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Live Feed */}
            <div
              className="p-6 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Radio size={20} style={{ color: "var(--accent-green)" }} />
                  Feed en direct
                  <span
                    className="text-xs font-normal px-2 py-0.5 rounded"
                    style={{ background: "rgba(59, 130, 246, 0.2)", color: "var(--accent-blue)" }}
                    title="Les données ESI sont mises en cache par CCP pendant ~1 heure"
                  >
                    ESI ~1h cache
                  </span>
                </h3>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-right" style={{ color: "var(--text-secondary)" }}>
                    <div>Local: {lastUpdate.toLocaleTimeString("fr-FR")}</div>
                    <div>EVE: {lastUpdate.toISOString().slice(11, 19)} UTC</div>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                    title="Rafraîchir (note: les données ESI sont cachées par CCP)"
                  >
                    <RefreshCw
                      size={16}
                      className={isRefreshing ? "animate-spin" : ""}
                      style={{ color: "var(--text-secondary)" }}
                    />
                  </button>
                </div>
              </div>

              {walletLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-12 rounded-lg animate-pulse"
                      style={{ background: "var(--border)" }}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {walletData?.recentBounties.slice(0, 15).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        background: entry.isEss
                          ? "rgba(245, 158, 11, 0.1)"
                          : "rgba(16, 185, 129, 0.05)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {multipleCharacters && entry.characterId ? (
                          <img
                            src={`https://images.evetech.net/characters/${entry.characterId}/portrait?size=32`}
                            alt={entry.characterName || ""}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : entry.isEss ? (
                          <Shield
                            size={16}
                            style={{ color: "var(--accent-gold)" }}
                          />
                        ) : (
                          <Crosshair
                            size={16}
                            style={{ color: "var(--accent-green)" }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {multipleCharacters && entry.characterName
                              ? entry.characterName
                              : entry.isEss
                              ? "ESS Payout"
                              : "Bounty Prize"}
                            {entry.isEss && (
                              <span
                                className="ml-2 text-xs px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(245, 158, 11, 0.2)", color: "var(--accent-gold)" }}
                              >
                                ESS
                              </span>
                            )}
                          </p>
                          <p
                            className="text-xs cursor-help"
                            style={{ color: "var(--text-secondary)" }}
                            title={`EVE: ${entry.date.slice(11, 19)} | Local: ${parseEveDate(entry.date).toLocaleTimeString("fr-FR")}`}
                          >
                            {formatDistanceToNow(parseEveDate(entry.date), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                      </div>
                      <p
                        className="font-bold"
                        style={{
                          color: entry.isEss
                            ? "var(--accent-gold)"
                            : "var(--accent-green)",
                        }}
                      >
                        +{formatISK(entry.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System & Status Info */}
            <div className="space-y-6">
              {/* Current System */}
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {multipleCharacters ? (
                    <Users size={20} style={{ color: "var(--accent-blue)" }} />
                  ) : (
                    <MapPin size={20} style={{ color: "var(--accent-blue)" }} />
                  )}
                  {multipleCharacters ? "Positions" : "Système Actuel"}
                </h3>

                {characterLoading ? (
                  <div
                    className="h-20 rounded-lg animate-pulse"
                    style={{ background: "var(--border)" }}
                  />
                ) : characterData?.characters && characterData.characters.length > 0 ? (
                  <div className="space-y-3">
                    {characterData.characters.map((char) => (
                      <div
                        key={char.characterId}
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{ background: "rgba(255, 255, 255, 0.02)" }}
                      >
                        <div className="flex items-center gap-2">
                          {multipleCharacters && (
                            <img
                              src={`https://images.evetech.net/characters/${char.characterId}/portrait?size=32`}
                              alt={char.characterName}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-sm font-medium">
                            {multipleCharacters ? char.characterName : "Système"}
                          </span>
                        </div>
                        {char.location ? (
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium">
                              {char.location.systemName}
                            </span>
                            <span
                              className="font-bold"
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
                        ) : (
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Inconnu
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-secondary)" }}>
                    Position inconnue
                  </p>
                )}
              </div>

              {/* Last Tick Timer */}
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock size={20} style={{ color: "var(--accent-gold)" }} />
                  Dernier Tick
                </h3>

                {timeSinceLastTick !== null ? (
                  <div className="text-center">
                    <p
                      className="text-4xl font-bold"
                      style={{
                        color:
                          timeSinceLastTick > 25
                            ? "#ef4444"
                            : "var(--accent-gold)",
                      }}
                    >
                      {timeSinceLastTick} min
                    </p>
                    <p
                      className="text-sm mt-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {timeSinceLastTick > 25
                        ? "Attention: pas de tick depuis longtemps"
                        : timeSinceLastTick > 20
                        ? "Tick imminent..."
                        : "Prochain tick dans ~" + (20 - timeSinceLastTick) + " min"}
                    </p>
                  </div>
                ) : (
                  <p style={{ color: "var(--text-secondary)" }}>
                    Aucun tick enregistré
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp
                    size={20}
                    style={{ color: "var(--accent-green)" }}
                  />
                  Stats Rapides
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      ISK Aujourd'hui
                    </span>
                    <span
                      className="font-bold"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {formatISK(walletData?.stats.todayTotal || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Ticks Aujourd'hui
                    </span>
                    <span className="font-bold">
                      {walletData?.stats.tickCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      ISK/Heure (global)
                    </span>
                    <span
                      className="font-bold"
                      style={{ color: "var(--accent-blue)" }}
                    >
                      {formatISK(walletData?.stats.iskPerHour || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

