"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  trend?: number;
  icon: ReactNode;
  color?: string;
}

export function StatCard({
  title,
  value,
  trend,
  icon,
  color = "var(--accent-green)",
}: StatCardProps) {
  const TrendIcon =
    trend === undefined || trend === 0
      ? Minus
      : trend > 0
      ? TrendingUp
      : TrendingDown;

  const trendColor =
    trend === undefined || trend === 0
      ? "var(--text-secondary)"
      : trend > 0
      ? "var(--accent-green)"
      : "#ef4444";

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {title}
          </p>
          <p className="text-2xl font-bold" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1" style={{ color: trendColor }}>
          <TrendIcon size={16} />
          <span className="text-sm font-medium">
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
          <span
            className="text-sm ml-1"
            style={{ color: "var(--text-secondary)" }}
          >
            vs hier
          </span>
        </div>
      )}
    </div>
  );
}
