const demoSiteUrl = "http://localhost:3000";
const demoAuthSecret = "daily-chronicle-demo-auth-secret-change-before-production";

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL!;
  }

  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : demoSiteUrl;
}

export function getAuthSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? demoAuthSecret;
}

export function commentAutoApproveEnabled() {
  return (process.env.COMMENT_AUTO_APPROVE ?? "false") === "true";
}
