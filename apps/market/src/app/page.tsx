"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PriceTable } from "@/components/PriceTable";
import { PriceChart } from "@/components/PriceChart";
import { OrdersTable } from "@/components/OrdersTable";
import { TransactionsTable } from "@/components/TransactionsTable";
import { Dashboard } from "@/components/Dashboard";

// ============ Types ============

interface SearchResult {
  id: number;
  name: string;
  iconId: number | null;
}

interface RegionPrice {
  regionId: string;
  regionName: string;
  hub: string;
  buyPrice: number;
  sellPrice: number;
  buyVolume: number;
  sellVolume: number;
  updatedAt: string;
}

interface HistoryPoint {
  date: string;
  buyPrice: number;
  sellPrice: number;
  buyVolume: number;
  sellVolume: number;
}

interface ItemData {
  type: { id: number; name: string; iconId: number | null; volume: number };
  prices: RegionPrice[];
  history: Record<string, HistoryPoint[]>;
}

type NavSection = "dashboard" | "browser" | "orders" | "transactions";

const NAV_ITEMS: { id: NavSection; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "orders", label: "Ordres", icon: "orders" },
  { id: "transactions", label: "Transactions", icon: "transactions" },
  { id: "browser", label: "Browser", icon: "search" },
];

// ============ Nav Icons ============

function NavIcon({ type, size = 18 }: { type: string; size?: number }) {
  switch (type) {
    case "search":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      );
    case "orders":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      );
    case "transactions":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    case "dashboard":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "refresh":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
        </svg>
      );
    default:
      return null;
  }
}

// ============ Main Page ============

