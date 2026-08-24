import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { hasPermission, requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { articles, users } from "@/src/db/schema";

export default async function ArticlesAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const user = await requireAdminUser("articles:view");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 20;
  const filters = [isNull(articles.deletedAt)];
  if (!hasPermission(user.role, "articles:edit-all")) filters.push(eq(articles.authorId, user.id));
  if (q) filters.push(or(like(articles.title, `%${q}%`), like(articles.slug, `%${q}%`))!);
  if (status && ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(status)) filters.push(eq(articles.status, status as typeof articles.$inferSelect.status));
  const db = await getDb();
  const [rows, totalRows] = await Promise.all([
    db.select({ id: articles.id, title: articles.title, slug: articles.slug, status: articles.status, type: articles.type, updatedAt: articles.updatedAt, publishedAt: articles.publishedAt, views: articles.viewCount, authorName: users.name }).from(articles).leftJoin(users, eq(articles.authorId, users.id)).where(and(...filters)).orderBy(desc(articles.updatedAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(articles).where(and(...filters)),
  ]);
  const total = Number(totalRows[0]?.count ?? 0);
  return (
    <>
      <header className="admin-page-header"><div><span className="admin-eyebrow">Editorial</span><h1>Articles</h1><p>Draft, review, schedule and publish every story.</p></div><Link className="admin-button" href="/admin/articles/new"><Plus size={17} />New article</Link></header>
      <form className="admin-filter-bar"><label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search headline or slug" /></label><select name="status" defaultValue={status}><option value="">All statuses</option>{["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select><button type="submit">Filter</button><span>{total.toLocaleString()} results</span></form>
      <section className="admin-card admin-table-wrap"><table className="admin-table"><thead><tr><th>Story</th><th>Status</th><th>Author</th><th>Updated</th><th>Views</th><th /></tr></thead><tbody>{rows.map((article) => <tr key={article.id}><td><strong>{article.title}</strong><small>{humanize(article.type)} · /{article.slug}</small></td><td><span className={`admin-status ${article.status.toLowerCase()}`}>{humanize(article.status)}</span></td><td>{article.authorName ?? "Unknown"}</td><td>{new Date(article.updatedAt).toLocaleDateString()}</td><td>{article.views.toLocaleString()}</td><td><div className="admin-table-links"><Link href={`/admin/articles/${article.id}/details`}>Details</Link><Link href={`/admin/articles/${article.id}`}>Edit</Link></div></td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-empty">No articles match this view.</p> : null}</section>
      <nav className="admin-pagination" aria-label="Article pages"><Link aria-disabled={page <= 1} href={`/admin/articles?q=${encodeURIComponent(q)}&status=${status}&page=${Math.max(1, page - 1)}`}>Previous</Link><span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span><Link aria-disabled={page * pageSize >= total} href={`/admin/articles?q=${encodeURIComponent(q)}&status=${status}&page=${page + 1}`}>Next</Link></nav>
    </>
  );
}
