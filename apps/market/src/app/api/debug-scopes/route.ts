import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getUserCharacters } from "@netk/auth/eve";

/**
 * GET /api/debug-scopes
 * Debug: shows scopes for each linked character.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const characters = await getUserCharacters(session.user.id);

    return NextResponse.json({
      characters: characters.map((c) => ({
        characterId: c.characterId.toString(),
        characterName: c.characterName,
        scopes: c.scopes,
        tokenExpires: c.tokenExpires,
        hasMarketScope: c.scopes.includes("esi-markets.read_character_orders.v1"),
        hasWalletScope: c.scopes.includes("esi-wallet.read_character_wallet.v1"),
      })),
    });
  } catch (error) {
    console.error("[Debug] Error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
