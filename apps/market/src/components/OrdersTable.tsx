"use client";

import { useState, useEffect } from "react";

interface Order {
  orderId: number;
  typeId: number;
  typeName: string;
  regionId: number;
  locationId: number;
  locationName: string;
  isBuyOrder: boolean;
  price: number;
  volumeTotal: number;
  volumeRemain: number;
  duration: number;
  issued: string;
  minVolume: number;
  characterId: string;
  characterName: string;
}

interface OrdersData {
  orders: Order[];
  characters: Array<{
    characterId: string;
    characterName: string;
    status: string;
    orderCount: number;
  }>;
  totalOrders: number;
  totalSellOrders: number;
  totalBuyOrders: number;
}

function formatIsk(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function timeRemaining(issued: string, duration: number): string {
  const issuedDate = new Date(issued);
  const expiresDate = new Date(issuedDate.getTime() + duration * 24 * 60 * 60 * 1000);
  const now = new Date();
  const remainMs = expiresDate.getTime() - now.getTime();

  if (remainMs <= 0) return "Expiré";

  const days = Math.floor(remainMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) return `${days}j ${hours}h`;
  return `${hours}h`;
}

type SortKey = "typeName" | "price" | "volumeRemain" | "issued" | "characterName";
type SortDir = "asc" | "desc";

export function OrdersTable() {
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "sell" | "buy">("all");
  const [sortKey, setSortKey] = useState<SortKey>("typeName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erreur");
        }
        const json: OrdersData = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: "var(--border)", borderTopColor: "#f87171" }}
        />
        <p style={{ color: "var(--text-secondary)" }}>Chargement des ordres...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "var(--accent-red)" }}>{error}</p>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Connectez-vous et liez un personnage EVE pour voir vos ordres.
        </p>
      </div>
    );
  }

  if (!data || data.orders.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mb-4" style={{ color: "var(--text-secondary)", opacity: 0.3 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Aucun ordre actif</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Vos ordres buy/sell actifs apparaîtront ici.
        </p>
      </div>
    );
  }

  const filtered = data.orders.filter((o) => {
    if (filter === "sell") return !o.isBuyOrder;
    if (filter === "buy") return o.isBuyOrder;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "typeName":
        cmp = a.typeName.localeCompare(b.typeName);
        break;
      case "price":
        cmp = a.price - b.price;
        break;
      case "volumeRemain":
        cmp = a.volumeRemain - b.volumeRemain;
        break;
      case "issued":
        cmp = new Date(a.issued).getTime() - new Date(b.issued).getTime();
        break;
      case "characterName":
        cmp = a.characterName.localeCompare(b.characterName);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Mes Ordres</h2>
        <div className="flex gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span className="px-2 py-1 rounded" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-green)" }}>
            {data.totalSellOrders} sell
          </span>
          <span className="px-2 py-1 rounded" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--accent-blue)" }}>
            {data.totalBuyOrders} buy
          </span>
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
              {f === "all" ? "Tous" : f === "sell" ? "Sell" : "Buy"}
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
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("typeName")}>
                  Item <SortIcon col="typeName" />
                </th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-secondary)" }}>
                  Type
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("price")}>
                  Prix <SortIcon col="price" />
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("volumeRemain")}>
                  Volume <SortIcon col="volumeRemain" />
                </th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-secondary)" }}>
                  Station
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("issued")}>
                  Expire <SortIcon col="issued" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }} onClick={() => handleSort("characterName")}>
                  Perso <SortIcon col="characterName" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((order) => (
                <tr
                  key={order.orderId}
                  className="hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://images.evetech.net/types/${order.typeId}/icon?size=32`}
                        alt=""
                        className="w-6 h-6 rounded"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                      <span>{order.typeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        background: order.isBuyOrder ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: order.isBuyOrder ? "var(--accent-blue)" : "var(--accent-green)",
                      }}
                    >
                      {order.isBuyOrder ? "BUY" : "SELL"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatIsk(order.price)} ISK
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                    {order.volumeRemain.toLocaleString("fr-FR")} / {order.volumeTotal.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span className="max-w-[200px] truncate block">{order.locationName}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                    {timeRemaining(order.issued, order.duration)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {order.characterName}
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
