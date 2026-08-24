import { createHmac, timingSafeEqual } from "node:crypto";

import { getAuthSecret, getSiteUrl } from "@/src/config";

function signatureFor(email: string) {
  return createHmac("sha256", getAuthSecret()).update(`newsletter:${email}`).digest("base64url");
}

export function createNewsletterUnsubscribeToken(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return `${Buffer.from(normalizedEmail).toString("base64url")}.${signatureFor(normalizedEmail)}`;
}

export function readNewsletterUnsubscribeToken(token: string) {
  const [encodedEmail, suppliedSignature, extra] = token.split(".");
  if (!encodedEmail || !suppliedSignature || extra) return null;

  try {
    const email = Buffer.from(encodedEmail, "base64url").toString("utf8").trim().toLowerCase();
    const expectedSignature = signatureFor(email);
    const supplied = Buffer.from(suppliedSignature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (!email.includes("@") || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return null;
    }

    return email;
  } catch {
    return null;
  }
}

export function createNewsletterUnsubscribeUrl(email: string) {
  const token = createNewsletterUnsubscribeToken(email);
  return new URL(`/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, getSiteUrl()).toString();
}
