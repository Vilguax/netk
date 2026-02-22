import NextAuth from "next-auth";
import { authConfig } from "@netk/auth/config";

// Use edge-compatible config for middleware (no Node.js crypto)
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
