import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getSiteUrl } from "@/src/config";
import { getDb } from "@/src/db";
import { newsletterSubscribers } from "@/src/db/schema";
import { readNewsletterUnsubscribeToken } from "@/src/newsletter/unsubscribe";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const email = readNewsletterUnsubscribeToken(token);
  const resultUrl = new URL("/newsletter/unsubscribed", getSiteUrl());

  if (!email) {
    resultUrl.searchParams.set("status", "invalid");
    return NextResponse.redirect(resultUrl);
  }

  const db = await getDb();
  await db
    .update(newsletterSubscribers)
    .set({ status: "UNSUBSCRIBED", unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.email, email));

  resultUrl.searchParams.set("status", "success");
  return NextResponse.redirect(resultUrl);
}
