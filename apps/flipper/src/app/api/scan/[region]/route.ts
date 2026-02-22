import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { esi } from "@netk/eve-api";
import { REGIONS } from "@netk/types";
import type { DetailedItem, DetailedOpportunity, ScanResultItem } from "@netk/types";
import { calculateMargin, DEFAULT_TAX_SETTINGS } from "@netk/calculations";
import { enforceRateLimit } from "@netk/auth/security";

interface RouteContext {
  params: Promise<{ region: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const rateLimitError = await enforceRateLimit(request, {
    bucket: "flipper:scan",
    limit: 8,
    windowSeconds: 60,
  });
  if (rateLimitError) return rateLimitError;

  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { region } = await context.params;
  const regionData = REGIONS[region];

  if (!regionData) {
    return NextResponse.json({ error: "Region inconnue" }, { status: 404 });
  }

  const url = new URL(request.url);
  const scopeType = url.searchParams.get("scopeType") || "region";
  const scopeIdParam = url.searchParams.get("scopeId");

  // Validate scopeType
  const validScopeTypes = ["region", "station", "system", "constellation"];
  if (!validScopeTypes.includes(scopeType)) {
    return NextResponse.json({ error: "Type de scope invalide" }, { status: 400 });
  }

  // Validate scopeId is a valid positive integer if provided
  let scopeId: string | null = null;
  if (scopeIdParam) {
    const parsed = parseInt(scopeIdParam, 10);
    if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      return NextResponse.json({ error: "ID de scope invalide" }, { status: 400 });
    }
    scopeId = scopeIdParam;
  }

  const debug = {
    totalContracts: 0,
    itemExchangeContracts: 0,
    processedContracts: 0,
    contractsWithItems: 0,
    contractsWithBuyOrders: 0,
    profitableContracts: 0,
    errors: [] as string[],
  };

  try {
    const contracts = await esi.getPublicContracts(regionData.id);
    debug.totalContracts = contracts.length;
    debug.itemExchangeContracts = contracts.length;

    let filteredContracts = contracts;
    if (scopeType === "station" && scopeId) {
      const stationId = parseInt(scopeId);
      filteredContracts = contracts.filter(
        (c) =>
          c.start_location_id === stationId || c.end_location_id === stationId
      );
    } else if (scopeType === "system" && scopeId) {
      const systemId = parseInt(scopeId);
      try {
        const systemInfo = await esi.getSystem(systemId);
        const systemStations =
          (systemInfo as { stations?: number[] }).stations || [];
        if (systemStations.length > 0) {
          filteredContracts = contracts.filter(
            (c) =>
              systemStations.includes(c.start_location_id) ||
              systemStations.includes(c.end_location_id)
          );
        }
      } catch {
        debug.errors.push(`Failed to load system ${scopeId}`);
      }
    } else if (scopeType === "constellation" && scopeId) {
      const constellationId = parseInt(scopeId);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const constellationInfo = await fetch(
          `https://esi.evetech.net/latest/universe/constellations/${constellationId}/?datasource=tranquility`,
          { signal: controller.signal }
        ).then((r) => r.json());
        clearTimeout(timeoutId);

        const allStations: number[] = [];
        const systemsToScan = Array.isArray(constellationInfo.systems)
          ? constellationInfo.systems.slice(0, 50)
          : [];
        for (const systemId of systemsToScan) {
          try {
            const systemInfo = await esi.getSystem(systemId);
            const systemStations =
              (systemInfo as { stations?: number[] }).stations || [];
            allStations.push(...systemStations);
          } catch {
            // Skip systems that fail
          }
        }

        if (allStations.length > 0) {
          filteredContracts = contracts.filter(
            (c) =>
              allStations.includes(c.start_location_id) ||
              allStations.includes(c.end_location_id)
          );
        }
      } catch {
        debug.errors.push(`Failed to load constellation ${scopeId}`);
      }
    }

    const contractsToProcess = filteredContracts.slice(0, 100);
    debug.processedContracts = contractsToProcess.length;

    const opportunities: ScanResultItem[] = [];

