"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Clipboard,
  Calculator,
  TrendingUp,
  TrendingDown,
  Package,
  MapPin,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Edit3,
  X,
  RefreshCw,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  ShoppingCart,
  Percent,
  DollarSign,
  Box,
  Layers,
} from "lucide-react";

interface AppraisedItem {
  typeId: number | null;
  name: string;
  quantity: number;
  buyPrice: number;
  splitPrice: number;
  sellPrice: number;
  buyTotal: number;
  splitTotal: number;
  sellTotal: number;
  volume: number;
  found: boolean;
}

interface RegionPrices {
  buy: number;
  split: number;
  sell: number;
  diff: number;
  name: string;
}

interface AppraisalResult {
  id: string;
  items: AppraisedItem[];
  totals: {
    buy: number;
    split: number;
    sell: number;
    volume: number;
    itemCount: number;
    totalQuantity: number;
  };
  region: string;
  regionComparison: Record<string, RegionPrices>;
  rawInput: string;
  createdAt: string;
  parseErrors: string[];
}

// Reprocess types
interface ReprocessMaterial {
  typeId: number;
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyTotal: number;
  sellTotal: number;
}

interface ReprocessData {
  materials: ReprocessMaterial[];
  totals: { buy: number; sell: number };
  efficiency: number;
  itemCount: number;
  materialCount: number;
}

// Compress types
interface CompressedItem {
  originalTypeId: number;
  originalName: string;
  originalQuantity: number;
  originalVolume: number;
  compressédTypeId: number;
  compressédName: string;
  compressédQuantity: number;
  compressédVolume: number;
  ratio: number;
  originalSellPrice: number;
  originalSellTotal: number;
  compressédSellPrice: number;
  compressédSellTotal: number;
  priceDiff: number;
  priceDiffPct: number;
}

interface CompressData {
  items: CompressedItem[];
  nonCompressible: AppraisedItem[];
  totals: {
    originalVolume: number;
    compressédVolume: number;
    volumeSaved: number;
    volumeSavedPct: number;
    originalSell: number;
    compressédSell: number;
    priceDiff: number;
    priceDiffPct: number;
  };
  compressibleCount: number;
  nonCompressibleCount: number;
}

const REGIONS = [
  { id: "the-forge", name: "Jita", fullName: "The Forge", color: "#3b82f6" },
  { id: "domain", name: "Amarr", fullName: "Domain", color: "#f59e0b" },
  { id: "heimatar", name: "Rens", fullName: "Heimatar", color: "#ef4444" },
  { id: "sinq-laison", name: "Dodixie", fullName: "Sinq Laison", color: "#10b981" },
];

// Default tax rates
const DEFAULT_BROKER_FEE = 3; // 3%
const DEFAULT_SALES_TAX = 3.6; // 3.6%

