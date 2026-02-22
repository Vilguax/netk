"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import { PasteHandler, PasteIndicator } from "@/components/PasteHandler";
import { BeltOverview, OreChart, RockTable, MiningProgress } from "@/components/dashboard";
import { useSurveyScannerContext } from "@/contexts/SurveyScannerContext";
import type { SurveyScan } from "@netk/types";

export default function RockRadarPage() {
  const { status } = useSession();
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState("the-forge");

  const {
    scans,
    currentScan,
    error,
    hasScans,
    addScan,
    setError,
    clearScans,
    currentScanStats,
    miningRate,
    orePrices,
    setOrePrices,
    totalValue,
    isLoadingPrices,
    setIsLoadingPrices,
  } = useSurveyScannerContext();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  // Fetch prices when scan changes
  const fetchPrices = useCallback(async () => {
    if (!currentScan || currentScan.rocks.length === 0) return;

    setIsLoadingPrices(true);

    try {
      // Aggregate quantities by ore name
      const oreQuantities = new Map<string, number>();
      currentScan.rocks.forEach((rock) => {
        const current = oreQuantities.get(rock.oreName) || 0;
        oreQuantities.set(rock.oreName, current + rock.quantity);
      });

      const items = Array.from(oreQuantities.entries()).map(([name, quantity]) => ({
        name,
        quantity,
      }));

      const response = await fetch("/api/appraisal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, region: selectedRegion }),
      });

      if (response.ok) {
        const data = await response.json();
        const prices = new Map<string, number>();
        data.items?.forEach((item: { name: string; pricePerUnit: number }) => {
          prices.set(item.name, item.pricePerUnit);
        });
        setOrePrices(prices);
      }
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    } finally {
      setIsLoadingPrices(false);
    }
  }, [currentScan, selectedRegion, setOrePrices, setIsLoadingPrices]);

  useEffect(() => {
    if (currentScan) {
      fetchPrices();
    }
  }, [currentScan?.id, selectedRegion, fetchPrices]);

  const handleScan = useCallback(
    (scan: SurveyScan) => {
      addScan(scan);
    },
    [addScan]
  );

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      {/* Paste handler (invisible) */}
      <PasteHandler onScan={handleScan} onError={setError} enabled={true} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {!hasScans ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 mb-6 rounded-full bg-amber-500/10 flex items-center justify-center">
              <svg className="w-12 h-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Pret a analyser</h2>
            <p className="text-slate-400 mb-6 text-center max-w-md">
              Ouvrez votre Survey Scanner dans EVE, selectionnez tous les
              asteroides et copiez-les (Ctrl+A puis Ctrl+C)
            </p>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
              <kbd className="px-2 py-1 text-sm font-mono bg-slate-700 rounded">Ctrl</kbd>
              <span className="text-slate-500">+</span>
              <kbd className="px-2 py-1 text-sm font-mono bg-slate-700 rounded">V</kbd>
              <span className="text-slate-400 ml-2">pour coller le scan</span>
            </div>
          </div>
        ) : (
          /* Dashboard */
          <div className="space-y-6">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Analyse du Belt</h2>
                <p className="text-sm text-slate-400">
                  {scans.length} scan{scans.length > 1 ? "s" : ""} - Dernier:{" "}
                  {currentScan?.timestamp.toLocaleTimeString("fr-FR")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Region selector */}
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="the-forge">Jita (The Forge)</option>
                  <option value="domain">Amarr (Domain)</option>
                  <option value="heimatar">Rens (Heimatar)</option>
                  <option value="sinq-laison">Dodixie (Sinq Laison)</option>
                </select>

                <button
                  onClick={clearScans}
                  className="px-3 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
                >
                  Nouveau belt
                </button>
              </div>
            </div>

            {/* Overview stats */}
            {currentScanStats && (
              <BeltOverview
                totalVolume={currentScanStats.totalVolume}
                totalRocks={currentScanStats.totalRocks}
                totalValue={totalValue || undefined}
                averageDistance={currentScanStats.averageDistance}
                isLoading={isLoadingPrices}
              />
            )}

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Mining progress (if multiple scans) */}
              {miningRate && scans.length >= 2 && (
                <div className="lg:col-span-1">
                  <MiningProgress
                    initialVolume={scans[0].totalVolume}
                    currentVolume={currentScan?.totalVolume || 0}
                    rateM3PerHour={miningRate.rateM3PerHour}
                    etaFormatted={miningRate.etaFormatted}
                    estimatedCompletion={miningRate.estimatedCompletion}
                    isReliable={miningRate.isReliable}
                  />
                </div>
              )}

              {/* Ore chart */}
              {currentScanStats && (
                <div
                  className={`${
                    miningRate && scans.length >= 2 ? "lg:col-span-2" : "lg:col-span-3"
                  } p-6 rounded-xl bg-slate-900/50 border border-slate-700/50`}
                >
                  <h3 className="text-lg font-semibold mb-4">Repartition des minerais</h3>
                  <OreChart oreBreakdown={currentScanStats.oreBreakdown} />
                </div>
              )}
            </div>

            {/* Rock table */}
            {currentScan && (
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-700/50">
                <h3 className="text-lg font-semibold mb-4">
                  Liste des asteroides ({currentScan.rocks.length})
                </h3>
                <RockTable
                  rocks={currentScan.rocks}
                  prices={orePrices.size > 0 ? orePrices : undefined}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Paste indicator */}
      <PasteIndicator hasScans={hasScans} isListening={true} />
    </div>
  );
}
