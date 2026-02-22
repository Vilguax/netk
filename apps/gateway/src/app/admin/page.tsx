"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ServiceAccount {
  characterId: string;
  characterName: string;
  corporationId: string;
  scopes: string[];
  tokenExpires: string;
  isTokenValid: boolean;
  needsRelink?: boolean;
}

interface AppInfo {
  id: string;
  name: string;
  port: number;
  url: string;
  configuredStatus: "online" | "maintenance" | "offline";
  liveStatus: "online" | "maintenance" | "offline";
  isHealthy: boolean;
}

interface MarketJob {
  id: string;
  region: string;
  regionId: string;
  status: string;
  itemsCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
}

interface FetchProgress {
  jobId: string;
  regionId: string;
  regionName: string;
  status: "fetching_orders" | "processing_types" | "completed" | "failed";
  currentPage: number;
  totalPages: number;
  currentType: number;
  totalTypes: number;
  successCount: number;
  errorCount: number;
  startedAt: string;
  updatedAt: string;
}

interface MarketStatus {
  isRunning: boolean;
  runningJob: { id: string; region: string; startedAt: string } | null;
  progress: FetchProgress | null;
  stats: { typesCount: number; pricesCount: number };
  lastSuccessfulByRegion: { region: string; regionId: string; lastFetch: string }[];
  recentJobs: MarketJob[];
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceAccount, setServiceAccount] = useState<ServiceAccount | null>(null);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [redisWarning, setRedisWarning] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionConfirmed, setActionConfirmed] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [saRes, appsRes, marketRes] = await Promise.all([
        fetch("/api/admin/service-account"),
        fetch("/api/admin/apps"),
        fetch("/api/admin/market/status"),
      ]);

      // Check if user has access
      if (saRes.status === 403 || appsRes.status === 403) {
        setError("Accès refusé - Vous n'êtes pas le propriétaire du service account");
        setLoading(false);
        return;
      }

      if (saRes.status === 401) {
        router.push("/login");
        return;
      }

      const saData = await saRes.json();
      const appsData = await appsRes.json();
      const marketData = await marketRes.json();

      if (saData.configured) {
        setServiceAccount(saData.serviceAccount);
      }
      setApps(appsData.apps || []);
      setMarketStatus(marketData);
      setRedisWarning(appsData.warning || null);
      setError(null);
    } catch {
      setError("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    // Refresh every 2 seconds when running, 30 seconds otherwise
    const interval = setInterval(fetchData, marketStatus?.isRunning ? 2000 : 30000);
    return () => clearInterval(interval);
  }, [fetchData, marketStatus?.isRunning]);

  // Toggle app status
  const toggleAppStatus = async (appId: string, currentStatus: string) => {
    setActionLoading(appId);
    try {
      const newStatus = currentStatus === "maintenance" ? "online" : "maintenance";
      const res = await fetch("/api/admin/apps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, status: newStatus }),
      });

      if (res.ok) {
        await fetchData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger market fetch
  const triggerMarketFetch = async (type: string, region?: string) => {
    const key = `market-${type}-${region || "all"}`;
    setActionLoading(key);
    try {
      const res = await fetch("/api/admin/market/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, region }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionLoading(null);
        setActionConfirmed(key);
        setActionSuccess(data.message || "Commande envoyée");
        setTimeout(() => {
          setActionConfirmed(null);
          setActionSuccess(null);
        }, 3000);
        setTimeout(fetchData, 1000);
      } else {
        setActionLoading(null);
        alert(data.error || "Erreur");
      }
    } catch {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              NETK Admin
            </h1>
          </div>

          {serviceAccount && (
            <div className="flex items-center gap-3">
              <img
                src={`https://images.evetech.net/characters/${serviceAccount.characterId}/portrait?size=32`}
                alt={serviceAccount.characterName}
                className={`w-8 h-8 rounded-full ring-2 ${serviceAccount.isTokenValid ? "ring-cyan-500" : "ring-red-500"}`}
              />
              <div className="text-sm">
                <div className="font-medium">{serviceAccount.characterName}</div>
                {serviceAccount.needsRelink ? (
                  <a
                    href="/account/characters"
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Reconnecter EVE →
                  </a>
                ) : (
                  <div className={`text-xs ${serviceAccount.isTokenValid ? "text-green-400" : "text-amber-400"}`}>
                    {serviceAccount.isTokenValid ? "Token valide" : "Rafraîchissement..."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Redis Warning */}
        {redisWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-amber-400 text-sm">{redisWarning}</span>
          </div>
        )}

        {/* Action success toast */}
        {actionSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400 text-sm">{actionSuccess}</span>
            <span className="text-green-400/50 text-xs ml-auto">Vérifiez les logs du market-fetcher daemon</span>
          </div>
        )}

        {/* Apps Status */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Applications
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{app.name}</h3>
                    <div className="text-xs text-slate-500">Port {app.port}</div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        app.liveStatus === "online"
                          ? "bg-green-400"
                          : app.liveStatus === "maintenance"
                          ? "bg-amber-400"
                          : "bg-red-400"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        app.liveStatus === "online"
                          ? "text-green-400"
                          : app.liveStatus === "maintenance"
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {app.liveStatus === "online"
                        ? "En ligne"
                        : app.liveStatus === "maintenance"
                        ? "Maintenance"
                        : "Hors ligne"}
                    </span>
                  </div>
                </div>

                {/* Toggle button */}
                <button
                  onClick={() => toggleAppStatus(app.id, app.configuredStatus)}
                  disabled={actionLoading === app.id || app.id === "gateway"}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    app.configuredStatus === "maintenance"
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {actionLoading === app.id ? (
                    "..."
                  ) : app.id === "gateway" ? (
                    "Gateway (non modifiable)"
                  ) : app.configuredStatus === "maintenance" ? (
                    "Remettre en ligne"
                  ) : (
                    "Mettre en maintenance"
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Market Fetcher */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Market Fetcher
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="font-medium mb-4">Contrôles</h3>

              {/* Stats */}
              {marketStatus?.stats && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {marketStatus.stats.typesCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">Types</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {marketStatus.stats.pricesCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">Prix</div>
                  </div>
                </div>
              )}

              {/* Progress */}
              {marketStatus?.progress && marketStatus.progress.status !== "completed" && (
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm font-medium">{marketStatus.progress.regionName}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {marketStatus.progress.status === "fetching_orders" ? "Récupération des ordres" : "Traitement des types"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                      style={{
                        width: marketStatus.progress.status === "fetching_orders"
                          ? `${marketStatus.progress.totalPages > 0 ? (marketStatus.progress.currentPage / marketStatus.progress.totalPages) * 100 : 0}%`
                          : `${marketStatus.progress.totalTypes > 0 ? (marketStatus.progress.currentType / marketStatus.progress.totalTypes) * 100 : 0}%`
                      }}
                    />
                  </div>

                  {/* Progress details */}
                  <div className="flex justify-between text-xs text-slate-400">
                    {marketStatus.progress.status === "fetching_orders" ? (
                      <>
                        <span>Page {marketStatus.progress.currentPage} / {marketStatus.progress.totalPages || "?"}</span>
                        <span>{marketStatus.progress.totalPages > 0 ? Math.round((marketStatus.progress.currentPage / marketStatus.progress.totalPages) * 100) : 0}%</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {marketStatus.progress.currentType.toLocaleString()} / {marketStatus.progress.totalTypes.toLocaleString()} types
                          {marketStatus.progress.errorCount > 0 && (
                            <span className="text-red-400 ml-2">({marketStatus.progress.errorCount} erreurs)</span>
                          )}
                        </span>
                        <span>{marketStatus.progress.totalTypes > 0 ? Math.round((marketStatus.progress.currentType / marketStatus.progress.totalTypes) * 100) : 0}%</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Status (when no progress available) */}
              {marketStatus?.isRunning && !marketStatus.progress && marketStatus.runningJob && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-amber-400">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm font-medium">Fetch en cours: {marketStatus.runningJob.region}</span>
                  </div>
                </div>
              )}

              {/* Fetch buttons */}
              <div className="space-y-3">
                {/* Fetch all */}
                <button
                  onClick={() => triggerMarketFetch("fetch-all")}
                  disabled={!!actionLoading || !!actionConfirmed || marketStatus?.isRunning}
                  className="relative w-full py-3 px-4 rounded-lg font-medium overflow-hidden transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: actionConfirmed === "market-fetch-all-all" ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 182, 212, 0.2)",
                    color: actionConfirmed === "market-fetch-all-all" ? "#10b981" : "rgb(34, 211, 238)",
                  }}
                >
                  {actionLoading === "market-fetch-all-all" && (
                    <span className="absolute top-0 bottom-0 left-0 bg-cyan-500/20 animate-[fillBar_0.8s_ease-out_forwards]" />
                  )}
                  {actionConfirmed === "market-fetch-all-all" && (
                    <span className="absolute inset-0 bg-green-500/15 animate-[fadeIn_0.3s_ease-out]" />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {actionLoading === "market-fetch-all-all" ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Envoi...</>
                    ) : actionConfirmed === "market-fetch-all-all" ? (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Lancé !</>
                    ) : (
                      "Fetch toutes les régions"
                    )}
                  </span>
                </button>

                {/* Region buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {["the-forge", "domain", "heimatar", "sinq-laison"].map((region) => {
                    const key = `market-fetch-region-${region}`;
                    return (
                      <button
                        key={region}
                        onClick={() => triggerMarketFetch("fetch-region", region)}
                        disabled={!!actionLoading || !!actionConfirmed || marketStatus?.isRunning}
                        className="relative py-2 px-3 rounded-lg text-sm overflow-hidden transition-colors disabled:cursor-not-allowed"
                        style={{
                          background: actionConfirmed === key ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.8)",
                          color: actionConfirmed === key ? "#10b981" : "rgb(203, 213, 225)",
                        }}
                      >
                        {actionLoading === key && (
                          <span className="absolute top-0 bottom-0 left-0 bg-cyan-500/20 animate-[fillBar_0.8s_ease-out_forwards]" />
                        )}
                        {actionConfirmed === key && (
                          <span className="absolute inset-0 bg-green-500/15 animate-[fadeIn_0.3s_ease-out]" />
                        )}
                        <span className="relative z-10 flex items-center justify-center gap-1.5">
                          {actionLoading === key ? (
                            <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> ...</>
                          ) : actionConfirmed === key ? (
                            <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> OK</>
                          ) : (
                            region
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Backfill history */}
                <button
                  onClick={() => triggerMarketFetch("backfill-history")}
                  disabled={!!actionLoading || !!actionConfirmed || marketStatus?.isRunning}
                  className="relative w-full py-3 px-4 rounded-lg font-medium overflow-hidden transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: actionConfirmed === "market-backfill-history-all" ? "rgba(16, 185, 129, 0.2)" : "rgba(168, 85, 247, 0.2)",
                    color: actionConfirmed === "market-backfill-history-all" ? "#10b981" : "rgb(192, 132, 252)",
                  }}
                >
                  {actionLoading === "market-backfill-history-all" && (
                    <span className="absolute top-0 bottom-0 left-0 bg-purple-500/20 animate-[fillBar_0.8s_ease-out_forwards]" />
                  )}
                  {actionConfirmed === "market-backfill-history-all" && (
                    <span className="absolute inset-0 bg-green-500/15 animate-[fadeIn_0.3s_ease-out]" />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {actionLoading === "market-backfill-history-all" ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Envoi...</>
                    ) : actionConfirmed === "market-backfill-history-all" ? (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Lancé !</>
                    ) : (
                      "Backfill historique (1 an)"
                    )}
                  </span>
                </button>
                <p className="text-xs text-slate-500 -mt-1 px-1">
                  Récupère l&apos;historique ESI pour tous les items sur 1 an. Long, à lancer une seule fois.
                </p>

                {/* Cleanup */}
                <button
                  onClick={() => triggerMarketFetch("cleanup")}
                  disabled={!!actionLoading || !!actionConfirmed}
                  className="relative w-full py-2 px-4 rounded-lg text-sm overflow-hidden transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: actionConfirmed === "market-cleanup-all" ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.8)",
                    color: actionConfirmed === "market-cleanup-all" ? "#10b981" : "rgb(148, 163, 184)",
                  }}
                >
                  {actionLoading === "market-cleanup-all" && (
                    <span className="absolute top-0 bottom-0 left-0 bg-slate-600/30 animate-[fillBar_0.8s_ease-out_forwards]" />
                  )}
                  {actionConfirmed === "market-cleanup-all" && (
                    <span className="absolute inset-0 bg-green-500/15 animate-[fadeIn_0.3s_ease-out]" />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {actionLoading === "market-cleanup-all" ? (
                      <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> ...</>
                    ) : actionConfirmed === "market-cleanup-all" ? (
                      <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> OK</>
                    ) : (
                      "Cleanup (supprimer vieux data)"
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Recent Jobs */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="font-medium mb-4">Jobs récents</h3>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {marketStatus?.recentJobs?.map((job) => (
                  <div
                    key={job.id}
                    className="bg-slate-800/50 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{job.region}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          job.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : job.status === "running"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      {job.completedAt && (
                        <span>{new Date(job.completedAt).toLocaleString("fr-FR")}</span>
                      )}
                      {job.duration && <span>{job.duration}s</span>}
                      {job.itemsCount > 0 && <span>{job.itemsCount.toLocaleString()} items</span>}
                    </div>
                    {job.errorMessage && (
                      <div className="text-xs text-red-400 mt-1 truncate">{job.errorMessage}</div>
                    )}
                  </div>
                ))}

                {(!marketStatus?.recentJobs?.length) && (
                  <div className="text-slate-500 text-sm text-center py-4">
                    Aucun job récent
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Last Fetch per Region */}
        {(marketStatus?.lastSuccessfulByRegion?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Dernier fetch par région</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {marketStatus?.lastSuccessfulByRegion?.map((item) => (
                <div
                  key={item.regionId}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center"
                >
                  <div className="text-sm font-medium mb-1">{item.region}</div>
                  <div className="text-xs text-slate-500">
                    {item.lastFetch
                      ? new Date(item.lastFetch).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Jamais"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

