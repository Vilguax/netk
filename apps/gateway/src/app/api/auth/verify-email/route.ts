import { NextResponse } from "next/server";
import { prisma } from "@netk/database";
import {
  enforceMaxBodySize,
  enforceRateLimit,
  ensureCsrf,
  hashVerificationToken,
} from "@netk/auth/security";

export async function POST(request: Request) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 4 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:auth:verify-email",
      limit: 20,
      windowSeconds: 10 * 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    const tokenHash = hashVerificationToken(token);
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Lien de vérification invalide" },
        { status: 400 }
      );
    }

    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Ce lien a expiré. Veuillez demander un nouveau lien." },
        { status: 400 }
      );
    }

    if (verificationToken.usedAt) {
      return NextResponse.json(
        { error: "Ce lien a déjà été utilisé" },
        { status: 400 }
      );
    }

    if (verificationToken.type !== "email_verification") {
      return NextResponse.json(
        { error: "Type de token invalide" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Email vérifié avec succès. Vous pouvez maintenant vous connecter.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la vérification" },
      { status: 500 }
    );
  }
}
