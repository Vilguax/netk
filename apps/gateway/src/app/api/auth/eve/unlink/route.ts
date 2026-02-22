import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { unlinkEveCharacter } from "@netk/auth/eve";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

export async function POST(request: Request) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 4 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:auth:eve:unlink",
      limit: 20,
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

    await unlinkEveCharacter(session.user.id, BigInt(characterId));

    return NextResponse.json({
      success: true,
      message: "Personnage dissocié avec succès",
    });
  } catch (error) {
    console.error("EVE unlink error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
