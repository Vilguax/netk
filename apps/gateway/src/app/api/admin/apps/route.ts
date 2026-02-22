import { NextRequest, NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { prisma } from "@netk/database";
import { redis, isRedisAvailable } from "@netk/database/redis";
import { ensureCsrf, enforceMaxBodySize, enforceRateLimit } from "@netk/auth/security";

const APPS = [
  { id: "gateway", name: "Gateway", port: 3000, url: process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000" },
  { id: "flipper", name: "Flipper", port: 3001, url: process.env.NEXT_PUBLIC_FLIPPER_URL || "http://localhost:3001" },
  { id: "ratting", name: "Ratting", port: 3002, url: process.env.NEXT_PUBLIC_RATTING_URL || "http://localhost:3002" },
  { id: "rock-radar", name: "Rock Radar", port: 3003, url: process.env.NEXT_PUBLIC_ROCK_RADAR_URL || "http://localhost:3003" },
  { id: "appraisal", name: "Appraisal", port: 3004, url: process.env.NEXT_PUBLIC_APPRAISAL_URL || "http://localhost:3004" },
  { id: "fleet", name: "Fleet Manager", port: 3005, url: process.env.NEXT_PUBLIC_FLEET_URL || "http://localhost:3005" },
  { id: "market", name: "Market", port: 3006, url: process.env.NEXT_PUBLIC_MARKET_URL || "http://localhost:3006" },
] as const;

type AppStatus = "online" | "maintenance" | "offline";

const REDIS_KEY_PREFIX = "netk:app:status:";

async function safeRedisGet(key: string): Promise<string | null> {
  if (!(await isRedisAvailable())) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function safeRedisSet(key: string, value: string): Promise<boolean> {
  if (!(await isRedisAvailable())) return false;
  try {
    await redis.set(key, value);
    return true;
  } catch {
    return false;
  }
}

async function safeRedisDel(key: string): Promise<boolean> {
  if (!(await isRedisAvailable())) return false;
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}

async function verifyServiceAccountOwner(userId: string): Promise<boolean> {
  const serviceAccount = await prisma.eveCharacter.findFirst({
    where: {
      isServiceAccount: true,
      userId,
    },
  });
  return !!serviceAccount;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const isOwner = await verifyServiceAccountOwner(session.user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const redisAvailable = await isRedisAvailable();

    const appsStatus = await Promise.all(
      APPS.map(async (app) => {
        const configuredStatus = (await safeRedisGet(`${REDIS_KEY_PREFIX}${app.id}`)) as AppStatus | null;

        if (configuredStatus === "maintenance") {
          return {
            ...app,
            configuredStatus: "maintenance" as AppStatus,
            liveStatus: "maintenance" as AppStatus,
            isHealthy: true,
          };
        }

        let liveStatus: AppStatus = "offline";
        let isHealthy = false;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(`${app.url}/api/health`, {
            signal: controller.signal,
            cache: "no-store",
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            liveStatus = data.status === "maintenance" ? "maintenance" : "online";
            isHealthy = true;
          }
        } catch {
          liveStatus = "offline";
          isHealthy = false;
        }

        return {
          ...app,
          configuredStatus: configuredStatus || "online",
          liveStatus,
          isHealthy,
        };
      })
    );

    return NextResponse.json({
      apps: appsStatus,
      redisAvailable,
      warning: redisAvailable ? undefined : "Redis non disponible - le mode maintenance est désactivé",
    });
  } catch (error) {
    console.error("[Admin] Get apps error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 4 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:admin:apps:patch",
      limit: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const isOwner = await verifyServiceAccountOwner(session.user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { appId, status } = body;

    const app = APPS.find((a) => a.id === appId);
    if (!app) {
      return NextResponse.json(
        { error: `App invalide. Apps valides: ${APPS.map((a) => a.id).join(", ")}` },
        { status: 400 }
      );
    }

    if (!["online", "maintenance"].includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide. Utilisez: online, maintenance" },
        { status: 400 }
      );
    }

    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      return NextResponse.json(
        { error: "Redis non disponible - impossible de changer le statut" },
        { status: 503 }
      );
    }

    if (status === "online") {
      await safeRedisDel(`${REDIS_KEY_PREFIX}${appId}`);
    } else {
      await safeRedisSet(`${REDIS_KEY_PREFIX}${appId}`, status);
    }

    console.log(`[Admin] App ${appId} status changed to ${status} by ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: `${app.name} est maintenant en ${status === "online" ? "ligne" : "maintenance"}`,
      app: { id: appId, status },
    });
  } catch (error) {
    console.error("[Admin] Update app error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
