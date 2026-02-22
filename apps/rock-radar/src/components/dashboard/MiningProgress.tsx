"use client";

import { formatNumber, formatVolume } from "@/lib/format";

interface MiningProgressProps {
  initialVolume: number;
  currentVolume: number;
  rateM3PerHour: number | null;
  etaFormatted: string | null;
  estimatedCompletion: Date | null;
  isReliable: boolean;
}

export function MiningProgress({
  initialVolume,
  currentVolume,
  rateM3PerHour,
  etaFormatted,
  estimatedCompletion,
  isReliable,
}: MiningProgressProps) {
  const volumeMined = initialVolume - currentVolume;
  const percentComplete = initialVolume > 0 ? (volumeMined / initialVolume) * 100 : 0;

  return (
    <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Progression</h3>
        {!isReliable && rateM3PerHour !== null && (
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
            Estimation approximative
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Mine</span>
          <span className="text-white font-medium">{percentComplete.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(percentComplete, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{formatVolume(volumeMined)}</span>
          <span>{formatVolume(initialVolume)}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Taux de minage</p>
          <p className="text-lg font-semibold text-white">
            {rateM3PerHour !== null ? `${formatNumber(rateM3PerHour)} m³/h` : "-"}
          </p>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Volume restant</p>
          <p className="text-lg font-semibold text-white">{formatVolume(currentVolume)}</p>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Temps restant</p>
          <p className="text-lg font-semibold text-amber-400">
            {etaFormatted || "-"}
          </p>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Fin estimee</p>
          <p className="text-lg font-semibold text-white">
            {estimatedCompletion
              ? estimatedCompletion.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </p>
        </div>
      </div>

      {/* Tip */}
      {rateM3PerHour === null && (
        <p className="text-xs text-slate-500 mt-4 text-center">
          Collez plusieurs scans pour calculer le taux de minage
        </p>
      )}
    </div>
  );
}
