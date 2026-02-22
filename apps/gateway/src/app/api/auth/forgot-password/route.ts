import { NextResponse } from "next/server";
import { prisma } from "@netk/database";
import { validateEmail } from "@netk/auth/password";
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

    const bodyTooLarge = enforceMaxBodySize(request, 8 * 1024);
    if (bodyTooLarge) return bodyTooLarge;

    const rateLimitError = await enforceRateLimit(request, {
      bucket: "gateway:auth:forgot-password",
      limit: 8,
      windowSeconds: 10 * 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.passwordHash) {
      const token = generateRawToken();
      const tokenHash = hashVerificationToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.verificationToken.deleteMany({
        where: {
          userId: user.id,
          type: "password_reset",
        },
      });

      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          token: tokenHash,
          type: "password_reset",
          expiresAt,
        },
      });

      const resetUrl = `${process.env.AUTH_URL}/reset-password/${token}`;
      void resetUrl;
      // TODO: Send email when SMTP is configured.
    }

    return NextResponse.json({
      success: true,
      message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
