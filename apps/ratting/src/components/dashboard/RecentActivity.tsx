"use client";

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Crosshair } from "lucide-react";

interface WalletEntry {
  id: number;
  date: string;
  amount: number;
  description: string;
  characterId?: string;
  characterName?: string;
}

interface RecentActivityProps {
  entries: WalletEntry[];
  isLoading?: boolean;
  showCharacter?: boolean;
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

export function RecentActivity({ entries, isLoading, showCharacter = false }: RecentActivityProps) {
  if (isLoading) {
    return (
      <div
        className="p-6 rounded-xl border"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <h3 className="text-lg font-semibold mb-4">Activite Recente</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg animate-pulse"
              style={{ background: "var(--border)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-xl border"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Activite Recente</h3>

      {entries.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          Aucune activite recente
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: "rgba(16, 185, 129, 0.05)" }}
            >
              <div className="flex items-center gap-3">
                {showCharacter && entry.characterId ? (
                  <img
                    src={`https://images.evetech.net/characters/${entry.characterId}/portrait?size=32`}
                    alt={entry.characterName || ""}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "var(--accent-green)",
                    }}
                  >
                    <Crosshair size={16} />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">
                    {showCharacter && entry.characterName
                      ? entry.characterName
                      : "Bounty Prize"}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {formatDistanceToNow(new Date(entry.date), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
              <p
                className="font-bold"
                style={{ color: "var(--accent-green)" }}
              >
                +{formatISK(entry.amount)} ISK
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
