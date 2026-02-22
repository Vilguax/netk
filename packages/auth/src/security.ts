import { createHmac, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@netk/database/redis";

const TOKEN_HASH_SECRET =
  process.env.TOKEN_HASH_SECRET || process.env.AUTH_SECRET || "netk-dev-secret";

function getAllowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();
  allowed.add(new URL(request.url).origin);

  if (process.env.AUTH_URL) {
    try {
      allowed.add(new URL(process.env.AUTH_URL).origin);
    } catch {
      // Ignore malformed env.
    }
  }

  if (process.env.NETK_ALLOWED_ORIGINS) {
    for (const origin of process.env.NETK_ALLOWED_ORIGINS.split(",")) {
      const value = origin.trim();
      if (value) allowed.add(value);
    }
  }

  return allowed;
}

function getOriginFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function validateCsrf(request: Request): { ok: true } | { ok: false; reason: string } {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const allowedOrigins = getAllowedOrigins(request);
  const origin = request.headers.get("origin");
  const refererOrigin = getOriginFromReferer(request.headers.get("referer"));

  if (origin && allowedOrigins.has(origin)) {
    return { ok: true };
  }

  if (!origin && refererOrigin && allowedOrigins.has(refererOrigin)) {
    return { ok: true };
  }

  return { ok: false, reason: "CSRF validation failed (origin/referer mismatch)" };
}

export function csrfErrorResponse(): NextResponse {
  return NextResponse.json(
    { error: "Requête refusée (CSRF)" },
    { status: 403 }
  );
}

export function ensureCsrf(request: Request): NextResponse | null {
  const csrf = validateCsrf(request);
  return csrf.ok ? null : csrfErrorResponse();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  return "unknown";
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}

export function enforceMaxBodySize(
  request: Request,
  maxBytes: number
): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;

  const size = Number(contentLength);
  if (!Number.isFinite(size)) return null;

  if (size > maxBytes) {
    return NextResponse.json(
      { error: "Payload trop volumineux" },
      { status: 413 }
    );
  }

  return null;
}

interface RateLimitOptions {
  bucket: string;
  limit: number;
  windowSeconds: number;
  keySuffix?: string;
}

export async function enforceRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const baseKey = options.keySuffix || getClientIp(request);
  const key = `netk:ratelimit:${options.bucket}:${baseKey}`;

  try {
    const result = await checkRateLimit(key, options.limit, options.windowSeconds);

    if (result.allowed) return null;

    return NextResponse.json(
      { error: "Trop de requêtes, réessayez plus tard" },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.resetIn),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.resetIn),
        },
      }
    );
  } catch {
    // Fail-open if Redis is unavailable.
    return null;
  }
}

export function generateRawToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function hashVerificationToken(token: string): string {
  return createHmac("sha256", TOKEN_HASH_SECRET).update(token).digest("hex");
}
