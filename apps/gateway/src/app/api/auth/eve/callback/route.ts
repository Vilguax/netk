import { NextResponse } from "next/server";
import { prisma } from "@netk/database";
import {
  exchangeEveCode,
  verifyEveToken,
  linkEveCharacter,
} from "@netk/auth/eve";
import { hashVerificationToken } from "@netk/auth/security";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.AUTH_URL}/account/characters?error=eve_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.AUTH_URL}/account/characters?error=invalid_request`
      );
    }

    let stateData: { userId: string; setAsMain: boolean; isUpdate?: boolean; token: string };
    try {
      const decoded = Buffer.from(state, "base64url").toString();
      stateData = JSON.parse(decoded);
    } catch {
      return NextResponse.redirect(
        `${process.env.AUTH_URL}/account/characters?error=invalid_state`
      );
    }

    const tokenHash = hashVerificationToken(stateData.token);

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        userId: stateData.userId,
        token: tokenHash,
        type: "eve_link",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        `${process.env.AUTH_URL}/account/characters?error=expired_state`
      );
    }

    await prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    const tokens = await exchangeEveCode(code);
    const characterInfo = await verifyEveToken(tokens.accessToken);

    await linkEveCharacter(
      stateData.userId,
      tokens,
      characterInfo,
      stateData.setAsMain
    );

    const successType = stateData.isUpdate ? "character_updated" : "character_linked";
    return NextResponse.redirect(
      `${process.env.AUTH_URL}/account/characters?success=${successType}&name=${encodeURIComponent(characterInfo.characterName)}`
    );
  } catch (error) {
    console.error("[EVE Callback] ERROR:", error);

    if (error instanceof Error && error.message.includes("déjà lié")) {
      return NextResponse.redirect(
        `${process.env.AUTH_URL}/account/characters?error=already_linked`
      );
    }

    return NextResponse.redirect(
      `${process.env.AUTH_URL}/account/characters?error=link_failed`
    );
  }
}
