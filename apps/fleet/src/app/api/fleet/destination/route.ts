import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { prisma } from "@netk/database";
import { esi } from "@netk/eve-api";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

export async function POST(request: Request) {
  const csrfError = ensureCsrf(request);
  if (csrfError) return csrfError;

  const bodyTooLarge = enforceMaxBodySize(request, 32 * 1024);
  if (bodyTooLarge) return bodyTooLarge;

  const rateLimitError = await enforceRateLimit(request, {
    bucket: "fleet:destination",
    limit: 20,
    windowSeconds: 60,
  });
  if (rateLimitError) return rateLimitError;

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { destinationId, characterIds, fleetId, clearOther = true } = body;

    if (
      !destinationId ||
      typeof destinationId !== "number" ||
      !Number.isInteger(destinationId) ||
      destinationId <= 0
    ) {
      return NextResponse.json({ error: "destinationId invalide" }, { status: 400 });
    }

    if (characterIds && Array.isArray(characterIds) && characterIds.length > 0) {
      if (characterIds.length > 200) {
        return NextResponse.json({ error: "Trop de personnages (max 200)" }, { status: 400 });
      }
      const results = await setDestinationForCharacters(
        characterIds.map(Number),
        destinationId,
        clearOther
      );
      return NextResponse.json(results);
    }

    if (!fleetId) {
      return NextResponse.json({ error: "fleetId requis pour destination fleet" }, { status: 400 });
    }

    const userCharacters = await getUserCharacters(session.user.id);
    let userInFleet = false;

    for (const char of userCharacters) {
      const token = await getCharacterAccessToken(char.characterId);
      if (!token) continue;

      const fleetInfo = await esi.getCharacterFleet(Number(char.characterId), token);
      if (fleetInfo && fleetInfo.fleet_id === fleetId) {
        userInFleet = true;
        break;
      }
    }

    if (!userInFleet) {
      return NextResponse.json({ error: "Vous n'êtes pas dans cette fleet" }, { status: 403 });
    }

    const allNetkCharacters = await prisma.eveCharacter.findMany({
      select: { characterId: true, scopes: true },
    });

    const netkCharIdsInFleet: number[] = [];

    const BATCH_SIZE = 20;
    for (let i = 0; i < allNetkCharacters.length; i += BATCH_SIZE) {
      const batch = allNetkCharacters.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (char) => {
          if (!char.scopes.includes("esi-fleets.read_fleet.v1")) return null;

          const token = await getCharacterAccessToken(char.characterId);
          if (!token) return null;

          const info = await esi.getCharacterFleet(Number(char.characterId), token);
          if (!info || info.fleet_id !== fleetId) return null;

          return Number(char.characterId);
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          netkCharIdsInFleet.push(result.value);
        }
      }
    }

    const results = await setDestinationForCharacters(
      netkCharIdsInFleet,
      destinationId,
      clearOther
    );
    return NextResponse.json(results);
  } catch (error) {
    console.error("[Fleet] Destination error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

async function setDestinationForCharacters(
  characterIds: number[],
  destinationId: number,
  clearOther: boolean = true
): Promise<{
  success: boolean;
  count: number;
  errors: Array<{ characterId: number; error: string }>;
}> {
  const errors: Array<{ characterId: number; error: string }> = [];
  let successCount = 0;

  await Promise.all(
    characterIds.map(async (charId) => {
      try {
        const token = await getCharacterAccessToken(BigInt(charId));
        if (!token) {
          errors.push({ characterId: charId, error: "Token indisponible" });
          return;
        }
        await esi.setWaypoint(destinationId, token, clearOther);
        successCount++;
      } catch (err) {
        errors.push({
          characterId: charId,
          error: err instanceof Error ? err.message : "Erreur inconnue",
        });
      }
    })
  );

  return {
    success: errors.length === 0,
    count: successCount,
    errors,
  };
}
