// Client-safe exports (no Node.js dependencies)

// Provider type for UI styling
export type AuthProvider = "credentials" | "google" | "discord";

// Provider colors for UI
export const PROVIDER_COLORS: Record<AuthProvider, string> = {
  credentials: "#22c55e", // Green (NETK)
  google: "#f97316",      // Orange
  discord: "#5865f2",     // Discord blue
};
