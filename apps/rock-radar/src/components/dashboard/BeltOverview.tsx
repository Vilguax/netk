"use client";

import { formatNumber } from "@/lib/format";

interface BeltOverviewProps {
  totalVolume: number;
  totalRocks: number;
  totalValue?: number;
  averageDistance: number;
  isLoading?: boolean;
}

export function BeltOverview({
  totalVolume,
  totalRocks,
  totalValue,
  averageDistance,
  isLoading,
}: BeltOverviewProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Volume Total"
        value={formatNumber(totalVolume)}
        unit="m³"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        gradient="from-amber-500 to-yellow-400"
      />

      <StatCard
        label="Rochers"
        value={totalRocks.toString()}
        unit="asteroides"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
        }
        gradient="from-blue-500 to-cyan-400"
      />

      <StatCard
        label="Valeur Estimee"
        value={totalValue ? formatNumber(totalValue) : "-"}
        unit="ISK"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        gradient="from-emerald-500 to-green-400"
        isLoading={isLoading}
      />

      <StatCard
        label="Distance Moyenne"
        value={formatNumber(averageDistance / 1000, 1)}
        unit="km"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        gradient="from-purple-500 to-pink-400"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  icon,
  gradient,
  isLoading,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  gradient: string;
  isLoading?: boolean;
}) {
  return (
    <div className="relative p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 overflow-hidden group hover:border-slate-600/50 transition-all duration-300">
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>
            {icon}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
          ) : (
            <>
              <span className="text-2xl font-bold text-white">{value}</span>
              <span className="text-sm text-slate-500">{unit}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
