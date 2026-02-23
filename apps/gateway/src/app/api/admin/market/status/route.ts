import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { prisma } from "@netk/database";
import { redis, isRedisAvailable } from "@netk/database/redis";

const PROGRESS_KEY = "netk:market-fetcher:progress";

interface FetchProgress {
  jobId: string;
  regionId: string;
  regionName: string;
  status: "fetching_orders" | "processing_types" | "completed" | "failed";
  currentPage: number;
  totalPages: number;
  currentType: number;
  totalTypes: number;
  successCount: number;
  errorCount: number;
  startedAt: string;
  updatedAt: string;
}

/**
 * GET /api/admin/market/status
 *
 * Returns the status of market fetch jobs.
 * Only accessible by super admins (isAdmin: true)
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "Accès refusé - Administrateur requis" },
        { status: 403 }
      );
    }

    // Get recent fetch jobs (last 10)
    const recentJobs = await prisma.marketFetchJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        regionId: true,
        status: true,
        itemsCount: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });
    type RecentJob = (typeof recentJobs)[number];

    // Get last successful fetch per region
    const lastSuccessfulByRegion = await prisma.marketFetchJob.groupBy({
      by: ["regionId"],
      where: { status: "completed" },
      _max: { completedAt: true },
    });
    type LastSuccessfulByRegionItem = (typeof lastSuccessfulByRegion)[number];

    // Get total types and prices in database
    const [typesCount, pricesCount] = await Promise.all([
      prisma.eveType.count(),
      prisma.marketPrice.count(),
    ]);

    // Get running job if any
    const runningJob = recentJobs.find((job: RecentJob) => job.status === "running");

    // Region ID to name mapping
    const regionNames: Record<string, string> = {
      "10000002": "The Forge (Jita)",
      "10000043": "Domain (Amarr)",
      "10000030": "Heimatar (Rens)",
      "10000032": "Sinq Laison (Dodixie)",
      "10000042": "Metropolis (Hek)",
    };

    // Format jobs for response
    const formattedJobs = recentJobs.map((job: RecentJob) => ({
      id: job.id,
      region: regionNames[job.regionId.toString()] || `Unknown (${job.regionId})`,
      regionId: job.regionId.toString(),
      status: job.status,
      itemsCount: job.itemsCount,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      duration: job.startedAt && job.completedAt
        ? Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)
        : null,
    }));

    // Format last successful by region
    const lastSuccessful = lastSuccessfulByRegion.map((item: LastSuccessfulByRegionItem) => ({
      region: regionNames[item.regionId.toString()] || `Unknown (${item.regionId})`,
      regionId: item.regionId.toString(),
      lastFetch: item._max.completedAt?.toISOString(),
    }));

    // Get live progress from Redis
    let progress: FetchProgress | null = null;
    try {
      if (await isRedisAvailable()) {
        const progressData = await redis.get(PROGRESS_KEY);
        if (progressData) {
          progress = JSON.parse(progressData);
        }
      }
    } catch {
      // Ignore Redis errors
    }

    return NextResponse.json({
      isRunning: !!runningJob,
      runningJob: runningJob ? {
        id: runningJob.id,
        region: regionNames[runningJob.regionId.toString()],
        startedAt: runningJob.startedAt?.toISOString(),
      } : null,
      progress,
      stats: {
        typesCount,
        pricesCount,
      },
      lastSuccessfulByRegion: lastSuccessful,
      recentJobs: formattedJobs,
    });

  } catch (error) {
    console.error("[Admin] Market status error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
