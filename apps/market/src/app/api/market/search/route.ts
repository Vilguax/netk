import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@netk/database";
import { enforceRateLimit } from "@netk/auth/security";

/**
 * GET /api/market/search?q=tritanium&limit=20
 */
export async function GET(request: NextRequest) {
  const rateLimitError = await enforceRateLimit(request, {
    bucket: "market:search",
    limit: 120,
    windowSeconds: 60,
  });
  if (rateLimitError) return rateLimitError;

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "20", 10),
    50
  );

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const types = await prisma.eveType.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      marketPrices: { some: {} },
    },
    select: {
      id: true,
      name: true,
      iconId: true,
      categoryId: true,
      groupId: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return NextResponse.json({ results: types });
}
