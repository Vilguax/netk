import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { prisma } from "@netk/database";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

export async function POST(request: Request) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 4 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:auth:eve:set-active",
      limit: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json(
        { error: "ID du personnage manquant" },
        { status: 400 }
      );
    }

    const character = await prisma.eveCharacter.findFirst({
      where: {
        userId: session.user.id,
        characterId: BigInt(characterId),
      },
    });

    if (!character) {
      return NextResponse.json({ error: "Personnage non trouvé" }, { status: 404 });
    }

    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        settings: {
          activeCharacterId: characterId,
        },
      },
      update: {
        settings: {
          activeCharacterId: characterId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      activeCharacterId: characterId,
      activeCharacterName: character.characterName,
    });
  } catch (error) {
    console.error("Set active character error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
