import { desc, eq, like, or } from "drizzle-orm";
import { Search } from "lucide-react";

import { SubmitButton } from "@/components/admin/submit-button";
import { moderateComment } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { articles, comments, commentStatusValues, users } from "@/src/db/schema";

export default async function CommentsAdminPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdminUser("comments:moderate"); const { status = "PENDING", q = "" } = await searchParams; const db = await getDb();
  const filter = status && commentStatusValues.includes(status as typeof commentStatusValues[number]) ? eq(comments.status, status as typeof comments.$inferSelect.status) : q ? or(like(comments.body, `%${q}%`), like(comments.authorName, `%${q}%`)) : undefined;
  const rows = await db.select({ id: comments.id, body: comments.body, status: comments.status, authorName: comments.authorName, authorEmail: comments.authorEmail, createdAt: comments.createdAt, articleTitle: articles.title, articleSlug: articles.slug, userName: users.name }).from(comments).leftJoin(articles, eq(comments.articleId, articles.id)).leftJoin(users, eq(comments.userId, users.id)).where(filter).orderBy(desc(comments.createdAt)).limit(100);
  return <><header className="admin-page-header"><div><span className="admin-eyebrow">Community</span><h1>Comment moderation</h1><p>Review reader discussion and keep conversations healthy.</p></div></header><form className="admin-filter-bar"><label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search comments" /></label><select name="status" defaultValue={status}><option value="">All statuses</option>{commentStatusValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select><button>Filter</button><span>{rows.length} comments</span></form><section className="admin-moderation-list">{rows.map((comment) => <article className="admin-card" key={comment.id}><div className="admin-comment-head"><div className="admin-user-avatar">{(comment.userName ?? comment.authorName ?? "G").slice(0, 2).toUpperCase()}</div><div><strong>{comment.userName ?? comment.authorName ?? "Guest reader"}</strong><small>{comment.authorEmail ?? "Registered account"} · {new Date(comment.createdAt).toLocaleString()}</small></div><span className={`admin-status ${comment.status.toLowerCase()}`}>{humanize(comment.status)}</span></div><blockquote>{comment.body}</blockquote><div className="admin-comment-foot"><a href={`/articles/${comment.articleSlug}`} target="_blank">On: {comment.articleTitle}</a><form action={moderateComment.bind(null, comment.id)}><select name="status" defaultValue={comment.status}>{commentStatusValues.map((value) => <option key={value}>{value}</option>)}</select><SubmitButton>Apply</SubmitButton></form></div></article>)}</section>{rows.length === 0 ? <p className="admin-empty admin-card">The moderation queue is clear.</p> : null}</>;
}
