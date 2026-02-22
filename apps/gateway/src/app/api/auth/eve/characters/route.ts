import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getUserCharacters, EVE_DEFAULT_SCOPES } from "@netk/auth/eve";

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const characters = await getUserCharacters(session.user.id);

    // Transform for JSON serialization (BigInt -> string)
    const serialized = characters.map((char) => {
      const missingScopes = EVE_DEFAULT_SCOPES.filter(
        (s) => !char.scopes.includes(s)
      );
      return {
        id: char.id,
        characterId: char.characterId.toString(),
        characterName: char.characterName,
        corporationId: char.corporationId.toString(),
        isMain: char.isMain,
        scopes: char.scopes,
        missingScopes,
        scopesOutdated: missingScopes.length > 0,
        linkedAt: char.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ characters: serialized });
  } catch (error) {
    console.error("Get characters error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
