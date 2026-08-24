import { createHmac } from "node:crypto";

import { createClient, type RedisClientType } from "redis";

import { getAuthSecret } from "@/src/config";

type Bucket = { count: number; resetAt: number };
type LimitResult = { allowed: boolean; retryAfterSeconds: number };

const memoryBuckets = new Map<string, Bucket>();
let redisClient: RedisClientType | null = null;
let redisConnection: Promise<RedisClientType> | null = null;
let warnedAboutFallback = false;

const fixedWindowScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

function privateKey(identifier: string) {
  return createHmac("sha256", getAuthSecret()).update(identifier).digest("hex");
}

function pruneMemory(now: number) {
  if (memoryBuckets.size < 10_000) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}

function checkMemoryLimit(key: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  pruneMemory(now);
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
  }

  bucket.count += 1;
  return {
    allowed: bucket.count <= max,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
}

async function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redisClient?.isReady) return redisClient;

  if (!redisConnection) {
    const client = createClient({ url });
    client.on("error", () => undefined);
    redisConnection = client.connect().then(() => {
      redisClient = client as RedisClientType;
      return redisClient;
    });
  }

  try {
    return await redisConnection;
  } catch {
    redisConnection = null;
    return null;
  }
}

export async function checkRateLimit(identifier: string, max: number, windowMs: number) {
  const key = `newsroom:rate-limit:${privateKey(identifier)}`;
  const client = await getRedisClient();

  if (client) {
    try {
      const result = (await client.sendCommand([
        "EVAL",
        fixedWindowScript,
        "1",
        key,
        String(windowMs),
      ])) as [number, number];
      return {
        allowed: Number(result[0]) <= max,
        retryAfterSeconds: Math.max(1, Math.ceil(Number(result[1]) / 1_000)),
      };
    } catch {
      // A temporary Redis outage should degrade protection, not take the site offline.
    }
  }

  if (process.env.REDIS_URL && !warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn("Redis rate limiter unavailable; using the local fallback.");
  }
  return checkMemoryLimit(key, max, windowMs);
}

export function resetMemoryRateLimitsForTests() {
  memoryBuckets.clear();
}
