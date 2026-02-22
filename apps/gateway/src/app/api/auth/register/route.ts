import { NextResponse } from "next/server";
import { prisma } from "@netk/database";
import { hashPassword, validatePassword, validateEmail } from "@netk/auth/password";
import {
  enforceMaxBodySize,
  enforceRateLimit,
  ensureCsrf,
  generateRawToken,
  hashVerificationToken,
} from "@netk/auth/security";

export async function POST(request: Request) {
  try {
    const csrfError = ensureCsrf(request);
    if (csrfError) return csrfError;

    const bodyTooLarge = enforceMaxBodySize(request, 16 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:auth:register",
      limit: 10,
      windowSeconds: 10 * 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email, password, confirmPassword } = body;

    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const isDev = process.env.NODE_ENV !== "production";

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        emailVerified: isDev,
      },
    });

    await prisma.userPreferences.create({
      data: { userId: user.id },
    });

    if (!isDev) {
      const token = generateRawToken();
      const tokenHash = hashVerificationToken(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          token: tokenHash,
          type: "email_verification",
          expiresAt,
        },
      });

      const verificationUrl = `${process.env.AUTH_URL}/verify/${token}`;
      void verificationUrl;
      // TODO: Send email when SMTP is configured.

      return NextResponse.json({
        success: true,
        message: "Compte créé. Vérifiez votre email pour activer votre compte.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Compte créé. Vous pouvez maintenant vous connecter.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    );
  }
}
