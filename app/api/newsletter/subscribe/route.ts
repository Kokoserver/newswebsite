import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { newsletterSubscribers } from "@/src/db/schema";

const subscribeSchema = z.object({
  email: z.email("Please provide a valid email address.").max(320),
});

export async function POST(request: Request) {
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Please provide a valid email address.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const existing = await db.query.newsletterSubscribers.findFirst({
    where: eq(newsletterSubscribers.email, email),
  });

  if (existing) {
    if (existing.status === "UNSUBSCRIBED") {
      await db
        .update(newsletterSubscribers)
        .set({
          status: "ACTIVE",
          confirmedAt: new Date(),
          unsubscribedAt: null,
        })
        .where(eq(newsletterSubscribers.id, existing.id));

      return NextResponse.json({ ok: true, alreadySubscribed: false });
    }

    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  await db.insert(newsletterSubscribers).values({
    email,
    status: "ACTIVE",
    confirmedAt: new Date(),
  });

  return NextResponse.json({ ok: true, alreadySubscribed: false }, { status: 201 });
}
