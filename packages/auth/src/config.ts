import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";

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

// Build providers array - edge compatible version (no DB calls in authorize)
function getProviders() {
  const providers: NextAuthConfig["providers"] = [];

  // Credentials provider (email/password)
  // Note: authorize is handled in the full config, this is just for edge detection
  providers.push(
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
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

/**
 * Edge-compatible auth config for middleware
 * Does not include database operations or Node.js-only modules
 */
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
};
