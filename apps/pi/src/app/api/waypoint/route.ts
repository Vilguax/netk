import { NextRequest, NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { esi } from "@netk/eve-api";

const REQUIRED_SCOPE = "esi-ui.write_waypoint.v1";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { characterId, systemId } = await req.json();

  if (!characterId || !systemId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const characters = await getUserCharacters(session.user.id);
  const character = characters.find(
    (c) => c.characterId.toString() === characterId.toString()
  );

  if (!character) {
    return NextResponse.json({ error: "Personnage non trouvé" }, { status: 404 });
  }

  if (!character.scopes.includes(REQUIRED_SCOPE)) {
    return NextResponse.json(
      { error: `Scope manquant : ${REQUIRED_SCOPE}` },
      { status: 403 }
    );
  }

  const accessToken = await getCharacterAccessToken(character.characterId);

  if (!accessToken) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  await esi.setWaypoint(systemId, accessToken, true);

  return NextResponse.json({ ok: true });
}