export default function MarketPage() {
  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Browser state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("10000002");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search autocomplete
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}&limit=15`);
        const data = await res.json();
        setResults(data.results || []);
        setShowResults(true);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Click outside to close results
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load item data
  const loadItem = useCallback(async (typeId: number, historyDays: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market/${typeId}?days=${historyDays}`);
      if (!res.ok) return;
      const data: ItemData = await res.json();
      setSelectedItem(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectItem = useCallback(
    (item: SearchResult) => {
      setQuery(item.name);
      setShowResults(false);
      loadItem(item.id, days);
    },
    [loadItem, days]
  );

  // Reload when days changes
  useEffect(() => {
    if (selectedItem) {
      loadItem(selectedItem.type.id, days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const bestSell = selectedItem?.prices?.reduce(
    (best, p) => (p.sellPrice > 0 && (best === null || p.sellPrice < best.sellPrice) ? p : best),
    null as RegionPrice | null
  );

  const bestBuy = selectedItem?.prices?.reduce(
    (best, p) => (p.buyPrice > 0 && (best === null || p.buyPrice > best.buyPrice) ? p : best),
    null as RegionPrice | null
  );

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex" style={{ height: "calc(100vh - 40px)", background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="h-full border-r flex flex-col flex-shrink-0 transition-all duration-200"
        style={{
          width: sidebarCollapsed ? 56 : 200,
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        {/* Logo */}
        <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setActiveSection("dashboard")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}
            >
              M
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-sm">
                <span style={{ color: "#f87171" }}>NETK</span>{" "}
                <span style={{ color: "var(--text-secondary)" }}>Market</span>
              </span>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors relative"
                style={{
                  color: isActive ? "#f87171" : "var(--text-secondary)",
                  background: isActive ? "rgba(239, 68, 68, 0.1)" : "transparent",
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                    style={{ background: "#f87171" }}
                  />
                )}
                <span className="flex-shrink-0 ml-1">
                  <NavIcon type={item.icon} size={18} />
                </span>
                {!sidebarCollapsed && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full p-3 flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: sidebarCollapsed ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with search (browser mode) */}
        {activeSection === "browser" && (
          <header
            className="border-b flex-shrink-0"
            style={{ borderColor: "var(--border)", background: "rgba(10, 14, 23, 0.5)" }}
          >
            <div className="px-6 py-3 flex items-center gap-4">
              <div ref={searchRef} className="relative flex-1 max-w-2xl">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  placeholder="Rechercher un item... (ex: Tritanium, PLEX, Ishtar)"
                  className="w-full px-4 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                {searchLoading && (
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--border)", borderTopColor: "#f87171" }}
                  />
                )}

                {/* Results dropdown */}
                {showResults && results.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-2xl max-h-80 overflow-y-auto z-50"
                    style={{
                      background: "rgba(15, 23, 42, 0.98)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {results.map((item) => (
                      <button
                        key={item.id}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-3"
                        onClick={() => selectItem(item)}
                      >
                        <img
                          src={`https://images.evetech.net/types/${item.id}/icon?size=32`}
                          alt=""
                          className="w-6 h-6 rounded"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                        <span>{item.name}</span>
                        <span className="ml-auto text-xs" style={{ color: "var(--text-secondary)" }}>
                          #{item.id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Top bar for orders/transactions/dashboard â€” with refresh */}
        {activeSection !== "browser" && (
          <header
            className="border-b flex-shrink-0"
            style={{ borderColor: "var(--border)", background: "rgba(10, 14, 23, 0.5)" }}
          >
            <div className="px-6 py-3 flex items-center gap-4">
              <h1 className="text-lg font-semibold">
                {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
              </h1>
              <button
                onClick={handleRefresh}
                className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
                title="Rafraîchir les données (re-sync ESI)"
              >
                <NavIcon type="refresh" size={14} />
                {!sidebarCollapsed && "Rafraîchir"}
              </button>
            </div>
          </header>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          {/* Dashboard section */}
          {activeSection === "dashboard" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
              <Dashboard key={`dashboard-${refreshKey}`} />
            </div>
          )}

          {/* Browser section */}
          {activeSection === "browser" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Empty state */}
              {!selectedItem && !loading && (
                <div className="text-center py-20">
                  <div
                    className="text-6xl mb-6 inline-block"
                    style={{ color: "#f87171", opacity: 0.3 }}
                  >
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Market Browser</h2>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Recherchez un item pour voir les prix et l&apos;historique
                  </p>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="text-center py-20">
                  <div
                    className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
                    style={{ borderColor: "var(--border)", borderTopColor: "#f87171" }}
                  />
                  <p style={{ color: "var(--text-secondary)" }}>Chargement...</p>
                </div>
              )}

              {/* Item detail */}
              {selectedItem && !loading && (
                <div className="space-y-6">
                  {/* Item header */}
                  <div className="flex items-center gap-4">
                    <img
                      src={`https://images.evetech.net/types/${selectedItem.type.id}/icon?size=64`}
                      alt=""
                      className="w-12 h-12 rounded-lg"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    <div>
                      <h1 className="text-2xl font-bold">{selectedItem.type.name}</h1>
                      <div className="flex items-center gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span>Volume: {selectedItem.type.volume.toLocaleString("fr-FR")} m³</span>
                        <span>Type ID: {selectedItem.type.id}</span>
                      </div>
                    </div>

                    {/* Quick stats */}
                    {bestSell && (
                      <div className="ml-auto text-right">
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          Meilleur sell ({bestSell.hub})
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--accent-green)" }}>
                          {bestSell.sellPrice.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ISK
                        </div>
                      </div>
                    )}
                    {bestBuy && (
                      <div className="text-right">
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          Meilleur buy ({bestBuy.hub})
                        </div>
                        <div className="text-lg font-bold" style={{ color: "var(--accent-blue)" }}>
                          {bestBuy.buyPrice.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ISK
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price table */}
                  <PriceTable prices={selectedItem.prices} />

                  {/* Chart controls */}
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">Historique des prix</h2>

                    {/* Region selector */}
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-sm outline-none"
                      style={{
                        background: "rgba(30, 41, 59, 0.8)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {selectedItem.prices.map((p) => (
                        <option key={p.regionId} value={p.regionId}>
                          {p.regionName} ({p.hub})
                        </option>
                      ))}
                    </select>

                    {/* Days selector */}
                    <div className="flex rounded-lg overflow-hidden ml-auto" style={{ border: "1px solid var(--border)" }}>
                      {[7, 30, 90, 365].map((d) => (
                        <button
                          key={d}
                          className="px-3 py-1.5 text-xs font-medium transition-colors"
                          style={{
                            background: days === d ? "rgba(239, 68, 68, 0.2)" : "transparent",
                            color: days === d ? "#f87171" : "var(--text-secondary)",
                          }}
                          onClick={() => setDays(d)}
                        >
                          {d >= 365 ? "1a" : `${d}j`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price chart */}
                  <PriceChart
                    data={selectedItem.history[selectedRegion] || []}
                    regionName={
                      selectedItem.prices.find((p) => p.regionId === selectedRegion)?.regionName || "Region"
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Orders section */}
          {activeSection === "orders" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
              <OrdersTable key={`orders-${refreshKey}`} />
            </div>
          )}

          {/* Transactions section */}
          {activeSection === "transactions" && (
            <div className="max-w-7xl mx-auto px-6 py-8">
              <TransactionsTable key={`transactions-${refreshKey}`} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

