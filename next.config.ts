import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const distDir = process.env.NEXT_DIST_DIR ?? (isProduction ? ".next" : ".next-local");

const bunnyPullZoneUrl = process.env.BUNNY_PULL_ZONE_URL;

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

remotePatterns.push({
  protocol: "https",
  hostname: "picsum.photos",
  pathname: "/**",
});

if (bunnyPullZoneUrl) {
  const bunnyUrl = new URL(bunnyPullZoneUrl);

  remotePatterns.push({
    protocol: bunnyUrl.protocol.replace(":", "") as "http" | "https",
    hostname: bunnyUrl.hostname,
    pathname: "/**",
  });
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  distDir,
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
  },
  deploymentId: process.env.DEPLOYMENT_VERSION,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
