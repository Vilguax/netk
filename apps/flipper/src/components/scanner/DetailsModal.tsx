"use client";

import { useState } from "react";
import type { DetailedOpportunity, DetailedItem } from "@netk/types";
import type { FactionTheme } from "@netk/themes";
import { formatIsk } from "@netk/calculations";

interface DetailsModalProps {
  opportunity: DetailedOpportunity;
  theme: FactionTheme;
  region: string; // Region slug for Janice market
  onClose: () => void;
}

function formatVolume(m3: number): string {
  if (m3 >= 1_000_000) return `${(m3 / 1_000_000).toFixed(2)}M m³`;
  if (m3 >= 1_000) return `${(m3 / 1_000).toFixed(1)}K m³`;
  return `${m3.toFixed(1)} m³`;
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ItemRow({ item, theme }: { item: DetailedItem; theme: FactionTheme }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasMultipleOrders = item.buyOrders.length > 1;
  const isBPC = item.isBlueprintCopy;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const itemImageUrl = `https://images.evetech.net/types/${item.typeId}/icon?size=32`;

  return (
    <>
      <tr
        className={`border-b border-slate-700/50 hover:bg-slate-800/30 ${isBPC ? "bg-amber-500/5" : ""}`}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <img
              src={itemImageUrl}
              alt=""
              className="w-8 h-8 rounded"
              loading="lazy"
            />
            <div className="flex items-center gap-2 min-w-0">
              {hasMultipleOrders && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                >
                  {expanded ? "▼" : "▶"}
                </button>
              )}
              <span className={`truncate ${isBPC ? "text-amber-400" : "text-white"}`}>
                {item.name}
                {isBPC && (
                  <span className="ml-2 text-xs bg-amber-500/20 px-1.5 py-0.5 rounded">
                    BPC
                  </span>
                )}
              </span>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1 text-slate-500 hover:text-white transition-colors"
                title="Copier l'item"
              >
                {copied ? (
                  <span className="text-green-400 text-xs">✓</span>
                ) : (
                  <CopyIcon className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-right text-slate-300 border-l border-slate-700/30">
          {item.quantity.toLocaleString()}
        </td>
        <td
          className="py-3 px-4 text-right text-slate-300 border-l border-slate-700/30"
          style={{ borderLeftWidth: 2, borderColor: `${theme.primary}30` }}
        >
          {isBPC ? (
            <span className="text-amber-400 text-sm">N/A</span>
          ) : (
            formatIsk(item.unitBuyPrice)
          )}
        </td>
        <td className="py-3 px-4 text-right text-slate-300">
          {isBPC ? (
            <span className="text-amber-400 text-sm">-</span>
          ) : (
            item.buyOrders[0]?.volumeRemain.toLocaleString() || "-"
          )}
        </td>
        <td className="py-3 px-4 text-right text-slate-300">
          {isBPC ? (
            <span className="text-amber-400 text-sm">-</span>
          ) : (
            formatIsk(item.totalValue)
          )}
        </td>
      </tr>
      {expanded &&
        !isBPC &&
        item.buyOrders.slice(1).map((order, idx) => (
          <tr
            key={order.orderId}
            className="bg-slate-800/20 border-b border-slate-700/30"
          >
            <td className="py-2 px-4 pl-16 text-slate-500 text-sm" colSpan={2}>
              Ordre #{idx + 2}
            </td>
            <td
              className="py-2 px-4 text-right text-slate-400 text-sm border-l border-slate-700/30"
              style={{ borderLeftWidth: 2, borderColor: `${theme.primary}30` }}
            >
              {formatIsk(order.price)}
            </td>
            <td className="py-2 px-4 text-right text-slate-400 text-sm">
              {order.volumeRemain.toLocaleString()}
            </td>
            <td className="py-2 px-4 text-right text-slate-500 text-sm">-</td>
          </tr>
        ))}
    </>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-slate-500 hover:text-white transition-colors"
      title={`Copier ${label}`}
    >
      {copied ? (
        <span className="text-green-400 text-xs">✓</span>
      ) : (
        <CopyIcon className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export function DetailsModal({
  opportunity,
  theme,
  region,
  onClose,
}: DetailsModalProps) {
  const [janiceLoading, setJaniceLoading] = useState(false);
  const [janiceUrl, setJaniceUrl] = useState<string | null>(null);
  const [janiceError, setJaniceError] = useState<string | null>(null);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [destinationSet, setDestinationSet] = useState(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  const expirationDate = new Date(opportunity.dateExpired);
  const now = new Date();
  const hoursRemaining = Math.max(
    0,
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  const handleJaniceCheck = async () => {
    setJaniceLoading(true);
    setJaniceError(null);

    try {
      const sellableItems = opportunity.items
        .filter((item) => !item.isBlueprintCopy)
        .map((item) => ({ name: item.name, quantity: item.quantity }));

      if (sellableItems.length === 0) {
        setJaniceError("Aucun item vendable");
        return;
      }

      const response = await fetch("/api/janice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: sellableItems, region }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur Janice");
      }

      setJaniceUrl(data.url);
      window.open(data.url, "_blank");
    } catch (err) {
      setJaniceError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setJaniceLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl border"
        style={{
          backgroundColor: theme.background,
          borderColor: `${theme.primary}40`,
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: `${theme.primary}30` }}
        >
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">
                Contrat #{opportunity.contractId}
              </h2>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">
                {opportunity.issuerName || `Pilote #${opportunity.issuerId}`}
              </span>
              {opportunity.hasBlueprintCopy && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full flex items-center gap-1">
                  ⚠️ Contient BPC
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Expire dans {hoursRemaining.toFixed(0)}h •{" "}
              {formatVolume(opportunity.totalVolume)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div
          className="px-6 py-3 border-b flex flex-wrap items-center gap-4 text-sm"
          style={{
            borderColor: `${theme.primary}20`,
            backgroundColor: `${theme.primary}05`,
          }}
        >
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Station:</span>
            <span className="text-white font-medium">
              {opportunity.locationName || `ID ${opportunity.locationId}`}
            </span>
            {opportunity.locationName && (
              <CopyButton text={opportunity.locationName} label="la station" />
            )}
          </div>
          {opportunity.systemName && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Système:</span>
              <span className="text-slate-300">{opportunity.systemName}</span>
              <CopyButton text={opportunity.systemName} label="le système" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Jumps:</span>
            <span
              className={`font-medium ${
                opportunity.jumpsToSell === 0
                  ? "text-green-400"
                  : opportunity.jumpsToSell !== undefined &&
                      opportunity.jumpsToSell <= 5
                    ? "text-yellow-400"
                    : "text-slate-300"
              }`}
            >
              {opportunity.jumpsToSell !== undefined &&
              opportunity.jumpsToSell >= 0
                ? opportunity.jumpsToSell === 0
                  ? "Sur place"
                  : `${opportunity.jumpsToSell}j`
                : "?"}
            </span>
          </div>
          {opportunity.locationId && (
            <button
              onClick={async () => {
                setDestinationLoading(true);
                setDestinationError(null);
                try {
                  const res = await fetch("/api/destination", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      destinationId: opportunity.locationId,
                    }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Erreur");
                  }
                  setDestinationSet(true);
                  setTimeout(() => setDestinationSet(false), 3000);
                } catch (err) {
                  setDestinationError(
                    err instanceof Error ? err.message : "Erreur"
                  );
                } finally {
                  setDestinationLoading(false);
                }
              }}
              disabled={destinationLoading}
              className="ml-auto px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: destinationSet
                  ? "#22c55e20"
                  : `${theme.primary}20`,
                color: destinationSet ? "#22c55e" : theme.primary,
              }}
            >
              {destinationLoading
                ? "..."
                : destinationSet
                  ? "✓ Destination définie"
                  : "📍 Set Destination"}
            </button>
          )}
          {destinationError && (
            <span className="text-red-400 text-xs">{destinationError}</span>
          )}
        </div>

        {opportunity.hasBlueprintCopy && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-400 text-sm">
              <strong>Attention :</strong> Ce contrat contient des Blueprint
              Copies (BPC). Les BPC ne peuvent pas être vendus sur le marché et
              n&apos;ont pas de valeur marchande calculable. Le ROI affiche ne
              prend en compte que les items vendables.
            </p>
          </div>
        )}

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6">
            <h3
              className="text-sm font-medium mb-3"
              style={{ color: theme.accent }}
            >
              Items ({opportunity.items.length})
            </h3>
            <div
              className="overflow-x-auto rounded-lg border"
              style={{ borderColor: `${theme.primary}20` }}
            >
              <table className="w-full">
                <thead>
                  <tr
                    className="text-xs uppercase tracking-wide"
                    style={{ backgroundColor: `${theme.primary}10` }}
                  >
                    <th
                      className="py-3 px-4 text-left"
                      style={{ color: theme.accent }}
                    >
                      Item
                    </th>
                    <th
                      className="py-3 px-4 text-right border-l"
                      style={{
                        color: theme.accent,
                        borderColor: `${theme.primary}30`,
                      }}
                    >
                      Qté Contrat
                    </th>
                    <th
                      className="py-3 px-4 text-right border-l"
                      style={{
                        color: theme.accent,
                        borderLeftWidth: 2,
                        borderColor: `${theme.primary}50`,
                      }}
                    >
                      Prix Achat
                    </th>
                    <th
                      className="py-3 px-4 text-right"
                      style={{ color: theme.accent }}
                    >
                      Qté Dispo
                    </th>
                    <th
                      className="py-3 px-4 text-right"
                      style={{ color: theme.accent }}
                    >
                      Valeur
                    </th>
                  </tr>
                  <tr
                    className="text-[10px] uppercase tracking-wider text-slate-500 border-b"
                    style={{ borderColor: `${theme.primary}20` }}
                  >
                    <th className="pb-2 px-4 text-left font-normal">—</th>
                    <th
                      className="pb-2 px-4 text-right font-normal border-l"
                      style={{ borderColor: `${theme.primary}30` }}
                    >
                      CONTRAT
                    </th>
                    <th
                      className="pb-2 px-4 text-right font-normal border-l"
                      style={{
                        borderLeftWidth: 2,
                        borderColor: `${theme.primary}50`,
                      }}
                      colSpan={3}
                    >
                      ORDRES D&apos;ACHAT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {opportunity.items.map((item) => (
                    <ItemRow key={item.typeId} item={item} theme={theme} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="px-6 py-4 border-t"
            style={{ borderColor: `${theme.primary}20` }}
          >
            <h3
              className="text-sm font-medium mb-3"
              style={{ color: theme.accent }}
            >
              Breakdown Financier
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: `${theme.primary}10` }}
              >
                <p className="text-xs text-slate-400 mb-1">Prix Contrat</p>
                <p className="text-lg font-bold text-white">
                  {formatIsk(opportunity.contractPrice)} ISK
                </p>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: `${theme.primary}10` }}
              >
                <p className="text-xs text-slate-400 mb-1">Valeur Marché</p>
                <p className="text-lg font-bold text-white">
                  {formatIsk(opportunity.totalSellValue)} ISK
                </p>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: `${theme.primary}10` }}
              >
                <p className="text-xs text-slate-400 mb-1">Marge Brute</p>
                <p className="text-lg font-bold text-green-400">
                  +{formatIsk(opportunity.grossMargin)} ISK
                </p>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: `${theme.primary}10` }}
              >
                <p className="text-xs text-slate-400 mb-1">
                  Taxes (
                  {(
                    (opportunity.totalTaxes / opportunity.totalSellValue) *
                    100
                  ).toFixed(1)}
                  %)
                </p>
                <p className="text-lg font-bold text-red-400">
                  -{formatIsk(opportunity.totalTaxes)} ISK
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-4 text-sm text-slate-400">
              <span>Sales Tax: {formatIsk(opportunity.salesTax)}</span>
              <span>Broker Fee: {formatIsk(opportunity.brokerFee)}</span>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: `${theme.primary}30` }}
        >
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-400">Profit Net</p>
              <p className="text-2xl font-bold text-green-400">
                +{formatIsk(opportunity.netProfit)} ISK
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">ROI</p>
              <p
                className="text-2xl font-bold"
                style={{
                  color:
                    opportunity.roi > 20
                      ? "#4ade80"
                      : opportunity.roi > 10
                        ? "#facc15"
                        : theme.primary,
                }}
              >
                {opportunity.roi.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {janiceError && (
              <span className="text-red-400 text-sm">{janiceError}</span>
            )}
            {janiceUrl && !janiceLoading && (
              <a
                href={janiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline hover:no-underline"
                style={{ color: theme.accent }}
              >
                Ouvrir Janice
              </a>
            )}
            <button
              onClick={handleJaniceCheck}
              disabled={janiceLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: `${theme.primary}20`,
                color: theme.primary,
              }}
            >
              {janiceLoading
                ? "Création..."
                : janiceUrl
                  ? "Recréer Appraisal"
                  : "Vérifier avec Janice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

