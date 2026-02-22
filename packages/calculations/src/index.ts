// Tax and margin calculations for EVE Online trading

export interface TaxSettings {
  salesTax: number; // Default 3.6% (can be reduced with skills)
  brokerFee: number; // Default 3% (can be reduced with skills/standings)
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  salesTax: 0.036,
  brokerFee: 0.03,
};

export interface MarginResult {
  contractPrice: number;
  instantSellPrice: number;
  grossMargin: number;
  taxes: number;
  netMargin: number;
  roi: number;
  isProfitable: boolean;
}

export function calculateMargin(
  contractPrice: number,
  instantSellPrice: number,
  taxSettings: TaxSettings = DEFAULT_TAX_SETTINGS
): MarginResult {
  const grossMargin = instantSellPrice - contractPrice;
  const taxes = instantSellPrice * (taxSettings.salesTax + taxSettings.brokerFee);
  const netMargin = grossMargin - taxes;
  const roi = contractPrice > 0 ? (netMargin / contractPrice) * 100 : 0;

  return {
    contractPrice,
    instantSellPrice,
    grossMargin,
    taxes,
    netMargin,
    roi,
    isProfitable: netMargin > 0,
  };
}

// ISK formatting utilities

export function formatIsk(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M m³`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K m³`;
  }
  return `${value.toFixed(2)} m³`;
}
