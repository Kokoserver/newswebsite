import { createHash } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";

import { getDb } from "@/src/db";
import { passwordResetTokens, users } from "@/src/db/schema";

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const db = await getDb();
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid reset request." },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(parsed.data.token);
  const resetToken = await db.query.passwordResetTokens.findFirst({
    columns: {
      id: true,
      userId: true,
    },
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ),
  });

  if (!resetToken) {
    return NextResponse.json(
      { message: "This reset link is invalid or has expired. Please request a new link." },
      { status: 400 },
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        status: "ACTIVE",
        updatedAt: now,
      })
      .where(eq(users.id, resetToken.userId));

    await tx
      .update(passwordResetTokens)
      .set({
        usedAt: now,
      })
      .where(eq(passwordResetTokens.id, resetToken.id));
  });

  return NextResponse.json({ message: "Password updated. You can now sign in." });
}
