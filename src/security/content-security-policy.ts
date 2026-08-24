const imageHosts = ["picsum.photos", "fastly.picsum.photos"];
const mediaHosts = ["interactive-examples.mdn.mozilla.net"];

function addConfiguredMediaHost(hosts: string[]) {
  const pullZone = process.env.BUNNY_CDN_URL ?? process.env.BUNNY_PULL_ZONE_URL;
  if (!pullZone) return hosts;

  try {
    return [...hosts, new URL(pullZone).hostname];
  } catch {
    return hosts;
  }
}

export function createContentSecurityPolicy(nonce: string, production = process.env.NODE_ENV === "production") {
  const scripts = production
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  const images = addConfiguredMediaHost(imageHosts).map((host) => `https://${host}`).join(" ");
  const media = addConfiguredMediaHost(mediaHosts).map((host) => `https://${host}`).join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `connect-src 'self'${production ? "" : " ws:"}`,
    `img-src 'self' data: blob: ${images}`,
    "font-src 'self' data:",
    `media-src 'self' blob: ${media}`,
    `script-src ${scripts}`,
    `style-src 'self' 'nonce-${nonce}'`,
  ].join("; ");
}
