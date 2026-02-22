"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Region, ScanResultItem, DetailedOpportunity } from "@netk/types";
import { REGIONS } from "@netk/types";
import type { FactionTheme } from "@netk/themes";
import { FACTION_THEMES } from "@netk/themes";
import { DetailsModal } from "@/components/scanner/DetailsModal";
import { useRegionConfig } from "@/hooks/useRegionConfig";
import { ScopeSelector } from "@/components/scanner/ScopeSelector";

const ParticleField = dynamic(
  () =>
    import("@/components/backgrounds/ParticleField").then(
      (mod) => mod.ParticleField
    ),
  { ssr: false }
);

interface RegionScannerProps {
  region: Region;
  theme: FactionTheme;
  characterName: string;
  gatewayUrl: string;
}

interface ScanDebug {
  totalContracts: number;
  processedContracts: number;
  contractsWithItems: number;
  contractsWithBuyOrders: number;
  profitableContracts: number;
  errors: string[];
}

export function RegionScanner({
  region,
  theme,
  characterName,
  gatewayUrl,
}: RegionScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<ScanDebug | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<DetailedOpportunity | null>(null);

  const { scope, setScope } = useRegionConfig(region.slug);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setDebug(null);

    try {
      let url = `/api/scan/${region.slug}`;
      if (scope.type !== "region" && scope.id) {
        url += `?scopeType=${scope.type}&scopeId=${scope.id}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du scan");
      }

      setResults(data.opportunities || []);
      setDebug(data.debug || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de scanner les contrats."
      );
    } finally {
      setIsScanning(false);
    }
  };

  const formatIsk = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient}`}>
      <ParticleField color={theme.particleColor} count={300} />

      <header
        className="border-b px-6 py-4"
        style={{ borderColor: `${theme.primary}30` }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href={gatewayUrl}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← NETK
            </a>
            <div
              className="w-px h-6"
              style={{ backgroundColor: `${theme.primary}50` }}
            />
            <nav className="flex items-center gap-1">
              {Object.values(REGIONS).map((r) => {
                const rTheme = FACTION_THEMES[r.faction];
                const isActive = r.slug === region.slug;
                return (
                  <Link
                    key={r.slug}
                    href={`/${r.slug}`}
                    className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? `${rTheme.primary}20` : "transparent",
                      color: isActive ? rTheme.primary : "#94a3b8",
                      borderBottom: isActive ? `2px solid ${rTheme.primary}` : "2px solid transparent",
                    }}
                  >
                    {r.hub.split(" ")[0]}
                  </Link>
                );
              })}
            </nav>
          </div>
          <span className="text-slate-400">{characterName}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Scanner de Flips
            </h2>
            <p className="text-slate-400">Region: {region.name}</p>
          </div>

          <div className="flex items-center gap-4">
            <ScopeSelector
              region={region}
              scope={scope}
              onScopeChange={setScope}
              theme={theme}
            />

            <button
              onClick={handleScan}
              disabled={isScanning}
              className="px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: theme.primary,
                color: "#000",
              }}
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Scan...
                </span>
              ) : (
                "Scanner"
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200">
            {error}
          </div>
        )}

        {debug && (
          <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-sm">
            <p className="text-slate-400 mb-2 font-medium">Debug scan:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-300">
              <span>
                Contrats totaux:{" "}
                <span className="text-white">{debug.totalContracts}</span>
              </span>
              <span>
                Traites:{" "}
                <span className="text-white">{debug.processedContracts}</span>
              </span>
              <span>
                Avec items:{" "}
                <span className="text-white">{debug.contractsWithItems}</span>
              </span>
              <span>
                Avec buy orders:{" "}
                <span className="text-white">{debug.contractsWithBuyOrders}</span>
              </span>
              <span>
                Profitables:{" "}
                <span className="text-green-400">{debug.profitableContracts}</span>
              </span>
              <span>
                Erreurs:{" "}
                <span className="text-red-400">{debug.errors.length}</span>
              </span>
            </div>
          </div>
        )}

        {results.length === 0 && !isScanning && !error && (
          <div
            className="text-center py-20 rounded-xl border-2 border-dashed"
            style={{ borderColor: `${theme.primary}30` }}
          >
            <p className="text-slate-400 mb-2">Aucun resultat pour le moment</p>
            <p className="text-slate-500 text-sm">
              Cliquez sur &quot;Scanner&quot; pour demarrer
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <div
              className="grid grid-cols-7 gap-4 px-4 py-2 text-sm font-medium"
              style={{ color: theme.accent }}
            >
              <span>Item</span>
              <span className="text-right">Prix Contrat</span>
              <span className="text-right">Prix Vente</span>
              <span className="text-right">Profit Net</span>
              <span className="text-right">ROI</span>
              <span className="text-center">Jumps</span>
              <span></span>
            </div>

            {results.map((result) => (
              <div
                key={result.contractId}
                className="grid grid-cols-7 gap-4 items-center px-4 py-3 rounded-lg transition-colors cursor-pointer hover:bg-slate-800/30"
                style={{
                  backgroundColor: `${theme.primary}10`,
                  borderLeft: `3px solid ${
                    result.roi > 20 ? "#22c55e" : theme.primary
                  }`,
                }}
                onClick={() => setSelectedOpportunity(result.details)}
              >
                <span className="text-white font-medium truncate">
                  {result.itemName}
                </span>
                <span className="text-right text-slate-300">
                  {formatIsk(result.contractPrice)} ISK
                </span>
                <span className="text-right text-slate-300">
                  {formatIsk(result.sellPrice)} ISK
                </span>
                <span
                  className={`text-right font-medium ${
                    result.netProfit > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {result.netProfit > 0 ? "+" : ""}
                  {formatIsk(result.netProfit)} ISK
                </span>
                <span
                  className={`text-right font-medium ${
                    result.roi > 20
                      ? "text-green-400"
                      : result.roi > 10
                        ? "text-yellow-400"
                        : "text-slate-400"
                  }`}
                >
                  {result.roi.toFixed(1)}%
                </span>
                <span
                  className={`text-center font-medium ${
                    result.jumpsToSell === 0
                      ? "text-green-400"
                      : result.jumpsToSell !== undefined && result.jumpsToSell <= 5
                        ? "text-yellow-400"
                        : "text-slate-400"
                  }`}
                >
                  {result.jumpsToSell !== undefined && result.jumpsToSell >= 0
                    ? result.jumpsToSell === 0
                      ? "Sur place"
                      : `${result.jumpsToSell}j`
                    : "-"}
                </span>
                <div className="text-right">
                  <button
                    className="text-sm px-3 py-1 rounded transition-colors"
                    style={{
                      backgroundColor: `${theme.primary}20`,
                      color: theme.primary,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOpportunity(result.details);
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedOpportunity && (
        <DetailsModal
          opportunity={selectedOpportunity}
          theme={theme}
          region={region.slug}
          onClose={() => setSelectedOpportunity(null)}
        />
      )}
    </div>
  );
}
