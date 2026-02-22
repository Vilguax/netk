import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getUserCharacters } from "@netk/auth/eve";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const characters = await getUserCharacters(session.user.id);

    // Transform for JSON serialization (BigInt -> string)
    const serialized = characters.map((char) => ({
      id: char.id,
      characterId: char.characterId.toString(),
      characterName: char.characterName,
      corporationId: char.corporationId.toString(),
      isMain: char.isMain,
      scopes: char.scopes,
    }));

    return NextResponse.json({ characters: serialized });
  } catch (error) {
    console.error("Get characters error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}

