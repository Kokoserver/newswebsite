import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createContentSecurityPolicy } from "@/src/security/content-security-policy";
import { checkRateLimit } from "@/src/security/rate-limit";

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
    pathPattern: /^\/api\/auth\/forgot-password$/,
    windowMs: 15 * 60_000,
    max: 5,
  },
  {
    pathPattern: /^\/api\/auth\/reset-password$/,
    windowMs: 15 * 60_000,
    max: 5,
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

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function nonceForRequest() {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

function securityHeaders(nonce: string) {
  return {
    "Content-Security-Policy": createContentSecurityPolicy(nonce),
    "x-nonce": nonce,
  };
}

export async function proxy(request: NextRequest) {
  const nonce = nonceForRequest();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", createContentSecurityPolicy(nonce));
  requestHeaders.set("x-nonce", nonce);

  const pathname = request.nextUrl.pathname;
  const limit = routeLimits.find((route) => route.pathPattern.test(pathname));

  if (request.method === "POST" && limit) {
    const result = await checkRateLimit(`${getClientIp(request)}|${pathname}`, limit.max, limit.windowMs);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            ...securityHeaders(nonce),
            "Retry-After": String(result.retryAfterSeconds),
          },
        },
      );
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of Object.entries(securityHeaders(nonce))) response.headers.set(name, value);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
