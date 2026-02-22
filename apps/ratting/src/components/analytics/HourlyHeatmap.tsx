"use client";

interface HourlyHeatmapProps {
  hourlyData: Record<number, number>;
  dayOfWeekData: Record<number, number>;
  isLoading?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formatISK(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
}

function getIntensity(value: number, max: number): string {
  if (max === 0) return "rgba(16, 185, 129, 0.05)";
  const ratio = value / max;
  if (ratio === 0) return "rgba(16, 185, 129, 0.05)";
  if (ratio < 0.25) return "rgba(16, 185, 129, 0.2)";
  if (ratio < 0.5) return "rgba(16, 185, 129, 0.4)";
  if (ratio < 0.75) return "rgba(16, 185, 129, 0.6)";
  return "rgba(16, 185, 129, 0.9)";
}

export function HourlyHeatmap({ hourlyData, dayOfWeekData, isLoading }: HourlyHeatmapProps) {
  if (isLoading) {
    return (
      <div
        className="p-6 rounded-xl border"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <h3 className="text-lg font-semibold mb-4">Repartition Horaire</h3>
        <div className="h-32 animate-pulse rounded-lg" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  const hourlyMax = Math.max(0, ...Object.values(hourlyData));
  const dayMax = Math.max(0, ...Object.values(dayOfWeekData));

  // Find best hour
  const bestHour = Object.entries(hourlyData).reduce(
    (best, [hour, value]) => (value > best.value ? { hour: parseInt(hour), value } : best),
    { hour: 0, value: 0 }
  );

  // Find best day
  const bestDay = Object.entries(dayOfWeekData).reduce(
    (best, [day, value]) => (value > best.value ? { day: parseInt(day), value } : best),
    { day: 0, value: 0 }
  );

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Repartition Temporelle</h3>

      {/* Hourly breakdown */}
      <div className="mb-6">
        <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
          Par heure de la journee
        </p>
        <div className="flex gap-1">
          {HOURS.map((hour) => {
            const value = hourlyData[hour] || 0;
            return (
              <div
                key={hour}
                className="flex-1 h-8 rounded-sm cursor-pointer transition-transform hover:scale-110"
                style={{ background: getIntensity(value, hourlyMax) }}
                title={`${hour}h: ${formatISK(value)} ISK`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            0h
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            12h
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            23h
          </span>
        </div>
      </div>

      {/* Day of week breakdown */}
      <div className="mb-6">
        <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
          Par jour de la semaine
        </p>
        <div className="flex gap-2">
          {DAYS.map((day, index) => {
            const value = dayOfWeekData[index] || 0;
            return (
              <div key={day} className="flex-1 text-center">
                <div
                  className="h-12 rounded cursor-pointer transition-transform hover:scale-105 flex items-center justify-center"
                  style={{ background: getIntensity(value, dayMax) }}
                  title={`${day}: ${formatISK(value)} ISK`}
                >
                  <span className="text-xs font-medium">{formatISK(value)}</span>
                </div>
                <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Best times */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Meilleure heure
          </p>
          <p className="font-bold text-lg" style={{ color: "var(--accent-green)" }}>
            {bestHour.hour}h - {bestHour.hour + 1}h
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {formatISK(bestHour.value)} ISK
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Meilleur jour
          </p>
          <p className="font-bold text-lg" style={{ color: "var(--accent-green)" }}>
            {DAYS[bestDay.day]}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {formatISK(bestDay.value)} ISK
          </p>
        </div>
      </div>
    </div>
  );
}
