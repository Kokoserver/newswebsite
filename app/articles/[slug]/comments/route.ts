import { and, eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

import { commentAutoApproveEnabled } from "@/src/config";
import { authOptions } from "@/src/auth";
import { articles, comments } from "@/src/db/schema";

type CommentRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

const emailSchema = z.email("Please provide a valid email address.").max(320);

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request, { params }: CommentRouteContext) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { getDb } = await import("@/src/db");
    const db = await getDb();
  const session = await getServerSession(authOptions);
  const { slug } = await params;
  const formData = await request.formData();

  const signedInUser = session?.user;
  const authorName =
    signedInUser?.name ??
    sanitizeHtml(cleanText(formData.get("authorName"), 160), {
      allowedTags: [],
      allowedAttributes: {},
    });
  const authorEmail =
    signedInUser?.email ??
    cleanText(formData.get("authorEmail"), 320).toLowerCase();
  const body = sanitizeHtml(cleanText(formData.get("body"), 2_000), {
    allowedTags: [],
    allowedAttributes: {},
  });

  const article = await db.query.articles.findFirst({
    columns: {
      id: true,
      slug: true,
      allowComments: true,
    },
    where: and(
      eq(articles.slug, slug),
      eq(articles.status, "PUBLISHED"),
      sql`${articles.deletedAt} IS NULL`,
    ),
  });

  const redirectUrl = new URL(`/articles/${slug}`, request.url);

  const invalidEmail = signedInUser ? false : !emailSchema.safeParse(authorEmail).success;

  if (
    !article ||
    !article.allowComments ||
    !authorName ||
    !authorEmail ||
    invalidEmail ||
    body.length < 5
  ) {
    redirectUrl.searchParams.set("comment", "invalid");
    return NextResponse.redirect(redirectUrl, 303);
  }

  const autoApprove = commentAutoApproveEnabled();

  await db.insert(comments).values({
    articleId: article.id,
    userId: signedInUser?.id ?? null,
    authorName,
    authorEmail,
    body,
    status: autoApprove ? "APPROVED" : "PENDING",
  });

  redirectUrl.searchParams.set("comment", autoApprove ? "posted" : "pending");
  redirectUrl.hash = "comments";

  return NextResponse.redirect(redirectUrl, 303);
}
