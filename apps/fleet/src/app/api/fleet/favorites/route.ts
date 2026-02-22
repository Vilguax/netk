import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { prisma } from "@netk/database";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

type FavoriteEntry = {
  fleetId: number;
  fleetName: string;
};

function isValidFavoriteEntry(value: unknown): value is FavoriteEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.fleetId === "number" &&
    Number.isInteger(entry.fleetId) &&
    entry.fleetId > 0 &&
    typeof entry.fleetName === "string" &&
    entry.fleetName.trim().length > 0 &&
    entry.fleetName.length <= 120
  );
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select: { settings: true },
    });

    const settings = (prefs?.settings as Record<string, unknown>) || {};
    const favorites = Array.isArray(settings.fleetFavorites)
      ? settings.fleetFavorites
      : [];

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("[Fleet] Favorites GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const csrfError = ensureCsrf(request);
  if (csrfError) return csrfError;

  const bodyTooLarge = enforceMaxBodySize(request, 64 * 1024);
  if (bodyTooLarge) return bodyTooLarge;

  const rateLimitError = await enforceRateLimit(request, {
    bucket: "fleet:favorites",
    limit: 40,
    windowSeconds: 60,
  });
  if (rateLimitError) return rateLimitError;

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const favorites = await request.json();

    if (!Array.isArray(favorites)) {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 });
    }

    if (favorites.length > 100) {
      return NextResponse.json(
        { error: "Trop d'entrées favorites (max 100)" },
        { status: 400 }
      );
    }

    for (const entry of favorites) {
      if (!isValidFavoriteEntry(entry)) {
        return NextResponse.json(
          { error: "Entrée favorite invalide" },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select: { settings: true },
    });

    const currentSettings = (existing?.settings as Record<string, unknown>) || {};

    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        settings: { fleetFavorites: favorites },
      },
      update: {
        settings: { ...currentSettings, fleetFavorites: favorites },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Fleet] Favorites POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
