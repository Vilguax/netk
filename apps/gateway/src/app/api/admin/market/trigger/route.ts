import { NextRequest, NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { prisma } from "@netk/database";
import { redis, isRedisAvailable } from "@netk/database/redis";
import { ensureCsrf, enforceMaxBodySize, enforceRateLimit } from "@netk/auth/security";

const REDIS_CHANNEL = "netk:market-fetcher:command";

const VALID_REGIONS = [
  "the-forge",
  "domain",
  "heimatar",
  "sinq-laison",
  "metropolis",
] as const;

type ValidRegion = (typeof VALID_REGIONS)[number];

export async function POST(request: NextRequest) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 8 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:admin:market-trigger",
      limit: 20,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "Accès refusé - Administrateur requis" },
        { status: 403 }
      );
    }

    const serviceAccount = await prisma.eveCharacter.findFirst({
      where: {
        isServiceAccount: true,
        userId: session.user.id,
      },
    });

    if (!serviceAccount) {
      const anyServiceAccount = await prisma.eveCharacter.findFirst({
        where: { isServiceAccount: true },
      });

      if (anyServiceAccount) {
        return NextResponse.json(
          { error: "Le service account ne vous appartient pas" },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Aucun service account configuré. Configurez-en un via /api/admin/service-account" },
        { status: 400 }
      );
    }

    if (serviceAccount.tokenExpires < new Date()) {
      return NextResponse.json(
        { error: `Token du service account expiré. Reconnectez ${serviceAccount.characterName} via EVE SSO.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, region, force } = body;

    if (!["fetch-all", "fetch-region", "backfill-history", "cleanup"].includes(type)) {
      return NextResponse.json(
        { error: "Type de commande invalide. Utilisez: fetch-all, fetch-region, backfill-history, ou cleanup" },
        { status: 400 }
      );
    }

    if (type === "fetch-region") {
      if (!region) {
        return NextResponse.json({ error: "Région requise pour fetch-region" }, { status: 400 });
      }

      if (!VALID_REGIONS.includes(region as ValidRegion)) {
        return NextResponse.json(
          { error: `Région invalide. Régions valides: ${VALID_REGIONS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Redis non disponible - impossible d'envoyer la commande au market fetcher" },
        { status: 503 }
      );
    }

    const command = {
      type,
      region: type === "fetch-region" ? region : undefined,
      force: !!force,
      triggeredBy: session.user.id,
      triggeredAt: new Date().toISOString(),
      serviceAccount: {
        characterId: serviceAccount.characterId.toString(),
        characterName: serviceAccount.characterName,
      },
    };

    await redis.publish(REDIS_CHANNEL, JSON.stringify(command));

    console.log(`[Admin] Market fetch triggered by ${serviceAccount.characterName}:`, command);

    return NextResponse.json({
      success: true,
      message:
        type === "fetch-all"
          ? "Récupération de toutes les régions lancée"
          : type === "fetch-region"
            ? `Récupération de ${region} lancée`
            : type === "backfill-history"
              ? "Backfill historique 1 an lancé"
              : "Nettoyage lancé",
      command,
    });
  } catch (error) {
    console.error("[Admin] Market trigger error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
