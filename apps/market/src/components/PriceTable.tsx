"use client";

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

function formatIsk(value: number): string {
  if (value === 0) return "-";
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + " B";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + " M";
  if (value >= 1_000) return (value / 1_000).toFixed(2) + " K";
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function formatVolume(value: number): string {
  if (value === 0) return "-";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value.toLocaleString("fr-FR");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
}

export function PriceTable({ prices }: { prices: RegionPrice[] }) {
  // Sort: Jita first, then alphabetical
  const sorted = [...prices].sort((a, b) => {
    if (a.regionId === "10000002") return -1;
    if (b.regionId === "10000002") return 1;
    return a.regionName.localeCompare(b.regionName);
  });

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}
    >
      <table className="w-full">
        <thead>
          <tr
            className="text-xs font-medium"
            style={{ color: "var(--text-secondary)", background: "rgba(30, 41, 59, 0.5)" }}
          >
            <th className="text-left px-4 py-3">Region</th>
            <th className="text-right px-4 py-3">Sell</th>
            <th className="text-right px-4 py-3">Buy</th>
            <th className="text-right px-4 py-3">Spread</th>
            <th className="text-right px-4 py-3">Sell Vol.</th>
            <th className="text-right px-4 py-3">Buy Vol.</th>
            <th className="text-right px-4 py-3">MAJ</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const spread =
              p.sellPrice > 0 && p.buyPrice > 0
                ? ((p.sellPrice - p.buyPrice) / p.sellPrice) * 100
                : 0;

            return (
              <tr
                key={p.regionId}
                className="border-t hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">{p.hub}</div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {p.regionName}
                  </div>
                </td>
                <td className="text-right px-4 py-3 font-mono text-sm" style={{ color: "var(--accent-green)" }}>
                  {formatIsk(p.sellPrice)}
                </td>
                <td className="text-right px-4 py-3 font-mono text-sm" style={{ color: "var(--accent-blue)" }}>
                  {formatIsk(p.buyPrice)}
                </td>
                <td className="text-right px-4 py-3 font-mono text-sm" style={{ color: "var(--accent-gold)" }}>
                  {spread > 0 ? spread.toFixed(1) + "%" : "-"}
                </td>
                <td className="text-right px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {formatVolume(p.sellVolume)}
                </td>
                <td className="text-right px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {formatVolume(p.buyVolume)}
                </td>
                <td className="text-right px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {timeAgo(p.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
