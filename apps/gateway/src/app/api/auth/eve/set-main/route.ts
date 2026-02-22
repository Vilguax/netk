import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { setMainCharacter } from "@netk/auth/eve";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

export async function POST(request: Request) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 4 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:auth:eve:set-main",
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

    await setMainCharacter(session.user.id, BigInt(characterId));

    return NextResponse.json({
      success: true,
      message: "Personnage principal défini avec succès",
    });
  } catch (error) {
    console.error("Set main character error:", error);

    if (error instanceof Error && error.message.includes("non trouvé")) {
      return NextResponse.json({ error: "Personnage non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
