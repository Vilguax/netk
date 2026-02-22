import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { REGIONS } from "@netk/types";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

const JANICE_API_URL = "https://janice.e-351.com/api/rest/v2/appraisal";

interface JaniceItem {
  name: string;
  quantity: number;
}

interface JaniceRequestBody {
  items: JaniceItem[];
  region?: string;
}

interface JaniceResponse {
  code: string;
  effectivePrices: {
    totalBuyPrice: number;
    totalSplitPrice: number;
    totalSellPrice: number;
  };
  items: Array<{
    itemType: { name: string };
    amount: number;
    effectivePrices: {
      buyPrice: number;
      sellPrice: number;
    };
  }>;
}

export async function POST(request: Request) {
  const csrfError = ensureCsrf(request);
  if (csrfError) return csrfError;

  const bodyTooLarge = enforceMaxBodySize(request, 256 * 1024);
  if (bodyTooLarge) return bodyTooLarge;

  const rateLimitError = await enforceRateLimit(request, {
    bucket: "flipper:janice",
    limit: 20,
    windowSeconds: 60,
  });
  if (rateLimitError) return rateLimitError;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const JANICE_API_KEY = process.env.JANICE_API_KEY;

    if (!JANICE_API_KEY) {
      console.error("JANICE_API_KEY not configured");
      return NextResponse.json({ error: "Service not configured" }, { status: 503 });
    }

    const body: JaniceRequestBody = await request.json();
    const items = body?.items;
    const region = body?.region;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    if (items.length > 500) {
      return NextResponse.json({ error: "Too many items (max 500)" }, { status: 400 });
    }

    for (const item of items) {
      if (
        typeof item?.name !== "string" ||
        item.name.length === 0 ||
        item.name.length > 200 ||
        typeof item?.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 1_000_000_000
      ) {
        return NextResponse.json({ error: "Invalid item format" }, { status: 400 });
      }
    }

    const regionData = region && typeof region === "string" ? REGIONS[region] : null;
    const marketId = regionData?.janiceMarketId ?? 2;

    const itemsText = items
      .filter((item) => !item.name.toLowerCase().includes("blueprint copy"))
      .map((item) => `${item.name} x ${item.quantity}`)
      .join("\n");

    if (!itemsText) {
      return NextResponse.json({ error: "No sellable items" }, { status: 400 });
    }

    const response = await fetch(
      `${JANICE_API_URL}?market=${marketId}&designation=appraisal&pricing=split&pricingVariant=immediate&persist=true&compactize=true&pricePercentage=1`,
      {
        method: "POST",
        headers: {
          "X-ApiKey": JANICE_API_KEY,
          "Content-Type": "text/plain",
          Accept: "application/json",
        },
        body: itemsText,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Janice API error", details: errorText },
        { status: response.status }
      );
    }

    const data = (await response.json()) as JaniceResponse;

    return NextResponse.json({
      code: data.code,
      url: `https://janice.e-351.com/a/${data.code}`,
      prices: data.effectivePrices,
      itemCount: data.items?.length || 0,
      market: regionData?.hub ?? "Jita",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create appraisal", details: String(err) },
      { status: 500 }
    );
  }
}
