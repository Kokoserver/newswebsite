import { and, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { SubmitButton } from "@/components/admin/submit-button";
import { moderateComment } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { articles, comments, commentStatusValues, users } from "@/src/db/schema";

const pageSize = 20;

type SearchParams = {
  status?: string;
  q?: string;
  post?: string;
  user?: string;
  from?: string;
  to?: string;
  page?: string;
};

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

function commentsPageHref(filters: Omit<SearchParams, "page">, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value || key === "status") params.set(key, value ?? "");
  }
  params.set("page", String(page));
  return `/admin/comments?${params}`;
}

export default async function CommentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminUser("comments:moderate");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 120) ?? "";
  const post = params.post?.trim().slice(0, 120) ?? "";
  const user = params.user?.trim().slice(0, 120) ?? "";
  const from = validDate(params.from);
  const to = validDate(params.to);
  const requestedStatus = params.status?.trim() ?? "PENDING";
  const status = commentStatusValues.includes(requestedStatus as (typeof commentStatusValues)[number])
    ? requestedStatus as (typeof commentStatusValues)[number]
    : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const toDateExclusive = to ? new Date(Date.parse(`${to}T00:00:00.000Z`) + 24 * 60 * 60 * 1000) : null;
  const where = and(
    status ? eq(comments.status, status) : undefined,
    q ? ilike(comments.body, `%${q}%`) : undefined,
    post ? or(ilike(articles.title, `%${post}%`), ilike(articles.slug, `%${post}%`)) : undefined,
    user ? or(
      ilike(users.name, `%${user}%`),
      ilike(users.email, `%${user}%`),
      ilike(comments.authorName, `%${user}%`),
      ilike(comments.authorEmail, `%${user}%`),
    ) : undefined,
    fromDate ? gte(comments.createdAt, fromDate) : undefined,
    toDateExclusive ? lt(comments.createdAt, toDateExclusive) : undefined,
  );
  const db = await getDb();
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: comments.id,
        body: comments.body,
        status: comments.status,
        authorName: comments.authorName,
        authorEmail: comments.authorEmail,
        createdAt: comments.createdAt,
        articleTitle: articles.title,
        articleSlug: articles.slug,
        userName: users.name,
      })
      .from(comments)
      .leftJoin(articles, eq(comments.articleId, articles.id))
      .leftJoin(users, eq(comments.userId, users.id))
      .where(where)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(comments)
      .leftJoin(articles, eq(comments.articleId, articles.id))
      .leftJoin(users, eq(comments.userId, users.id))
      .where(where),
  ]);
  const total = Number(totalRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstResult = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);

  return (
    <>
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Community</span>
          <h1>Comment moderation</h1>
          <p>Review reader discussion and keep conversations healthy.</p>
        </div>
      </header>

      <form className="admin-comment-filters">
        <div className="admin-comment-filter-heading">
          <div><Search size={17} /><span><strong>Filter comments</strong><small>Combine any fields to narrow the moderation queue.</small></span></div>
          <span>{total.toLocaleString()} results</span>
        </div>
        <div className="admin-comment-filter-grid">
          <label>Comment text<input name="q" defaultValue={q} placeholder="Words in the comment" /></label>
          <label>Post<input name="post" defaultValue={post} placeholder="Post title or slug" /></label>
          <label>User<input name="user" defaultValue={user} placeholder="Name or email" /></label>
          <label>
            Status
            <select name="status" defaultValue={status}>
              <option value="">All statuses</option>
              {commentStatusValues.map((value) => (
                <option key={value} value={value}>{humanize(value)}</option>
              ))}
            </select>
          </label>
          <label>From date<input name="from" type="date" defaultValue={from} /></label>
          <label>To date<input name="to" type="date" defaultValue={to} /></label>
        </div>
        <div className="admin-comment-filter-actions">
          <Link href="/admin/comments?status=PENDING"><RotateCcw size={14} />Reset filters</Link>
          <button type="submit" className="admin-button">Apply filters</button>
        </div>
      </form>

      <section className="admin-moderation-list">
        {rows.map((comment) => (
          <article className="admin-card" key={comment.id}>
            <div className="admin-comment-head">
              <div className="admin-user-avatar">
                {(comment.userName ?? comment.authorName ?? "G").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <strong>{comment.userName ?? comment.authorName ?? "Guest reader"}</strong>
                <small>
                  {comment.authorEmail ?? "Registered account"} · {new Date(comment.createdAt).toLocaleString()}
                </small>
              </div>
              <span className={`admin-status ${comment.status.toLowerCase()}`}>
                {humanize(comment.status)}
              </span>
            </div>
            <blockquote>{comment.body}</blockquote>
            <div className="admin-comment-foot">
              <a href={`/articles/${comment.articleSlug}`} target="_blank">On: {comment.articleTitle}</a>
              <form action={moderateComment.bind(null, comment.id)}>
                <select name="status" defaultValue={comment.status}>
                  {commentStatusValues.map((value) => <option key={value}>{value}</option>)}
                </select>
                <SubmitButton>Apply</SubmitButton>
              </form>
            </div>
          </article>
        ))}
      </section>

      {rows.length === 0 ? <p className="admin-empty admin-card">No comments match this view.</p> : null}

      <nav className="admin-pagination" aria-label="Comment pages">
        <Link
          aria-disabled={page <= 1}
          href={commentsPageHref({ q, post, user, status, from, to }, Math.max(1, page - 1))}
        >
          Previous
        </Link>
        <span>Showing {firstResult}-{lastResult} of {total.toLocaleString()} · Page {page} of {totalPages}</span>
        <Link
          aria-disabled={page >= totalPages}
          href={commentsPageHref({ q, post, user, status, from, to }, page + 1)}
        >
          Next
        </Link>
      </nav>
    </>
  );
}
