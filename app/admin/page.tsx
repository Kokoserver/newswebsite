import { desc, eq, gte, isNull, sql } from "drizzle-orm";
import { ArrowUpRight, Clock3, FileText, Megaphone, MessageSquareText, Users } from "lucide-react";
import Link from "next/link";

import { requireAdminUser } from "@/src/admin/permissions";
import { getDb } from "@/src/db";
import { advertisements, articles, auditLogs, comments, newsletterSubscribers, users } from "@/src/db/schema";

export default async function AdminDashboardPage() {
  await requireAdminUser("dashboard:view");
  const db = await getDb();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [articleCounts, pendingComments, subscribers, activeAds, staff, recentArticles, recentAudit] = await Promise.all([
    db.select({ status: articles.status, count: sql<number>`count(*)` }).from(articles).where(isNull(articles.deletedAt)).groupBy(articles.status),
    db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.status, "PENDING")),
    db.select({ count: sql<number>`count(*)` }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "ACTIVE")),
    db.select({ count: sql<number>`count(*)` }).from(advertisements).where(eq(advertisements.status, "ACTIVE")),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.status, "ACTIVE")),
    db.query.articles.findMany({ columns: { id: true, title: true, status: true, updatedAt: true, slug: true }, where: gte(articles.updatedAt, weekAgo), orderBy: [desc(articles.updatedAt)], limit: 6 }),
    db.query.auditLogs.findMany({ columns: { id: true, action: true, summary: true, entityType: true, createdAt: true }, orderBy: [desc(auditLogs.createdAt)], limit: 7 }),
  ]);
  const count = (status: string) => Number(articleCounts.find((item) => item.status === status)?.count ?? 0);
  const stats = [
    { label: "Published", value: count("PUBLISHED"), note: "Live stories", icon: FileText, href: "/admin/articles?status=PUBLISHED", tone: "blue" },
    { label: "In review", value: count("IN_REVIEW"), note: "Awaiting editors", icon: Clock3, href: "/admin/articles?status=IN_REVIEW", tone: "amber" },
    { label: "Pending comments", value: Number(pendingComments[0]?.count ?? 0), note: "Need moderation", icon: MessageSquareText, href: "/admin/comments?status=PENDING", tone: "red" },
    { label: "Active subscribers", value: Number(subscribers[0]?.count ?? 0), note: "Newsletter audience", icon: Users, href: "/admin/subscribers", tone: "green" },
  ];
  return (
    <>
      <header className="admin-page-header"><div><span className="admin-eyebrow">Command center</span><h1>Newsroom overview</h1><p>Publishing, audience and operational signals in one place.</p></div><Link className="admin-button" href="/admin/articles/new">Create article <ArrowUpRight size={17} /></Link></header>
      <section className="admin-stat-grid">{stats.map((stat) => <Link href={stat.href} className={`admin-stat-card ${stat.tone}`} key={stat.label}><div><span>{stat.label}</span><strong>{stat.value.toLocaleString()}</strong><small>{stat.note}</small></div><stat.icon size={22} /></Link>)}</section>
      <section className="admin-dashboard-grid">
        <div className="admin-card"><div className="admin-section-heading"><div><span className="admin-eyebrow">Editorial desk</span><h2>Recently updated</h2></div><Link href="/admin/articles">All articles</Link></div><div className="admin-row-list">{recentArticles.map((article) => <Link href={`/admin/articles/${article.id}`} key={article.id}><div><strong>{article.title}</strong><small>{new Date(article.updatedAt).toLocaleString()}</small></div><span className={`admin-status ${article.status.toLowerCase()}`}>{article.status.replaceAll("_", " ")}</span></Link>)}{recentArticles.length === 0 ? <p className="admin-empty">No articles changed this week.</p> : null}</div></div>
        <div className="admin-card"><div className="admin-section-heading"><div><span className="admin-eyebrow">Activity</span><h2>Latest actions</h2></div><Link href="/admin/audit">Full log</Link></div><div className="admin-timeline">{recentAudit.map((entry) => <div key={entry.id}><span /><div><strong>{entry.summary ?? `${entry.action} ${entry.entityType}`}</strong><small>{new Date(entry.createdAt).toLocaleString()}</small></div></div>)}{recentAudit.length === 0 ? <p className="admin-empty">No staff activity recorded.</p> : null}</div></div>
      </section>
      <section className="admin-quick-strip"><div><Megaphone size={19} /><span><strong>{Number(activeAds[0]?.count ?? 0)}</strong> active ads</span></div><div><Users size={19} /><span><strong>{Number(staff[0]?.count ?? 0)}</strong> active accounts</span></div><Link href="/admin/analytics">Open audience analytics <ArrowUpRight size={16} /></Link></section>
    </>
  );
}
