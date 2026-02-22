// Prisma client (safe for all environments)
export { prisma } from "./client";
export type { PrismaClient } from "./client";

// Note: Redis and Encryption are NOT exported here to avoid Node.js module issues
// Import them directly:
//   - "@netk/database/redis" for Redis (server-side only)
//   - "@netk/database/encryption" for encryption (server-side only)

// Re-export Prisma types for convenience
export type {
  User,
  OAuthAccount,
  EveCharacter,
  UserPreferences,
  ConnectionLog,
  VerificationToken,
} from "@prisma/client";
