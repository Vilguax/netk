"use client";

import { useState, useMemo } from "react";
import type { SurveyRock } from "@netk/types";
import { formatNumber, formatDistance, formatVolume } from "@/lib/format";

interface RockTableProps {
  rocks: SurveyRock[];
  prices?: Map<string, number>; // ore name -> price per unit
}

type SortKey = "oreName" | "volume" | "quantity" | "distance" | "value";
type SortDirection = "asc" | "desc";

export function RockTable({ rocks, prices }: RockTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedRocks = useMemo(() => {
    return [...rocks].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "oreName":
          comparison = a.oreName.localeCompare(b.oreName);
          break;
        case "volume":
          comparison = a.volume - b.volume;
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "distance":
          comparison = a.distance - b.distance;
          break;
        case "value":
          const aValue = a.iskValue != null ? a.iskValue : (prices?.get(a.oreName) || 0) * a.quantity;
          const bValue = b.iskValue != null ? b.iskValue : (prices?.get(b.oreName) || 0) * b.quantity;
          comparison = aValue - bValue;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [rocks, sortKey, sortDirection, prices]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "distance" ? "asc" : "desc");
    }
  };

  const SortHeader = ({
    label,
    sortKeyValue,
    className = "",
  }: {
    label: string;
    sortKeyValue: SortKey;
    className?: string;
  }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${className}`}
      onClick={() => handleSort(sortKeyValue)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyValue && (
          <span className="text-amber-400">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );

  if (rocks.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
        Aucun rocher a afficher
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-800/50 border-b border-slate-700">
          <tr>
            <SortHeader label="Minerai" sortKeyValue="oreName" />
            <SortHeader label="Volume" sortKeyValue="volume" className="text-right" />
            <SortHeader label="Quantite" sortKeyValue="quantity" className="text-right" />
            <SortHeader label="Distance" sortKeyValue="distance" className="text-right" />
            {prices && <SortHeader label="Valeur" sortKeyValue="value" className="text-right" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {sortedRocks.map((rock) => {
            const value =
              rock.iskValue != null
                ? rock.iskValue
                : prices
                ? (prices.get(rock.oreName) || 0) * rock.quantity
                : null;

            return (
              <tr
                key={rock.id}
                className="hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="text-white font-medium">{rock.oreName}</span>
                </td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {formatVolume(rock.volume)}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {formatNumber(rock.quantity)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`${
                      rock.distance < 5000
                        ? "text-green-400"
                        : rock.distance < 15000
                        ? "text-amber-400"
                        : "text-slate-400"
                    }`}
                  >
                    {formatDistance(rock.distance)}
                  </span>
                </td>
                {prices && (
                  <td className="px-4 py-3 text-right text-emerald-400">
                    {value ? formatNumber(value) : "-"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
