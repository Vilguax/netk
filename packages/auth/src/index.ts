import NextAuth from "next-auth";
import type { NextAuthConfig, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import { headers } from "next/headers";
import { prisma } from "@netk/database";
import { verifyPassword } from "./password";

// Provider type for UI styling
export type AuthProvider = "credentials" | "google" | "discord";

// Provider colors for UI
export const PROVIDER_COLORS: Record<AuthProvider, string> = {
  credentials: "#22c55e", // Green (NETK)
  google: "#f97316",      // Orange
  discord: "#5865f2",     // Discord blue
};

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      isAdmin: boolean;
      provider: AuthProvider;
      activeCharacterId?: string;
      activeCharacterName?: string;
    };
  }

  interface User {
    isAdmin?: boolean;
    provider?: AuthProvider;
    activeCharacterId?: string;
    activeCharacterName?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    isAdmin: boolean;
    provider: AuthProvider;
    activeCharacterId?: string;
    activeCharacterName?: string;
  }
}

// Build providers array based on available config
function getProviders() {
  const providers: NextAuthConfig["providers"] = [];

  // Credentials provider (email/password)
  providers.push(
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            eveCharacters: {
              where: { isMain: true },
              take: 1,
            },
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        const mainCharacter = user.eveCharacters[0];

        return {
          id: user.id,
          email: user.email,
          name: mainCharacter?.characterName ?? user.email,
          isAdmin: user.isAdmin,
          provider: "credentials" as AuthProvider,
          activeCharacterId: mainCharacter?.characterId.toString(),
          activeCharacterName: mainCharacter?.characterName,
        };
      },
    })
  );

  // Google provider (if configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: false,
      })
    );
  }

  // Discord provider (if configured)
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    providers.push(
      Discord({
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: false,
      })
    );
  }

  return providers;
}

export const authConfig: NextAuthConfig = {
  providers: getProviders(),
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/onboarding",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: "netk.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain:
          process.env.NODE_ENV === "production"
            ? process.env.AUTH_COOKIE_DOMAIN
            : undefined,
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers, create or link user account
      if (account?.provider === "google" || account?.provider === "discord") {
        const isEmailVerified =
          account.provider === "google"
            ? (profile as { email_verified?: boolean } | undefined)?.email_verified === true
            : ((profile as { verified?: boolean; email_verified?: boolean } | undefined)
                ?.verified === true ||
                (profile as { verified?: boolean; email_verified?: boolean } | undefined)
                  ?.email_verified === true);

        if (!isEmailVerified) {
          return false;
        }

        const email = profile?.email || user.email;

        if (!email) {
          return false;
        }

        // Find or create user
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          // Create new user
          dbUser = await prisma.user.create({
            data: {
              email,
              emailVerified: true, // OAuth emails are verified
            },
          });

          // Create preferences
          await prisma.userPreferences.create({
            data: { userId: dbUser.id },
          });
        }

        // Link OAuth account if not already linked
        const existingAccount = await prisma.oAuthAccount.findUnique({
          where: {
            provider_providerId: {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          },
        });

        if (!existingAccount) {
          await prisma.oAuthAccount.create({
            data: {
              userId: dbUser.id,
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          });
        }

        // Store user ID for JWT callback
        user.id = dbUser.id;
        user.isAdmin = dbUser.isAdmin;
      }

      let ipAddress = "unknown";
      let userAgent: string | null = null;
      try {
        const requestHeaders = await headers();
        const forwarded = requestHeaders.get("x-forwarded-for");
        ipAddress =
          forwarded?.split(",")[0]?.trim() ||
          requestHeaders.get("x-real-ip") ||
          requestHeaders.get("cf-connecting-ip") ||
          "unknown";
        userAgent = requestHeaders.get("user-agent");
      } catch {
        // No request context available.
      }

      // Log connection attempt
      await prisma.connectionLog.create({
        data: {
          userId: user.id || null,
          ipAddress,
          userAgent,
          success: true,
        },
      });

      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        token.userId = user.id!;
        token.isAdmin = user.isAdmin ?? false;
        token.provider = (user.provider ?? account?.provider ?? "credentials") as AuthProvider;
        token.activeCharacterId = user.activeCharacterId;
        token.activeCharacterName = user.activeCharacterName;
      }

      // Handle session updates (e.g., changing active character)
      if (trigger === "update" && session) {
        if (session.activeCharacterId !== undefined) {
          token.activeCharacterId = session.activeCharacterId;
          token.activeCharacterName = session.activeCharacterName;
        }
      }

      // Refresh main character info periodically
      if (token.userId && !token.activeCharacterId) {
        const mainChar = await prisma.eveCharacter.findFirst({
          where: { userId: token.userId, isMain: true },
        });

        if (mainChar) {
          token.activeCharacterId = mainChar.characterId.toString();
          token.activeCharacterName = mainChar.characterName;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.isAdmin = token.isAdmin;
      session.user.provider = token.provider;
      session.user.activeCharacterId = token.activeCharacterId;
      session.user.activeCharacterName = token.activeCharacterName;

      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnRegister = nextUrl.pathname === "/register";
      const isOnForgotPassword = nextUrl.pathname === "/forgot-password";
      const isOnResetPassword = nextUrl.pathname.startsWith("/reset-password");
      const isOnVerify = nextUrl.pathname.startsWith("/verify");
      const isPublicPath =
        isOnLogin ||
        isOnRegister ||
        isOnForgotPassword ||
        isOnResetPassword ||
        isOnVerify;

      if (isPublicPath) {
        return true;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser && user.email) {
        // Create user preferences for new users
        const existingPrefs = await prisma.userPreferences.findUnique({
          where: { userId: user.id! },
        });

        if (!existingPrefs) {
          await prisma.userPreferences.create({
            data: { userId: user.id! },
          });
        }
      }
    },
  },
};

const nextAuth = NextAuth(authConfig);

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth = nextAuth.auth;

// Note: Password and EVE utilities are NOT re-exported here to avoid Node.js module issues
// Import them directly:
//   - "@netk/auth/password" for password utilities (server-side only)
//   - "@netk/auth/eve" for EVE utilities (server-side only)
