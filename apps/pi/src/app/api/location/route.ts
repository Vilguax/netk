import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { esi } from "@netk/eve-api";

// GET /api/location
// Returns the current solar system of the user's main (or active) character.
// Response: { systemId: number; systemName?: string } | { error: string }
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const characters = await getUserCharacters(session.user.id);
  if (characters.length === 0) {
    return NextResponse.json({ error: "Aucun personnage lié" }, { status: 404 });
  }

  // Prefer the main character, fall back to the first one
  const character = characters.find((c) => c.isMain) ?? characters[0];

  let accessToken: string | null;
  try {
    accessToken = await getCharacterAccessToken(character.characterId);
  } catch {
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
  }

  try {
    const location = await esi.getCharacterLocation(
      Number(character.characterId),
      accessToken
    );
    return NextResponse.json({
      systemId: location.solar_system_id,
      characterId: String(character.characterId),
      characterName: character.characterName,
      characterCount: characters.length,
    });
  } catch {
    return NextResponse.json({ error: "Erreur ESI" }, { status: 502 });
  }
}
