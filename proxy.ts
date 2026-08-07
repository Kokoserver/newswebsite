import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

type RouteLimit = {
  pathPattern: RegExp;
  windowMs: number;
  max: number;
};

const routeLimits: RouteLimit[] = [
  {
    pathPattern: /^\/api\/auth\/callback\/credentials$/,
    windowMs: 15 * 60_000,
    max: 10,
  },
  {
    pathPattern: /^\/api\/auth\/register$/,
    windowMs: 15 * 60_000,
    max: 10,
  },
  {
    pathPattern: /^\/api\/newsletter\//,
    windowMs: 5 * 60_000,
    max: 5,
  },
  {
    pathPattern: /^\/api\/comments\//,
    windowMs: 5 * 60_000,
    max: 60,
  },
  {
    pathPattern: /^\/api\/views$/,
    windowMs: 60_000,
    max: 30,
  },
  {
    pathPattern: /^\/articles\/[^/]+\/comments$/,
    windowMs: 10 * 60_000,
    max: 10,
  },
];

const buckets = new Map<string, Bucket>();

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function pruneBuckets(now: number) {
  if (buckets.size < 10_000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function proxy(request: NextRequest) {
  if (request.method !== "POST") {
    return;
  }

  const pathname = request.nextUrl.pathname;
  const limit = routeLimits.find((route) => route.pathPattern.test(pathname));

  if (!limit) {
    return;
  }

  const now = Date.now();
  pruneBuckets(now);

  const key = `${getClientIp(request)}|${pathname}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return;
  }

  bucket.count += 1;

  if (bucket.count > limit.max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);

    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/newsletter/:path*",
    "/api/comments/:path*",
    "/api/views",
    "/articles/:slug/comments",
  ],
};
