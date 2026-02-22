import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { esi } from "@netk/eve-api";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

export async function POST(request: Request) {
  const csrfError = ensureCsrf(request);
  if (csrfError) return csrfError;

  const bodyTooLarge = enforceMaxBodySize(request, 8 * 1024);
  if (bodyTooLarge) return bodyTooLarge;

  const rateLimitError = await enforceRateLimit(request, {
    bucket: "fleet:kick",
    limit: 12,
    windowSeconds: 60,
  });
  if (rateLimitError) return rateLimitError;

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fleetId, memberId } = body;

    if (!fleetId || !memberId) {
      return NextResponse.json({ error: "fleetId et memberId requis" }, { status: 400 });
    }

    const userCharacters = await getUserCharacters(session.user.id);
    let commanderToken: string | null = null;

    for (const char of userCharacters) {
      const token = await getCharacterAccessToken(char.characterId);
      if (!token) continue;

      const fleetInfo = await esi.getCharacterFleet(Number(char.characterId), token);
      if (
        fleetInfo &&
        fleetInfo.fleet_id === fleetId &&
        fleetInfo.role === "fleet_commander"
      ) {
        commanderToken = token;
        break;
      }
    }

    if (!commanderToken) {
      return NextResponse.json(
        { error: "Vous devez être fleet commander pour kick" },
        { status: 403 }
      );
    }

    await esi.kickFleetMember(fleetId, memberId, commanderToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Fleet] Kick error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
