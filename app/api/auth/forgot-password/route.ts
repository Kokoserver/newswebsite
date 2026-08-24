import { randomBytes, createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSiteUrl } from "@/src/config";
import { getDb } from "@/src/db";
import { passwordResetTokens, users } from "@/src/db/schema";
import { emailConfigured } from "@/src/email";
import { sendPasswordResetEmail } from "@/src/email/templates";

const forgotPasswordSchema = z.object({
  email: z.email().max(320),
});

const genericMessage =
  "If an account exists for that email, a password reset email has been sent.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token: string) {
  const baseUrl = getSiteUrl();
  return new URL(`/reset-password?token=${encodeURIComponent(token)}`, baseUrl).toString();
}

export async function POST(request: Request) {
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Please provide a valid email address." }, { status: 400 });
  }

  if (process.env.NODE_ENV === "production" && !emailConfigured()) {
    return NextResponse.json(
      { message: "Password reset email is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const db = await getDb();
  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.query.users.findFirst({
    columns: {
      id: true,
      status: true,
    },
    where: eq(users.email, email),
  });

  let resetUrl: string | undefined;

  if (user?.status === "ACTIVE") {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    resetUrl = buildResetUrl(token);
    if (emailConfigured()) {
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (error) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
        console.error("Password reset email delivery failed.", error);
        return NextResponse.json({ message: genericMessage });
      }
    }
  }

  return NextResponse.json({
    message: genericMessage,
    resetUrl: process.env.NODE_ENV === "production" || emailConfigured() ? undefined : resetUrl,
  });
}
