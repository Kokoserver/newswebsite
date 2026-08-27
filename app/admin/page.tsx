import { Suspense } from "react";
import { desc, eq, gte, isNull, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { ArrowUpRight, Clock3, FileText, Megaphone, MessageSquareText, Users } from "lucide-react";
import Link from "next/link";

import { requireAdminUser } from "@/src/admin/permissions";
import { getDb } from "@/src/db";
import { advertisements, articles, auditLogs, comments, newsletterSubscribers, users } from "@/src/db/schema";

const loadDashboardStatsCached = unstable_cache(
  async () => {
    const db = await getDb();
    return Promise.all([
      db.select({ status: articles.status, count: sql<number>`count(*)` }).from(articles).where(isNull(articles.deletedAt)).groupBy(articles.status),
      db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.status, "PENDING")),
      db.select({ count: sql<number>`count(*)` }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "ACTIVE")),
    ]);
  },
  ["admin-dashboard-stats"],
  { revalidate: 60, tags: ["articles", "comments", "subscribers"] },
);

const loadRecentArticlesCached = unstable_cache(
  async () => {
    const db = await getDb();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return db.query.articles.findMany({
      columns: { id: true, title: true, status: true, updatedAt: true, slug: true },
      where: gte(articles.updatedAt, weekAgo),
      orderBy: [desc(articles.updatedAt)],
      limit: 6,
    });
  },
  ["admin-dashboard-recent-articles"],
  { revalidate: 60, tags: ["articles"] },
);

const loadRecentAuditCached = unstable_cache(
  async () => {
    const db = await getDb();
    return db.query.auditLogs.findMany({
      columns: { id: true, action: true, summary: true, entityType: true, createdAt: true },
      orderBy: [desc(auditLogs.createdAt)],
      limit: 7,
    });
  },
  ["admin-dashboard-recent-audit"],
  { revalidate: 60, tags: ["audit"] },
);

const loadQuickStripCached = unstable_cache(
  async () => {
    const db = await getDb();
    return Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(advertisements).where(eq(advertisements.status, "ACTIVE")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.status, "ACTIVE")),
    ]);
  },
  ["admin-dashboard-quick-strip"],
  { revalidate: 60, tags: ["ads", "users"] },
);

async function DashboardStats() {
  const [articleCounts, pendingComments, subscribers] = await loadDashboardStatsCached();
  const count = (status: string) => Number(articleCounts.find((item) => item.status === status)?.count ?? 0);
  const stats = [
    { label: "Published", value: count("PUBLISHED"), note: "Live stories", icon: FileText, href: "/admin/articles?status=PUBLISHED", tone: "blue" },
    { label: "In review", value: count("IN_REVIEW"), note: "Awaiting editors", icon: Clock3, href: "/admin/articles?status=IN_REVIEW", tone: "amber" },
    { label: "Pending comments", value: Number(pendingComments[0]?.count ?? 0), note: "Need moderation", icon: MessageSquareText, href: "/admin/comments?status=PENDING", tone: "red" },
    { label: "Active subscribers", value: Number(subscribers[0]?.count ?? 0), note: "Newsletter audience", icon: Users, href: "/admin/subscribers", tone: "green" },
  ];
  return (
    <section className="admin-stat-grid">
      {stats.map((stat) => (
        <Link href={stat.href} className={`admin-stat-card ${stat.tone}`} key={stat.label}>
          <div>
            <span>{stat.label}</span>
            <strong>{stat.value.toLocaleString()}</strong>
            <small>{stat.note}</small>
          </div>
          <stat.icon size={22} />
        </Link>
      ))}
    </section>
  );
}

async function RecentArticles() {
  const recentArticles = await loadRecentArticlesCached();
  return (
    <div className="admin-card">
      <div className="admin-section-heading">
        <div>
          <span className="admin-eyebrow">Editorial desk</span>
          <h2>Recently updated</h2>
        </div>
        <Link href="/admin/articles">All articles</Link>
      </div>
      <div className="admin-row-list">
        {recentArticles.map((article) => (
          <Link href={`/admin/articles/${article.id}`} key={article.id}>
            <div>
              <strong>{article.title}</strong>
              <small>{new Date(article.updatedAt).toLocaleString()}</small>
            </div>
            <span className={`admin-status ${article.status.toLowerCase()}`}>{article.status.replaceAll("_", " ")}</span>
          </Link>
        ))}
        {recentArticles.length === 0 ? <p className="admin-empty">No articles changed this week.</p> : null}
      </div>
    </div>
  );
}

async function RecentAudit() {
  const recentAudit = await loadRecentAuditCached();
  return (
    <div className="admin-card">
      <div className="admin-section-heading">
        <div>
          <span className="admin-eyebrow">Activity</span>
          <h2>Latest actions</h2>
        </div>
        <Link href="/admin/audit">Full log</Link>
      </div>
      <div className="admin-timeline">
        {recentAudit.map((entry) => (
          <div key={entry.id}>
            <span />
            <div>
              <strong>{entry.summary ?? `${entry.action} ${entry.entityType}`}</strong>
              <small>{new Date(entry.createdAt).toLocaleString()}</small>
            </div>
          </div>
        ))}
        {recentAudit.length === 0 ? <p className="admin-empty">No staff activity recorded.</p> : null}
      </div>
    </div>
  );
}

async function QuickStrip() {
  const [activeAds, staff] = await loadQuickStripCached();
  return (
    <section className="admin-quick-strip">
      <div>
        <Megaphone size={19} />
        <span><strong>{Number(activeAds[0]?.count ?? 0)}</strong> active ads</span>
      </div>
      <div>
        <Users size={19} />
        <span><strong>{Number(staff[0]?.count ?? 0)}</strong> active accounts</span>
      </div>
      <Link href="/admin/analytics">Open audience analytics <ArrowUpRight size={16} /></Link>
    </section>
  );
}

export default async function AdminDashboardPage() {
  await requireAdminUser("dashboard:view");
  return (
    <>
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Command center</span>
          <h1>Newsroom overview</h1>
          <p>Publishing, audience and operational signals in one place.</p>
        </div>
        <Link className="admin-button" href="/admin/articles/new">Create article <ArrowUpRight size={17} /></Link>
      </header>

      <Suspense fallback={<div className="admin-skeleton-stats" aria-hidden="true"><div className="admin-skeleton" /><div className="admin-skeleton" /><div className="admin-skeleton" /><div className="admin-skeleton" /></div>}>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={<div className="admin-skeleton-dashboard" aria-hidden="true"><div className="admin-skeleton" /><div className="admin-skeleton" /></div>}>
        <div className="admin-dashboard-grid">
          <RecentArticles />
          <RecentAudit />
        </div>
      </Suspense>

      <Suspense fallback={<div className="admin-skeleton admin-skeleton-strip" aria-hidden="true" />}>
        <QuickStrip />
      </Suspense>
    </>
  );
}