type SortKey = "name" | "quantity" | "buy" | "split" | "sell" | "volume" | "percent";
type SortDir = "asc" | "desc";

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
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M m³`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K m³`;
  }
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m³`;
}

export default function AppraisalPage() {
  const router = useRouter();
  const [pasteText, setPasteText] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("the-forge");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AppraisalResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("sell");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Copy states for actions
  const [copiedMultibuy, setCopiedMultibuy] = useState(false);
  const [copiedCSV, setCopiedCSV] = useState(false);

  // Tax rates (editable)
  const [brokerFee, setBrokerFee] = useState(DEFAULT_BROKER_FEE);
  const [salesTax, setSalesTax] = useState(DEFAULT_SALES_TAX);

  // Custom sell percentage (e.g., 90% of Jita sell)
  const [sellPercent, setSellPercent] = useState(100);

  // Tab state for results view
  type TabType = "items" | "reprocess" | "compress";
  const [activeTab, setActiveTab] = useState<TabType>("items");

  // Reprocess state
  const [reprocessData, setReprocessData] = useState<ReprocessData | null>(null);
  const [reprocessLoading, setReprocessLoading] = useState(false);
  const [reprocessEfficiency, setReprocessEfficiency] = useState(50); // Default 50%

  // Compress state
  const [compressData, setCompressData] = useState<CompressData | null>(null);
  const [compressLoading, setCompressLoading] = useState(false);

  // Check for edit data from sessionStorage (from [id] page "Modifier" button)
  useEffect(() => {
    const editData = sessionStorage.getItem("appraisal_edit");
    if (editData) {
      try {
        const { text, region } = JSON.parse(editData);
        setPasteText(text);
        setSelectedRegion(region);
        sessionStorage.removeItem("appraisal_edit");
      } catch (e) {
        // Invalid data, ignore
      }
    }
  }, []);

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Only capture if not in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const text = e.clipboardData?.getData("text");
      if (text) {
        setPasteText(text);
        e.preventDefault();
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleAppraise = useCallback(async (textToAppraise?: string) => {
    const text = textToAppraise || pasteText;
    if (!text.trim()) {
      setError("Collez du texte à évaluer");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/appraise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, region: selectedRegion }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de l'évaluation");
        return;
      }

      setResult(data);
      setEditMode(false);
      // Reset reprocess/compress data for new appraisal
      setReprocessData(null);
      setCompressData(null);

      // Update URL with appraisal ID
      router.push(`/${data.id}`, { scroll: false });

    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  }, [pasteText, selectedRegion, router]);

  const handleCopyLink = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(`${window.location.origin}/${result.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleReset = useCallback(() => {
    setPasteText("");
    setResult(null);
    setError(null);
    setEditMode(false);
    setReprocessData(null);
    setCompressData(null);
    setActiveTab("items");
    router.push("/", { scroll: false });
  }, [router]);

  const handleEdit = useCallback(() => {
    if (result) {
      setEditText(result.rawInput);
      setEditMode(true);
    }
  }, [result]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    setEditText("");
  }, []);

  const handleRecalculate = useCallback(() => {
    handleAppraise(editText);
  }, [editText, handleAppraise]);

  const handleCreateCopy = useCallback(async () => {
    if (!editText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/appraise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText, region: selectedRegion }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de la création");
        return;
      }

      setResult(data);
      setEditMode(false);
      router.push(`/${data.id}`, { scroll: false });

    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  }, [editText, selectedRegion, router]);

  // Fetch reprocess data
  const fetchReprocessData = useCallback(async () => {
    if (!result || result.items.length === 0) return;

    setReprocessLoading(true);
    try {
      const response = await fetch("/api/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: result.items
            .filter(item => item.typeId && item.found)
            .map(item => ({ typeId: item.typeId, quantity: item.quantity })),
          region: result.region,
          efficiency: reprocessEfficiency / 100,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setReprocessData(data);
      }
    } catch (err) {
      console.error("Failed to fetch reprocess data:", err);
    } finally {
      setReprocessLoading(false);
    }
  }, [result, reprocessEfficiency]);

  // Fetch compress data
  const fetchCompressData = useCallback(async () => {
    if (!result || result.items.length === 0) return;

    setCompressLoading(true);
    try {
      const response = await fetch("/api/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: result.items
            .filter(item => item.typeId && item.found)
            .map(item => ({
              typeId: item.typeId,
              name: item.name,
              quantity: item.quantity,
              volume: item.volume,
              sellPrice: item.sellPrice,
              sellTotal: item.sellTotal,
            })),
          region: result.region,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setCompressData(data);
      }
    } catch (err) {
      console.error("Failed to fetch compress data:", err);
    } finally {
      setCompressLoading(false);
    }
  }, [result]);

  // Fetch reprocess/compress data when switching tabs
  useEffect(() => {
    if (activeTab === "reprocess" && !reprocessData && result) {
      fetchReprocessData();
    } else if (activeTab === "compress" && !compressData && result) {
      fetchCompressData();
    }
  }, [activeTab, result, reprocessData, compressData, fetchReprocessData, fetchCompressData]);

  // Refetch reprocess data when efficiency changes
  useEffect(() => {
    if (activeTab === "reprocess" && result) {
      fetchReprocessData();
    }
  }, [reprocessEfficiency]);

  // Find best region (highest sell value)
  const bestRegion = result?.regionComparison
    ? Object.entries(result.regionComparison).reduce((best, [slug, data]) =>
        data.sell > (best?.data.sell || 0) ? { slug, data } : best,
      { slug: "", data: { sell: 0, buy: 0, split: 0, diff: 0, name: "" } })
    : null;

  // Sort items
  const sortedItems = result?.items
    ? [...result.items].sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (sortKey) {
          case "name":
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            return sortDir === "asc"
              ? aVal.localeCompare(bVal as string)
              : (bVal as string).localeCompare(aVal as string);
          case "quantity":
            aVal = a.quantity;
            bVal = b.quantity;
            break;
          case "buy":
            aVal = a.buyTotal;
            bVal = b.buyTotal;
            break;
          case "split":
            aVal = a.splitTotal;
            bVal = b.splitTotal;
            break;
          case "sell":
            aVal = a.sellTotal;
            bVal = b.sellTotal;
            break;
          case "volume":
            aVal = a.volume;
            bVal = b.volume;
            break;
          case "percent":
            aVal = result.totals.sell > 0 ? (a.sellTotal / result.totals.sell) * 100 : 0;
            bVal = result.totals.sell > 0 ? (b.sellTotal / result.totals.sell) * 100 : 0;
            break;
          default:
            return 0;
        }

        return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      })
    : [];

  // Toggle sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Copy as Multibuy format
  const handleCopyMultibuy = useCallback(() => {
    if (!result) return;
    const lines = result.items
      .filter(item => item.found)
      .map(item => `${item.name} ${item.quantity}`)
      .join("\n");
    navigator.clipboard.writeText(lines);
    setCopiedMultibuy(true);
    setTimeout(() => setCopiedMultibuy(false), 2000);
  }, [result]);

  // Export as CSV
  const handleExportCSV = useCallback(() => {
    if (!result) return;
    const headers = "Item,Quantité,Buy Unit,Buy Total,Split Unit,Split Total,Sell Unit,Sell Total,Volume,% Total";
    const rows = result.items.map(item => {
      const pct = result.totals.sell > 0 ? ((item.sellTotal / result.totals.sell) * 100).toFixed(2) : "0";
      return `"${item.name}",${item.quantity},${item.buyPrice.toFixed(2)},${item.buyTotal.toFixed(2)},${item.splitPrice.toFixed(2)},${item.splitTotal.toFixed(2)},${item.sellPrice.toFixed(2)},${item.sellTotal.toFixed(2)},${item.volume.toFixed(2)},${pct}`;
    });
    const csv = [headers, ...rows].join("\n");
    navigator.clipboard.writeText(csv);
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 2000);
  }, [result]);

  // Calculate custom sell total based on percentage
  const customSellTotal = result ? result.totals.sell * (sellPercent / 100) : 0;

  // Calculate spread and net after taxes (using custom sell percentage)
  const spread = result ? customSellTotal - result.totals.buy : 0;
  const spreadPct = result && result.totals.buy > 0 ? (spread / result.totals.buy) * 100 : 0;
  const totalTaxRate = (brokerFee + salesTax) / 100;
  const netAfterTaxes = result
    ? customSellTotal * (1 - totalTaxRate)
    : 0;
  const taxAmount = result ? customSellTotal - netAfterTaxes : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator size={28} style={{ color: "var(--accent-purple)" }} />
            <h1 className="text-xl font-bold">NETK Appraisal</h1>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_GATEWAY_URL || "/"}
            className="text-sm hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            ← Retour au Gateway
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!result ? (
          // Input view
          <div className="space-y-6">
            {/* Paste area */}
            <div
              className="p-6 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Clipboard size={20} style={{ color: "var(--accent-purple)" }} />
                <h2 className="text-lg font-semibold">Coller vos items</h2>
                <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(139, 92, 246, 0.2)", color: "var(--accent-purple)" }}>
                  CTRL+V n'importe où
                </span>
              </div>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Collez votre inventaire, contrat, ou liste d'items ici...

Formats supportés:
- Inventaire: Item Name    5
- Contrats: Item Name    5    10 m³
- Cargo scan: Item Name x5
- Multibuy: 5x Item Name"
                className="w-full h-48 p-4 rounded-lg resize-none"
                style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />

              {error && (
                <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: "var(--accent-red)" }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
            </div>

            {/* Region selector */}
            <div
              className="p-6 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} style={{ color: "var(--accent-blue)" }} />
                <h2 className="text-lg font-semibold">Trade Hub</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {REGIONS.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    className="p-3 rounded-lg text-left transition-all"
                    style={{
                      background: selectedRegion === region.id
                        ? `${region.color}20`
                        : "rgba(0, 0, 0, 0.2)",
                      border: `2px solid ${selectedRegion === region.id ? region.color : "transparent"}`,
                    }}
                  >
                    <p className="font-medium">{region.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {region.fullName}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sell percentage slider */}
            <div
              className="p-6 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Percent size={20} style={{ color: "var(--accent-green)" }} />
                <h2 className="text-lg font-semibold">Prix de vente</h2>
                <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(16, 185, 129, 0.2)", color: "var(--accent-green)" }}>
                  {sellPercent}% du prix Sell
                </span>
              </div>

              <div className="space-y-3">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={sellPercent}
                  onChange={(e) => setSellPercent(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--accent-green) 0%, var(--accent-green) ${(sellPercent - 50) * 2}%, rgba(255,255,255,0.1) ${(sellPercent - 50) * 2}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>50%</span>
                  <div className="flex gap-2">
                    {[80, 85, 90, 95, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setSellPercent(pct)}
                        className="px-2 py-1 rounded transition-all"
                        style={{
                          background: sellPercent === pct ? "var(--accent-green)" : "rgba(255,255,255,0.1)",
                          color: sellPercent === pct ? "white" : "var(--text-secondary)",
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={() => handleAppraise()}
              disabled={isLoading || !pasteText.trim()}
              className="w-full py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "var(--accent-purple)",
                color: "white",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Evaluation en cours...
                </>
              ) : (
                <>
                  <Calculator size={20} />
                  Evaluer
                </>
              )}
            </button>
          </div>
        ) : editMode ? (
          // Edit mode view
          <div className="space-y-6">
            <div
              className="p-6 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--accent-purple)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Edit3 size={20} style={{ color: "var(--accent-purple)" }} />
                <h2 className="text-lg font-semibold">Modifier l'évaluation</h2>
              </div>

              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full h-64 p-4 rounded-lg resize-none font-mono text-sm"
                style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />

              {error && (
                <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: "var(--accent-red)" }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  style={{ background: "rgba(255, 255, 255, 0.1)" }}
                >
                  <X size={16} />
                  Annuler
                </button>

                <button
                  onClick={handleRecalculate}
                  disabled={isLoading || !editText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: "var(--accent-purple)", color: "white" }}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Recalculer
                </button>

                <button
                  onClick={handleCreateCopy}
                  disabled={isLoading || !editText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: "var(--accent-green)", color: "white" }}
                >
                  <Plus size={16} />
                  Créer copie
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Results view
          <div className="space-y-6">
            {/* Summary cards - 4 columns with split */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={16} style={{ color: "var(--accent-blue)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Buy
                  </span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--accent-blue)" }}>
                  {formatISK(result.totals.buy)}
                </p>
              </div>

              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Split (50%)
                  </span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--accent-purple)" }}>
                  {formatISK(result.totals.split)}
                </p>
              </div>

              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: sellPercent !== 100 ? "var(--accent-green)" : "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} style={{ color: "var(--accent-green)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Sell {sellPercent !== 100 && `(${sellPercent}%)`}
                  </span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--accent-green)" }}>
                  {formatISK(customSellTotal)}
                </p>
                {sellPercent !== 100 && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    100%: {formatISK(result.totals.sell)}
                  </p>
                )}
              </div>

              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package size={16} style={{ color: "var(--accent-gold)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Volume
                  </span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--accent-gold)" }}>
                  {formatVolume(result.totals.volume)}
                </p>
              </div>
            </div>

            {/* Sell percentage slider */}
            <div
              className="p-4 rounded-xl border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Percent size={18} style={{ color: "var(--accent-green)" }} />
                  <span className="font-medium">Prix de vente personnalisé</span>
                </div>
                <span
                  className="text-sm px-2 py-1 rounded font-mono"
                  style={{ background: "rgba(16, 185, 129, 0.2)", color: "var(--accent-green)" }}
                >
                  {sellPercent}%
                </span>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={sellPercent}
                  onChange={(e) => setSellPercent(parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--accent-green) 0%, var(--accent-green) ${(sellPercent - 50) * 2}%, rgba(255,255,255,0.1) ${(sellPercent - 50) * 2}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
                <div className="flex gap-1">
                  {[85, 90, 95, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setSellPercent(pct)}
                      className="px-2 py-1 rounded text-xs transition-all"
                      style={{
                        background: sellPercent === pct ? "var(--accent-green)" : "rgba(255,255,255,0.1)",
                        color: sellPercent === pct ? "white" : "var(--text-secondary)",
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Region comparison */}
            {result.regionComparison && (
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={20} style={{ color: "var(--accent-blue)" }} />
                  <h3 className="text-lg font-semibold">Comparaison Regions</h3>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(59, 130, 246, 0.2)", color: "var(--accent-blue)" }}>
                    Prix Sell
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {REGIONS.map((region) => {
                    const data = result.regionComparison[region.id];
                    if (!data) return null;

                    const isBest = bestRegion?.slug === region.id;
                    const isSelected = region.id === result.region;

                    return (
                      <div
                        key={region.id}
                        className="p-3 rounded-lg relative"
                        style={{
                          background: isBest ? `${region.color}20` : "rgba(0, 0, 0, 0.2)",
                          border: `2px solid ${isSelected ? region.color : isBest ? `${region.color}50` : "transparent"}`,
                        }}
                      >
                        {isBest && (
                          <span
                            className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded"
                            style={{ background: region.color, color: "white" }}
                          >
                            Best
                          </span>
                        )}
                        <p className="font-medium text-sm">{data.name}</p>
                        <p className="text-lg font-bold mt-1">{formatISK(data.sell)}</p>
                        {data.diff !== 0 && (
                          <p
                            className="text-xs mt-1"
                            style={{ color: data.diff > 0 ? "var(--accent-green)" : "var(--accent-red)" }}
                          >
                            {data.diff > 0 ? "+" : ""}{data.diff.toFixed(1)}%
                          </p>
                        )}
                        {isSelected && (
                          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                            (sélectionné)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Percent size={16} style={{ color: "var(--accent-purple)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Spread
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: spreadPct >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                  {spreadPct >= 0 ? "+" : ""}{spreadPct.toFixed(1)}%
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {formatISK(spread)} ISK
                </p>
              </div>

              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} style={{ color: "var(--accent-gold)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Taxes ({(brokerFee + salesTax).toFixed(1)}%)
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--accent-red)" }}>
                  -{formatISK(taxAmount)}
                </p>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1">
                    <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Broker</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={brokerFee}
                        onChange={(e) => setBrokerFee(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-full px-2 py-1 rounded text-sm font-mono"
                        style={{
                          background: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Sales</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={salesTax}
                        onChange={(e) => setSalesTax(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-full px-2 py-1 rounded text-sm font-mono"
                        style={{
                          background: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} style={{ color: "var(--accent-green)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Net après taxes
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--accent-green)" }}>
                  {formatISK(netAfterTaxes)}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  Sur prix Sell
                </p>
              </div>

              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package size={16} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Items
                  </span>
                </div>
                <p className="text-xl font-bold">
                  {result.totals.itemCount}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {result.totals.totalQuantity.toLocaleString()} unités
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: "rgba(139, 92, 246, 0.2)",
                  color: "var(--accent-purple)",
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copié !" : "Copier le lien"}
              </button>

              <button
                onClick={handleCopyMultibuy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: "rgba(245, 158, 11, 0.2)",
                  color: "var(--accent-gold)",
                }}
              >
                {copiedMultibuy ? <Check size={16} /> : <ShoppingCart size={16} />}
                {copiedMultibuy ? "Copié !" : "Multibuy"}
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "var(--accent-green)",
                }}
              >
                {copiedCSV ? <Check size={16} /> : <FileSpreadsheet size={16} />}
                {copiedCSV ? "Copié !" : "CSV"}
              </button>

              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "var(--accent-blue)",
                }}
              >
                <Edit3 size={16} />
                Modifier
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                }}
              >
                Nouvelle évaluation
              </button>
            </div>

            {/* Tabs Navigation */}
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: "rgba(0, 0, 0, 0.3)" }}
            >
              <button
                onClick={() => setActiveTab("items")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 justify-center"
                style={{
                  background: activeTab === "items" ? "var(--card-bg)" : "transparent",
                  color: activeTab === "items" ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: activeTab === "items" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <Package size={16} />
                Items
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(139, 92, 246, 0.2)", color: "var(--accent-purple)" }}
                >
                  {result.totals.itemCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("reprocess")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 justify-center"
                style={{
                  background: activeTab === "reprocess" ? "var(--card-bg)" : "transparent",
                  color: activeTab === "reprocess" ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: activeTab === "reprocess" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <Box size={16} />
                Reprocess
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(245, 158, 11, 0.2)", color: "var(--accent-gold)" }}
                >
                  Beta
                </span>
              </button>
              <button
                onClick={() => setActiveTab("compress")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all flex-1 justify-center"
                style={{
                  background: activeTab === "compress" ? "var(--card-bg)" : "transparent",
                  color: activeTab === "compress" ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: activeTab === "compress" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <Layers size={16} />
                Compress
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(59, 130, 246, 0.2)", color: "var(--accent-blue)" }}
                >
                  Beta
                </span>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "items" && (
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <th
                          className="text-left p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Item
                            {sortKey === "name" ? (
                              sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} className="opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onClick={() => handleSort("quantity")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Qté
                            {sortKey === "quantity" ? (
                              sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} className="opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                          style={{ color: "var(--accent-blue)" }}
                          onClick={() => handleSort("buy")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Buy
                            {sortKey === "buy" ? (
                              sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} className="opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                          style={{ color: "var(--accent-purple)" }}
                          onClick={() => handleSort("split")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Split
                            {sortKey === "split" ? (
                              sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} className="opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                          style={{ color: "var(--accent-green)" }}
                          onClick={() => handleSort("sell")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Sell
                            {sortKey === "sell" ? (
                              sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} className="opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onClick={() => handleSort("volume")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Volume
                            {sortKey === "volume" ? (
                              sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} className="opacity-30" />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-right p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onClick={() => handleSort("percent")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            %
                            {sortKey === "percent" ? (
                              sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={14} className="opacity-30" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item, index) => {
                        const percentOfTotal = result.totals.sell > 0
                          ? (item.sellTotal / result.totals.sell) * 100
                          : 0;
                        return (
                          <tr
                            key={index}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              opacity: item.found ? 1 : 0.5,
                            }}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {item.typeId && (
                                  <img
                                    src={`https://images.evetech.net/types/${item.typeId}/icon?size=32`}
                                    alt=""
                                    className="w-6 h-6"
                                  />
                                )}
                                <span className={!item.found ? "italic" : ""}>
                                  {item.name}
                                  {!item.found && (
                                    <span className="text-xs ml-2" style={{ color: "var(--accent-red)" }}>
                                      (non trouvé)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="p-4 text-right" style={{ color: "var(--accent-blue)" }}>
                              <div className="font-mono">{formatISK(item.buyTotal)}</div>
                              {item.quantity > 1 && (
                                <div className="text-xs opacity-60">@{formatISK(item.buyPrice)}</div>
                              )}
                            </td>
                            <td className="p-4 text-right" style={{ color: "var(--accent-purple)" }}>
                              <div className="font-mono">{formatISK(item.splitTotal)}</div>
                              {item.quantity > 1 && (
                                <div className="text-xs opacity-60">@{formatISK(item.splitPrice)}</div>
                              )}
                            </td>
                            <td className="p-4 text-right" style={{ color: "var(--accent-green)" }}>
                              <div className="font-mono">{formatISK(item.sellTotal * sellPercent / 100)}</div>
                              {item.quantity > 1 && (
                                <div className="text-xs opacity-60">@{formatISK(item.sellPrice * sellPercent / 100)}</div>
                              )}
                            </td>
                            <td className="p-4 text-right font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                              {item.volume >= 1000
                                ? `${(item.volume / 1000).toFixed(1)}K`
                                : item.volume.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                              <span className="opacity-60"> m³</span>
                            </td>
                            <td className="p-4 text-right font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                              {percentOfTotal.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--border)" }}>
                        <td className="p-4 font-bold">TOTAL</td>
                        <td className="p-4 text-right font-mono">
                          {result.totals.totalQuantity.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono font-bold" style={{ color: "var(--accent-blue)" }}>
                          {formatISK(result.totals.buy)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold" style={{ color: "var(--accent-purple)" }}>
                          {formatISK(result.totals.split)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold" style={{ color: "var(--accent-green)" }}>
                          {formatISK(customSellTotal)}
                        </td>
                        <td className="p-4 text-right font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                          {formatVolume(result.totals.volume)}
                        </td>
                        <td className="p-4 text-right font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                          100%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "reprocess" && (
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Box size={20} style={{ color: "var(--accent-gold)" }} />
                      <h3 className="text-lg font-semibold">Valeur Reprocess</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Efficacité:</span>
                        <input
                          type="range"
                          min="30"
                          max="72"
                          step="1"
                          value={reprocessEfficiency}
                          onChange={(e) => setReprocessEfficiency(parseInt(e.target.value))}
                          className="w-20 h-2 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, var(--accent-gold) 0%, var(--accent-gold) ${((reprocessEfficiency - 30) / 42) * 100}%, rgba(255,255,255,0.1) ${((reprocessEfficiency - 30) / 42) * 100}%, rgba(255,255,255,0.1) 100%)`,
                          }}
                        />
                        <span className="text-sm font-mono" style={{ color: "var(--accent-gold)" }}>{reprocessEfficiency}%</span>
                      </div>
                    </div>
                  </div>

                  {reprocessLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-gold)" }} />
                    </div>
                  ) : reprocessData && reprocessData.materials.length > 0 ? (
                    <>
                      {/* Comparison cards */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div
                          className="p-4 rounded-lg"
                          style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                        >
                          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                            Vente directe
                          </p>
                          <p className="text-2xl font-bold" style={{ color: "var(--accent-green)" }}>
                            {formatISK(customSellTotal)}
                          </p>
                        </div>
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            background: reprocessData.totals.sell * (sellPercent / 100) > customSellTotal
                              ? "rgba(16, 185, 129, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                            border: `1px solid ${reprocessData.totals.sell * (sellPercent / 100) > customSellTotal ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          }}
                        >
                          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                            Valeur reprocessee
                          </p>
                          <p className="text-2xl font-bold" style={{ color: reprocessData.totals.sell * (sellPercent / 100) > customSellTotal ? "var(--accent-green)" : "var(--accent-gold)" }}>
                            {formatISK(reprocessData.totals.sell * (sellPercent / 100))}
                          </p>
                          <p className="text-xs mt-1" style={{
                            color: reprocessData.totals.sell * (sellPercent / 100) > customSellTotal ? "var(--accent-green)" : "var(--accent-red)"
                          }}>
                            {reprocessData.totals.sell * (sellPercent / 100) > customSellTotal ? "+" : ""}
                            {formatISK(reprocessData.totals.sell * (sellPercent / 100) - customSellTotal)} (
                            {((reprocessData.totals.sell * (sellPercent / 100) - customSellTotal) / customSellTotal * 100).toFixed(1)}%)
                          </p>
                        </div>
                      </div>

                      {/* Materials table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                              <th className="text-left p-3 font-medium" style={{ color: "var(--text-secondary)" }}>Minerai</th>
                              <th className="text-right p-3 font-medium" style={{ color: "var(--text-secondary)" }}>Quantité</th>
                              <th className="text-right p-3 font-medium" style={{ color: "var(--accent-green)" }}>Sell Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reprocessData.materials.map((mat) => (
                              <tr key={mat.typeId} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={`https://images.evetech.net/types/${mat.typeId}/icon?size=32`}
                                      alt=""
                                      className="w-5 h-5"
                                    />
                                    {mat.name}
                                  </div>
                                </td>
                                <td className="p-3 text-right font-mono">{mat.quantity.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono" style={{ color: "var(--accent-green)" }}>
                                  {formatISK(mat.sellTotal * (sellPercent / 100))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: "2px solid var(--border)" }}>
                              <td className="p-3 font-bold">TOTAL</td>
                              <td className="p-3 text-right font-mono">{reprocessData.materials.reduce((sum, m) => sum + m.quantity, 0).toLocaleString()}</td>
                              <td className="p-3 text-right font-mono font-bold" style={{ color: "var(--accent-green)" }}>
                                {formatISK(reprocessData.totals.sell * (sellPercent / 100))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div
                      className="p-4 rounded-lg text-center"
                      style={{ background: "rgba(0, 0, 0, 0.2)" }}
                    >
                      <Box size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                        {reprocessData ? "Aucun item reprocessable trouvé" : "Importez les données SDE pour activer cette fonctionnalité"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Commande: <code className="px-1 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.3)" }}>npm run sde:import -w @netk/database</code>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "compress" && (
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Layers size={20} style={{ color: "var(--accent-blue)" }} />
                      <h3 className="text-lg font-semibold">Compression</h3>
                    </div>
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Prix à {sellPercent}% Jita
                    </span>
                  </div>

                  {compressLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-blue)" }} />
                    </div>
                  ) : compressData && compressData.items.length > 0 ? (
                    <>
                      {/* Comparison cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div
                          className="p-4 rounded-lg"
                          style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                        >
                          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                            Valeur originale
                          </p>
                          <p className="text-xl font-bold" style={{ color: "var(--accent-green)" }}>
                            {formatISK(compressData.totals.originalSell * (sellPercent / 100))}
                          </p>
                        </div>
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            background: compressData.totals.priceDiff >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            border: `1px solid ${compressData.totals.priceDiff >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                          }}
                        >
                          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                            Valeur compressé
                          </p>
                          <p className="text-xl font-bold" style={{ color: "var(--accent-blue)" }}>
                            {formatISK(compressData.totals.compressedSell * (sellPercent / 100))}
                          </p>
                          <p className="text-xs mt-1" style={{
                            color: compressData.totals.priceDiff >= 0 ? "var(--accent-green)" : "var(--accent-red)"
                          }}>
                            {compressData.totals.priceDiff >= 0 ? "+" : ""}{compressData.totals.priceDiffPct.toFixed(1)}%
                          </p>
                        </div>
                        <div
                          className="p-4 rounded-lg"
                          style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.3)" }}
                        >
                          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                            Volume original
                          </p>
                          <p className="text-xl font-bold" style={{ color: "var(--accent-purple)" }}>
                            {formatVolume(compressData.totals.originalVolume)}
                          </p>
                        </div>
                        <div
                          className="p-4 rounded-lg"
                          style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)" }}
                        >
                          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                            Volume compressé
                          </p>
                          <p className="text-xl font-bold" style={{ color: "var(--accent-blue)" }}>
                            {formatVolume(compressData.totals.compressedVolume)}
                          </p>
                          <p className="text-xs mt-1" style={{ color: "var(--accent-green)" }}>
                            -{compressData.totals.volumeSavedPct.toFixed(0)}% volume
                          </p>
                        </div>
                      </div>

                      {/* Compressed items table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                              <th className="text-left p-3 font-medium" style={{ color: "var(--text-secondary)" }}>Ore</th>
                              <th className="text-right p-3 font-medium" style={{ color: "var(--text-secondary)" }}>Qté</th>
                              <th className="text-right p-3 font-medium" style={{ color: "var(--accent-green)" }}>Original</th>
                              <th className="text-center p-3 font-medium" style={{ color: "var(--text-secondary)" }}>→</th>
                              <th className="text-right p-3 font-medium" style={{ color: "var(--text-secondary)" }}>Compressed Qté</th>
                              <th className="text-right p-3 font-medium" style={{ color: "var(--accent-blue)" }}>Compressed</th>
                              <th className="text-right p-3 font-medium" style={{ color: "var(--text-secondary)" }}>Diff</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compressData.items.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={`https://images.evetech.net/types/${item.originalTypeId}/icon?size=32`}
                                      alt=""
                                      className="w-5 h-5"
                                    />
                                    <span className="text-sm">{item.originalName}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-right font-mono text-sm">{item.originalQuantity.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-sm" style={{ color: "var(--accent-green)" }}>
                                  {formatISK(item.originalSellTotal * (sellPercent / 100))}
                                </td>
                                <td className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                                  {item.ratio > 1 ? `${item.ratio}:1` : "="}
                                </td>
                                <td className="p-3 text-right font-mono text-sm">{item.compressedQuantity.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-sm" style={{ color: "var(--accent-blue)" }}>
                                  {formatISK(item.compressedSellTotal * (sellPercent / 100))}
                                </td>
                                <td className="p-3 text-right font-mono text-sm" style={{
                                  color: item.priceDiff >= 0 ? "var(--accent-green)" : "var(--accent-red)"
                                }}>
                                  {item.priceDiff >= 0 ? "+" : ""}{item.priceDiffPct.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Non-compressible items notice */}
                      {compressData.nonCompressibleCount > 0 && (
                        <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            {compressData.nonCompressibleCount} item(s) non compressible(s) - valeur conservée
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className="p-4 rounded-lg text-center"
                      style={{ background: "rgba(0, 0, 0, 0.2)" }}
                    >
                      <Layers size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                        {compressData ? "Aucun ore compressible trouvé" : "Importez les données SDE pour activer cette fonctionnalité"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Commande: <code className="px-1 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.3)" }}>npm run sde:import -w @netk/database</code>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parse errors */}
            {result.parseErrors.length > 0 && (
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  borderColor: "var(--accent-red)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} style={{ color: "var(--accent-red)" }} />
                  <span className="font-medium" style={{ color: "var(--accent-red)" }}>
                    Lignes non reconnues ({result.parseErrors.length})
                  </span>
                </div>
                <ul className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
                  {result.parseErrors.slice(0, 5).map((err, i) => (
                    <li key={i} className="font-mono truncate">{err}</li>
                  ))}
                  {result.parseErrors.length > 5 && (
                    <li>... et {result.parseErrors.length - 5} autres</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

