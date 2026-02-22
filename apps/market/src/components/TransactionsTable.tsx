"use client";

import { useState, useEffect } from "react";

interface Transaction {
  transactionId: number;
  typeId: number;
  typeName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isBuy: boolean;
  stationId: number;
  stationName: string;
  date: string;
  characterId: string;
  characterName: string;
}

interface TransactionsData {
  transactions: Transaction[];
  characters: Array<{
    characterId: string;
    characterName: string;
    status: string;
    transactionCount: number;
  }>;
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
}

function formatIsk(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SortKey = "typeName" | "unitPrice" | "total" | "quantity" | "date" | "characterName";
type SortDir = "asc" | "desc";

export function TransactionsTable() {
  const [data, setData] = useState<TransactionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "sell" | "buy">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const res = await fetch("/api/transactions");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erreur");
        }
        const json: TransactionsData = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: "var(--border)", borderTopColor: "#f87171" }}
        />
        <p style={{ color: "var(--text-secondary)" }}>Chargement des transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "var(--accent-red)" }}>{error}</p>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Connectez-vous et liez un personnage EVE pour voir vos transactions.
        </p>
      </div>
    );
  }

  if (!data || data.transactions.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mb-4" style={{ color: "var(--text-secondary)", opacity: 0.3 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Aucune transaction</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Vos transactions d&apos;achat/vente apparaîtront ici.
        </p>
      </div>
    );
  }

  const filtered = data.transactions.filter((t) => {
    if (filter === "sell") return !t.isBuy;
    if (filter === "buy") return t.isBuy;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "typeName":
        cmp = a.typeName.localeCompare(b.typeName);
        break;
      case "unitPrice":
        cmp = a.unitPrice - b.unitPrice;
        break;
      case "total":
        cmp = a.total - b.total;
        break;
      case "quantity":
        cmp = a.quantity - b.quantity;
        break;
      case "date":
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case "characterName":
        cmp = a.characterName.localeCompare(b.characterName);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Calculate totals for header
  const totalBuyIsk = filtered.filter((t) => t.isBuy).reduce((sum, t) => sum + t.total, 0);
  const totalSellIsk = filtered.filter((t) => !t.isBuy).reduce((sum, t) => sum + t.total, 0);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <div className="flex gap-3 text-xs">
          <div className="px-2 py-1 rounded" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Ventes: </span>
            <span style={{ color: "var(--accent-green)" }}>{formatIsk(totalSellIsk)} ISK</span>
          </div>
          <div className="px-2 py-1 rounded" style={{ background: "rgba(59, 130, 246, 0.1)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Achats: </span>
            <span style={{ color: "var(--accent-blue)" }}>{formatIsk(totalBuyIsk)} ISK</span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex rounded-lg overflow-hidden ml-auto" style={{ border: "1px solid var(--border)" }}>
          {(["all", "sell", "buy"] as const).map((f) => (
            <button
              key={f}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: filter === f ? "rgba(239, 68, 68, 0.2)" : "transparent",
                color: filter === f ? "#f87171" : "var(--text-secondary)",
              }}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Tous" : f === "sell" ? "Ventes" : "Achats"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("date")}>
                  Date <SortIcon col="date" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("typeName")}>
                  Item <SortIcon col="typeName" />
                </th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-secondary)" }}>
                  Type
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("quantity")}>
                  Qté <SortIcon col="quantity" />
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("unitPrice")}>
                  Prix unit. <SortIcon col="unitPrice" />
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("total")}>
                  Total <SortIcon col="total" />
                </th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-secondary)" }}>
                  Station
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("characterName")}>
                  Perso <SortIcon col="characterName" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tx) => (
                <tr
                  key={tx.transactionId}
                  className="hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://images.evetech.net/types/${tx.typeId}/icon?size=32`}
                        alt=""
                        className="w-6 h-6 rounded"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                      <span>{tx.typeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        background: tx.isBuy ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: tx.isBuy ? "var(--accent-blue)" : "var(--accent-green)",
                      }}
                    >
                      {tx.isBuy ? "ACHAT" : "VENTE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                    {tx.quantity.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatIsk(tx.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium" style={{ color: tx.isBuy ? "var(--accent-blue)" : "var(--accent-green)" }}>
                    {formatIsk(tx.total)} ISK
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span className="max-w-[200px] truncate block">{tx.stationName}</span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {tx.characterName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
