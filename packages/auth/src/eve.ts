import { prisma } from "@netk/database";
import { encrypt, decrypt } from "@netk/database/encryption";

// EVE SSO endpoints
const EVE_AUTH_URL = "https://login.eveonline.com/v2/oauth/authorize";
const EVE_TOKEN_URL = "https://login.eveonline.com/v2/oauth/token";
const EVE_VERIFY_URL = "https://esi.evetech.net/verify/";

// Default scopes for EVE characters
export const EVE_DEFAULT_SCOPES = [
  "esi-contracts.read_character_contracts.v1",
  "esi-markets.read_character_orders.v1",
  "esi-ui.write_waypoint.v1",
  "esi-wallet.read_character_wallet.v1",
  "esi-location.read_location.v1",
  "esi-location.read_ship_type.v1",
  "esi-location.read_online.v1",
  "esi-fittings.read_fittings.v1",
  "esi-fleets.read_fleet.v1",
  "esi-fleets.write_fleet.v1",
  "esi-skills.read_skills.v1",
];

export interface EveTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface EveCharacterInfo {
  characterId: number;
  characterName: string;
  corporationId: number;
  scopes: string[];
}

/**
 * Generate EVE SSO authorization URL for character linking
 */
export function getEveAuthUrl(
  state: string,
  scopes: string[] = EVE_DEFAULT_SCOPES
): string {
  const redirectUri = `${process.env.AUTH_URL}/api/auth/eve/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: redirectUri,
    client_id: process.env.EVE_CLIENT_ID!,
    scope: scopes.join(" "),
    state,
  });

  return `${EVE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeEveCode(code: string): Promise<EveTokens> {
  const response = await fetch(EVE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Verify token and get character info
 */
export async function verifyEveToken(
  accessToken: string
): Promise<EveCharacterInfo> {
  const response = await fetch(EVE_VERIFY_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to verify EVE token");
  }

  const data = await response.json();

  // Get corporation ID from ESI
  const corpResponse = await fetch(
    `https://esi.evetech.net/latest/characters/${data.CharacterID}/`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const corpData = await corpResponse.json();

  return {
    characterId: data.CharacterID,
    characterName: data.CharacterName,
    corporationId: corpData.corporation_id,
    scopes: data.Scopes ? data.Scopes.split(" ") : [],
  };
}

/**
 * Refresh EVE tokens
 */
export async function refreshEveTokens(
  refreshToken: string
): Promise<EveTokens> {
  const response = await fetch(EVE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh EVE tokens");
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Link an EVE character to a NETK user account
 */
export async function linkEveCharacter(
  userId: string,
  tokens: EveTokens,
  characterInfo: EveCharacterInfo,
  setAsMain: boolean = false
): Promise<void> {
  // Check if character is already linked to another user
  const existing = await prisma.eveCharacter.findUnique({
    where: { characterId: BigInt(characterInfo.characterId) },
  });

  if (existing && existing.userId !== userId) {
    throw new Error("Ce personnage est déjà lié à un autre compte");
  }

  // If setting as main, unset other characters first
  if (setAsMain) {
    await prisma.eveCharacter.updateMany({
      where: { userId, isMain: true },
      data: { isMain: false },
    });
  }

  // Upsert the character
  await prisma.eveCharacter.upsert({
    where: { characterId: BigInt(characterInfo.characterId) },
    create: {
      userId,
      characterId: BigInt(characterInfo.characterId),
      characterName: characterInfo.characterName,
      corporationId: BigInt(characterInfo.corporationId),
      accessToken: encrypt(tokens.accessToken),
      refreshToken: encrypt(tokens.refreshToken),
      tokenExpires: tokens.expiresAt,
      scopes: characterInfo.scopes,
      isMain: setAsMain,
    },
    update: {
      characterName: characterInfo.characterName,
      corporationId: BigInt(characterInfo.corporationId),
      accessToken: encrypt(tokens.accessToken),
      refreshToken: encrypt(tokens.refreshToken),
      tokenExpires: tokens.expiresAt,
      scopes: characterInfo.scopes,
      isMain: setAsMain ? true : undefined,
    },
  });
}

/**
 * Unlink an EVE character from a user
 */
export async function unlinkEveCharacter(
  userId: string,
  characterId: bigint
): Promise<void> {
  await prisma.eveCharacter.deleteMany({
    where: {
      userId,
      characterId,
    },
  });
}

/**
 * Get all linked characters for a user
 */
export async function getUserCharacters(userId: string) {
  return prisma.eveCharacter.findMany({
    where: { userId },
    orderBy: [{ isMain: "desc" }, { characterName: "asc" }],
  });
}

/**
 * Get decrypted access token for a character, refreshing if needed
 */
export async function getCharacterAccessToken(
  characterId: bigint
): Promise<string | null> {
  const character = await prisma.eveCharacter.findUnique({
    where: { characterId },
  });

  if (!character) return null;

  // Check if token needs refresh (expires in less than 5 minutes)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (character.tokenExpires <= fiveMinutesFromNow) {
    try {
      const decryptedRefresh = decrypt(character.refreshToken);
      const newTokens = await refreshEveTokens(decryptedRefresh);

      await prisma.eveCharacter.update({
        where: { characterId },
        data: {
          accessToken: encrypt(newTokens.accessToken),
          refreshToken: encrypt(newTokens.refreshToken),
          tokenExpires: newTokens.expiresAt,
        },
      });

      return newTokens.accessToken;
    } catch (err) {
      console.error(`[Auth] Token refresh failed for character ${characterId}:`, err);
      return null;
    }
  }

  return decrypt(character.accessToken);
}

/**
 * Set a character as main for a user
 */
export async function setMainCharacter(
  userId: string,
  characterId: bigint
): Promise<void> {
  // Verify character belongs to user
  const character = await prisma.eveCharacter.findFirst({
    where: { userId, characterId },
  });

  if (!character) {
    throw new Error("Personnage non trouvé");
  }

  // Unset all other mains
  await prisma.eveCharacter.updateMany({
    where: { userId, isMain: true },
    data: { isMain: false },
  });

  // Set new main
  await prisma.eveCharacter.update({
    where: { characterId },
    data: { isMain: true },
  });
}

// ===========================================
// SERVICE ACCOUNT (Admin operations)
// ===========================================

export interface ServiceAccountInfo {
  characterId: bigint;
  characterName: string;
  userId: string;
  scopes: string[];
  accessToken: string;
}

/**
 * Get the service account with a valid access token.
 * Automatically refreshes the token if needed.
 *
 * Returns null if:
 * - No service account is configured
 * - Token refresh fails
 */
export async function getServiceAccount(): Promise<ServiceAccountInfo | null> {
  const serviceAccount = await prisma.eveCharacter.findFirst({
    where: { isServiceAccount: true },
  });

  if (!serviceAccount) {
    return null;
  }

  // Get valid access token (refreshes if needed)
  const accessToken = await getCharacterAccessToken(serviceAccount.characterId);

  if (!accessToken) {
    return null;
  }

  return {
    characterId: serviceAccount.characterId,
    characterName: serviceAccount.characterName,
    userId: serviceAccount.userId,
    scopes: serviceAccount.scopes,
    accessToken,
  };
}

/**
 * Check if a service account is configured and has valid tokens.
 */
export async function isServiceAccountConfigured(): Promise<boolean> {
  const serviceAccount = await getServiceAccount();
  return serviceAccount !== null;
}

/**
 * Get the service account character ID (without token).
 * Useful for quick checks without decrypting tokens.
 */
export async function getServiceAccountId(): Promise<bigint | null> {
  const serviceAccount = await prisma.eveCharacter.findFirst({
    where: { isServiceAccount: true },
    select: { characterId: true },
  });

  return serviceAccount?.characterId ?? null;
}
