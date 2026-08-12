import { randomBytes, createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/src/db";
import { passwordResetTokens, users } from "@/src/db/schema";

const forgotPasswordSchema = z.object({
  email: z.email().max(320),
});

const genericMessage =
  "If an account exists for that email, a password reset link has been created.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(`/reset-password?token=${encodeURIComponent(token)}`, baseUrl).toString();
}

export async function POST(request: Request) {
  const db = await getDb();
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Please provide a valid email address." }, { status: 400 });
  }

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
    console.info(`Password reset link for ${email}: ${resetUrl}`);
  }

  return NextResponse.json({
    message: genericMessage,
    resetUrl: process.env.NODE_ENV === "production" ? undefined : resetUrl,
  });
}
