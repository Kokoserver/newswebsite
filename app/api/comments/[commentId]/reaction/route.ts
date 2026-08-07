import { and, count, eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/src/auth";
import { commentReactions, comments } from "@/src/db/schema";

type RouteContext = { params: Promise<{ commentId: string }> };

const reactionSchema = z.object({
  reaction: z.enum(["LIKE", "DISLIKE"]),
});

export async function POST(request: Request, context: RouteContext) {
  const { db } = await import("@/src/db");
  const { commentId } = await context.params;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to like a comment." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
  }

  const { reaction } = parsed.data;

  const comment = await db.query.comments.findFirst({
    columns: { id: true },
    where: and(eq(comments.id, commentId), sql`${comments.deletedAt} IS NULL`),
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const existing = await db.query.commentReactions.findFirst({
    where: and(
      eq(commentReactions.commentId, commentId),
      eq(commentReactions.userId, userId),
    ),
  });

  let myReaction: "LIKE" | "DISLIKE" | null = reaction;

  if (existing) {
    if (existing.reactionType === reaction) {
      await db.delete(commentReactions).where(eq(commentReactions.id, existing.id));
      myReaction = null;
    } else {
      await db
        .update(commentReactions)
        .set({ reactionType: reaction })
        .where(eq(commentReactions.id, existing.id));
    }
  } else {
    await db.insert(commentReactions).values({
      commentId,
      userId,
      reactionType: reaction,
    });
  }

  const countByType = async (type: "LIKE" | "DISLIKE") => {
    const [row] = await db
      .select({ value: count() })
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.reactionType, type),
        ),
      );
    return row?.value ?? 0;
  };

  const [likes, dislikes] = await Promise.all([
    countByType("LIKE"),
    countByType("DISLIKE"),
  ]);

  return NextResponse.json({ likes, dislikes, myReaction });
}