    const batchSize = 5;
    for (let i = 0; i < contractsToProcess.length; i += batchSize) {
      const batch = contractsToProcess.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (contract) => {
          try {
            if (contract.price <= 0) return null;

            const items = await esi.getContractItems(contract.contract_id);
            if (items.length === 0) return null;

            const includedItems = items.filter((i) => i.is_included);
            if (includedItems.length === 0) return null;

            debug.contractsWithItems++;

            const detailedItems: DetailedItem[] = [];
            let totalSellValue = 0;
            let totalVolume = 0;
            let hasAllPrices = true;
            let hasBlueprintCopy = false;

            for (const item of items) {
              if (!item.is_included) continue;

              const isBPC = item.is_blueprint_copy === true;
              if (isBPC) {
                hasBlueprintCopy = true;
              }

              try {
                const typeInfo = await esi.getTypeInfo(item.type_id);

                if (isBPC) {
                  const itemVolume =
                    (typeInfo.packaged_volume || typeInfo.volume) *
                    item.quantity;
                  totalVolume += itemVolume;

                  detailedItems.push({
                    typeId: item.type_id,
                    name: typeInfo.name,
                    quantity: item.quantity,
                    volume: typeInfo.packaged_volume || typeInfo.volume,
                    unitBuyPrice: 0,
                    totalValue: 0,
                    buyOrders: [],
                    isBlueprintCopy: true,
                  });
                  continue;
                }

                const topOrders = await esi.getTopBuyOrders(
                  regionData.id,
                  item.type_id,
                  5
                );

                if (topOrders.length === 0) {
                  hasAllPrices = false;
                  break;
                }

                const bestPrice = topOrders[0].price;
                const itemTotalValue = bestPrice * item.quantity;
                const itemVolume =
                  (typeInfo.packaged_volume || typeInfo.volume) * item.quantity;

                totalSellValue += itemTotalValue;
                totalVolume += itemVolume;

                detailedItems.push({
                  typeId: item.type_id,
                  name: typeInfo.name,
                  quantity: item.quantity,
                  volume: typeInfo.packaged_volume || typeInfo.volume,
                  unitBuyPrice: bestPrice,
                  totalValue: itemTotalValue,
                  buyOrders: topOrders,
                  isBlueprintCopy: false,
                });
              } catch {
                hasAllPrices = false;
                break;
              }
            }

            if (!hasAllPrices || totalSellValue <= 0) return null;

            debug.contractsWithBuyOrders++;

            const margin = calculateMargin(contract.price, totalSellValue);

            if (!margin.isProfitable || margin.roi <= 0) return null;

            debug.profitableContracts++;

            let locationName: string | undefined;
            let systemId: number | undefined;
            let systemName: string | undefined;
            let jumpsToSell: number | undefined;
            let issuerName: string | undefined;

            try {
              const [locationInfo, charName] = await Promise.all([
                esi.getLocationInfo(contract.start_location_id),
                esi.getCharacterName(contract.issuer_id),
              ]);

              locationName = locationInfo.name;
              systemId = locationInfo.systemId ?? undefined;
              systemName = locationInfo.systemName ?? undefined;
              issuerName = charName;

              if (systemId) {
                const hubStation = await esi.getStation(regionData.hubStationId);
                const hubSystemId = hubStation.system_id;
                jumpsToSell = await esi.getRouteJumps(systemId, hubSystemId);
              }
            } catch {
              // Location info failed, continue without it
            }

            const details: DetailedOpportunity = {
              contractId: contract.contract_id,
              issuerId: contract.issuer_id,
              issuerName,
              locationId: contract.start_location_id,
              locationName,
              systemId,
              systemName,
              dateExpired: contract.date_expired,
              items: detailedItems,
              contractPrice: contract.price,
              totalSellValue,
              grossMargin: margin.grossMargin,
              salesTax: totalSellValue * DEFAULT_TAX_SETTINGS.salesTax,
              brokerFee: totalSellValue * DEFAULT_TAX_SETTINGS.brokerFee,
              totalTaxes: margin.taxes,
              netProfit: margin.netMargin,
              roi: margin.roi,
              totalVolume,
              hasBlueprintCopy,
              jumpsToSell,
            };

            const itemName =
              detailedItems.length === 1
                ? detailedItems[0].name
                : `${detailedItems.length} items`;

            return {
              contractId: contract.contract_id,
              itemName,
              itemCount: detailedItems.length,
              contractPrice: contract.price,
              sellPrice: totalSellValue,
              netProfit: margin.netMargin,
              roi: margin.roi,
              jumpsToSell,
              details,
            } as ScanResultItem;
          } catch (err) {
            debug.errors.push(`Contract ${contract.contract_id}: ${err}`);
            return null;
          }
        })
      );

      opportunities.push(
        ...batchResults.filter((r): r is ScanResultItem => r !== null)
      );
    }

    opportunities.sort((a, b) => b.roi - a.roi);

    return NextResponse.json({
      opportunities: opportunities.slice(0, 50),
      scannedCount: contractsToProcess.length,
      regionName: regionData.name,
      debug,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Erreur lors du scan des contrats",
        details: String(err),
        debug,
      },
      { status: 500 }
    );
  }
}
