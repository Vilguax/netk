import { NextRequest, NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken } from "@netk/auth/eve";
import { prisma } from "@netk/database";
import { ensureCsrf, enforceMaxBodySize, enforceRateLimit } from "@netk/auth/security";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const serviceAccount = await prisma.eveCharacter.findFirst({
      where: { isServiceAccount: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!serviceAccount) {
      return NextResponse.json({
        configured: false,
        message: "Aucun service account configuré",
      });
    }

    if (serviceAccount.userId !== session.user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const accessToken = await getCharacterAccessToken(serviceAccount.characterId);
    const isTokenValid = accessToken !== null;

    let tokenExpires = serviceAccount.tokenExpires;
    if (isTokenValid) {
      const updated = await prisma.eveCharacter.findUnique({
        where: { characterId: serviceAccount.characterId },
        select: { tokenExpires: true },
      });
      if (updated) tokenExpires = updated.tokenExpires;
    }

    return NextResponse.json({
      configured: true,
      serviceAccount: {
        characterId: serviceAccount.characterId.toString(),
        characterName: serviceAccount.characterName,
        corporationId: serviceAccount.corporationId.toString(),
        scopes: serviceAccount.scopes,
        tokenExpires: tokenExpires.toISOString(),
        isTokenValid,
        needsRelink: !isTokenValid,
        owner: {
          userId: serviceAccount.user.id,
          email: serviceAccount.user.email,
        },
        linkedAt: serviceAccount.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Admin] Get service account error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 4 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:admin:service-account:post",
      limit: 20,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const existingServiceAccount = await prisma.eveCharacter.findFirst({
      where: { isServiceAccount: true },
    });

    const isOwner = existingServiceAccount?.userId === session.user.id;

    if (!session.user.isAdmin || (existingServiceAccount && !isOwner)) {
      return NextResponse.json(
        { error: "Accès refusé - Administrateur propriétaire requis" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json({ error: "characterId requis" }, { status: 400 });
    }

    const character = await prisma.eveCharacter.findFirst({
      where: {
        characterId: BigInt(characterId),
        userId: session.user.id,
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "Personnage non trouvé ou ne vous appartient pas" },
        { status: 404 }
      );
    }

    await prisma.eveCharacter.updateMany({
      where: { isServiceAccount: true },
      data: { isServiceAccount: false },
    });

    await prisma.eveCharacter.update({
      where: { id: character.id },
      data: { isServiceAccount: true },
    });

    console.log(`[Admin] Service account set to ${character.characterName} (${characterId}) by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: `${character.characterName} est maintenant le service account`,
      serviceAccount: {
        characterId: character.characterId.toString(),
        characterName: character.characterName,
      },
    });
  } catch (error) {
    console.error("[Admin] Set service account error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:admin:service-account:delete",
      limit: 20,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const existingServiceAccount = await prisma.eveCharacter.findFirst({
      where: { isServiceAccount: true },
    });

    if (!existingServiceAccount) {
      return NextResponse.json({
        success: true,
        message: "Aucun service account à supprimer",
      });
    }

    if (existingServiceAccount.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Accès refusé - Seul le propriétaire peut supprimer le service account" },
        { status: 403 }
      );
    }

    await prisma.eveCharacter.update({
      where: { id: existingServiceAccount.id },
      data: { isServiceAccount: false },
    });

    console.log(`[Admin] Service account removed by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Service account supprimé",
    });
  } catch (error) {
    console.error("[Admin] Delete service account error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
