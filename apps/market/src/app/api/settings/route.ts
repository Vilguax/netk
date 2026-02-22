import { NextRequest, NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { prisma } from "@netk/database";
import { REGIONS } from "@netk/types";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

interface MarketSettings {
  salesTax: number;
  brokerFee: number;
  defaultRegion: string;
}

const DEFAULT_SETTINGS: MarketSettings = {
  salesTax: 3.6,
  brokerFee: 3.0,
  defaultRegion: "10000002",
};

const ALLOWED_REGION_IDS = new Set(
  Object.values(REGIONS).map((region) => String(region.id))
);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    const settings = prefs?.settings as Record<string, unknown> | null;
    const marketSettings: MarketSettings = {
      salesTax: (settings?.marketSalesTax as number) ?? DEFAULT_SETTINGS.salesTax,
      brokerFee: (settings?.marketBrokerFee as number) ?? DEFAULT_SETTINGS.brokerFee,
      defaultRegion: (settings?.marketDefaultRegion as string) ?? DEFAULT_SETTINGS.defaultRegion,
    };

    return NextResponse.json(marketSettings);
  } catch (error) {
    console.error("[Settings] Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 8 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "market:settings",
      limit: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { salesTax, brokerFee, defaultRegion } = body;

    if (
      salesTax !== undefined &&
      (typeof salesTax !== "number" || salesTax < 0 || salesTax > 20)
    ) {
      return NextResponse.json({ error: "Taxe de vente invalide (0-20%)" }, { status: 400 });
    }

    if (
      brokerFee !== undefined &&
      (typeof brokerFee !== "number" || brokerFee < 0 || brokerFee > 20)
    ) {
      return NextResponse.json({ error: "Broker fee invalide (0-20%)" }, { status: 400 });
    }

    if (
      defaultRegion !== undefined &&
      (typeof defaultRegion !== "string" || !ALLOWED_REGION_IDS.has(defaultRegion))
    ) {
      return NextResponse.json({ error: "Région par défaut invalide" }, { status: 400 });
    }

    const existing = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    const currentSettings = (existing?.settings as Record<string, unknown>) || {};

    const updatedSettings = {
      ...currentSettings,
      ...(salesTax !== undefined && { marketSalesTax: salesTax }),
      ...(brokerFee !== undefined && { marketBrokerFee: brokerFee }),
      ...(defaultRegion !== undefined && { marketDefaultRegion: defaultRegion }),
    };

    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: { settings: updatedSettings },
      create: {
        userId: session.user.id,
        settings: updatedSettings,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Settings] Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
