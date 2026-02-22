import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        console.error("Redis connection failed after 3 retries");
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });

  client.on("error", (err) => {
    console.error("Redis connection error:", err.message);
  });

  client.on("connect", () => {
    if (process.env.NODE_ENV === "development") {
      console.log("Redis connected");
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/**
 * Check if Redis is available and connected
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

// ===========================================
// CACHE HELPERS
// ===========================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

/**
 * Get a value from cache, or compute and store it if not found
 */
export async function cached<T>(
  key: string,
  compute: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300 } = options; // Default 5 minutes

  try {
    const cachedValue = await redis.get(key);
    if (cachedValue) {
      return JSON.parse(cachedValue) as T;
    }
  } catch {
    // Cache miss or error, continue to compute
  }

  const value = await compute();

  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // Failed to cache, but we still have the value
  }

  return value;
}

/**
 * Invalidate cache by key or pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    if (pattern.includes("*")) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(pattern);
    }
  } catch (err) {
    console.error("Failed to invalidate cache:", err);
  }
}

// ===========================================
// RATE LIMITING
// ===========================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds
}

/**
 * Check and update rate limit for a given key
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetIn: ttl > 0 ? ttl : windowSeconds,
  };
}

export type { Redis };
