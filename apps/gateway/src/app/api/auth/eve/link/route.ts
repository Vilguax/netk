import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getEveAuthUrl } from "@netk/auth/eve";
import { prisma } from "@netk/database";
import { generateRawToken, hashVerificationToken } from "@netk/auth/security";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const url = new URL(request.url);
    const setAsMain = url.searchParams.get("setAsMain") === "true";
    const isUpdate = url.searchParams.has("update");

    const stateToken = generateRawToken();
    const stateTokenHash = hashVerificationToken(stateToken);
    const stateData = JSON.stringify({
      userId: session.user.id,
      setAsMain,
      isUpdate,
      token: stateToken,
    });
    const state = Buffer.from(stateData).toString("base64url");

    await prisma.verificationToken.create({
      data: {
        userId: session.user.id,
        token: stateTokenHash,
        type: "eve_link",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const authUrl = getEveAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("EVE link error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
