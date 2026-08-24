import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { Download, MailWarning, Search, Send } from "lucide-react";
import Link from "next/link";

import InfoTooltip from "@/components/admin/info-tooltip";
import { SubmitButton } from "@/components/admin/submit-button";
import { createNewsletterCampaign } from "@/src/admin/newsletter-actions";
import { deleteSubscriber, updateSubscriber } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { newsletterCampaigns, newsletterSubscribers, newsletterSubscriberStatusValues } from "@/src/db/schema";
import { emailConfigured } from "@/src/email";

const pageSize = 20;

type SearchParams = { q?: string; status?: string; page?: string; campaign?: string };

function subscribersPageHref(q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return `/admin/subscribers?${params}`;
}

export default async function SubscribersAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminUser("subscribers:manage");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 160) ?? "";
  const requestedStatus = params.status?.trim() ?? "";
  const status = newsletterSubscriberStatusValues.includes(requestedStatus as (typeof newsletterSubscriberStatusValues)[number])
    ? requestedStatus as (typeof newsletterSubscriberStatusValues)[number]
    : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where = and(q ? ilike(newsletterSubscribers.email, `%${q}%`) : undefined, status ? eq(newsletterSubscribers.status, status) : undefined);
  const db = await getDb();
  const [rows, totalRows, activeRows, campaigns] = await Promise.all([
    db.query.newsletterSubscribers.findMany({ where, orderBy: [desc(newsletterSubscribers.createdAt), desc(newsletterSubscribers.id)], limit: pageSize, offset: (page - 1) * pageSize }),
    db.select({ count: sql<number>`cast(count(*) as integer)` }).from(newsletterSubscribers).where(where),
    db.select({ count: sql<number>`cast(count(*) as integer)` }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "ACTIVE")),
    db.query.newsletterCampaigns.findMany({ orderBy: [desc(newsletterCampaigns.createdAt)], limit: 5, with: { createdBy: { columns: { name: true, email: true } } } }),
  ]);
  const total = Number(totalRows[0]?.count ?? 0);
  const activeTotal = Number(activeRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstResult = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);

  return (
    <>
      <header className="admin-page-header">
        <div><span className="admin-eyebrow">Audience</span><h1>Newsletter</h1><p>Send publication updates and manage the audience that has consented to receive them.</p></div>
        <Link className="admin-button" href="/api/admin/subscribers/export"><Download size={17} />Export CSV</Link>
      </header>

      {params.campaign === "queued" ? <p className="admin-toast">The campaign is queued for delivery. Refresh this page to see its final result.</p> : null}
      {!emailConfigured() ? (
        <div className="admin-mail-warning"><MailWarning size={20} /><div><strong>Email delivery is not configured</strong><span>Add the SMTP environment variables before sending password resets or newsletters.</span></div></div>
      ) : null}

      <section className="admin-newsletter-grid">
        <form action={createNewsletterCampaign} className="admin-card admin-newsletter-compose">
          <div className="admin-section-heading">
            <div><span className="admin-eyebrow">New campaign</span><h2>Compose newsletter <InfoTooltip text="The campaign is sent only to subscribers currently marked Active. Every email includes a signed unsubscribe link." /></h2></div>
            <span>{activeTotal.toLocaleString()} active recipients</span>
          </div>
          <div className="admin-form-grid two">
            <label>Subject<input name="subject" required minLength={5} maxLength={160} placeholder="This week at the Daily Chronicle" /></label>
            <label>Preview text<input name="previewText" maxLength={240} placeholder="A short summary shown by email clients" /></label>
            <label className="span-two">Message<textarea name="content" required minLength={10} maxLength={10_000} rows={8} placeholder="Write the newsletter message in plain text. Paragraph spacing is preserved." /></label>
            <label className="span-two">Featured article URL<input name="articleUrl" type="url" maxLength={2_000} placeholder="https://example.com/articles/featured-story" /></label>
          </div>
          <div className="admin-newsletter-submit"><span>Delivery results are recorded per subscriber.</span><SubmitButton><Send size={16} />Queue newsletter</SubmitButton></div>
        </form>

        <aside className="admin-card admin-campaign-history">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Delivery</span><h2>Recent campaigns</h2></div></div>
          {campaigns.map((campaign) => (
            <article key={campaign.id}>
              <div><strong>{campaign.subject}</strong><small>{new Date(campaign.createdAt).toLocaleString()} by {campaign.createdBy?.name ?? campaign.createdBy?.email ?? "Unknown staff"}</small></div>
              <span className={`admin-status ${campaign.status.toLowerCase()}`}>{humanize(campaign.status)}</span>
              <p>{campaign.deliveredCount.toLocaleString()} delivered <span>/</span> {campaign.failedCount.toLocaleString()} failed</p>
            </article>
          ))}
          {campaigns.length === 0 ? <p className="admin-empty">No newsletter campaigns have been sent.</p> : null}
        </aside>
      </section>

      <div className="admin-homepage-list-heading"><div><span className="admin-eyebrow">Directory</span><h2>Subscribers</h2></div><span>{total.toLocaleString()} matching records</span></div>
      <form className="admin-filter-bar">
        <label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search email" /></label>
        <select name="status" defaultValue={status}><option value="">All statuses</option>{newsletterSubscriberStatusValues.map((value) => <option key={value}>{value}</option>)}</select>
        <button>Filter</button>
      </form>

      <section className="admin-card admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Joined</th><th>Confirmed</th><th>Status</th><th /></tr></thead>
          <tbody>{rows.map((subscriber) => (
            <tr key={subscriber.id}>
              <td><strong>{subscriber.email}</strong></td><td>{new Date(subscriber.createdAt).toLocaleDateString()}</td><td>{subscriber.confirmedAt ? new Date(subscriber.confirmedAt).toLocaleDateString() : "-"}</td>
              <td><form action={updateSubscriber.bind(null, subscriber.id)} className="admin-table-action"><select name="status" defaultValue={subscriber.status}>{newsletterSubscriberStatusValues.map((value) => <option key={value}>{humanize(value)}</option>)}</select><SubmitButton>Save</SubmitButton></form></td>
              <td><form action={deleteSubscriber.bind(null, subscriber.id)}><SubmitButton danger>Delete</SubmitButton></form></td>
            </tr>
          ))}</tbody>
        </table>
        {rows.length === 0 ? <p className="admin-empty">No subscribers match this view.</p> : null}
      </section>

      <nav className="admin-pagination" aria-label="Newsletter subscriber pages">
        <Link aria-disabled={page <= 1} href={subscribersPageHref(q, status, Math.max(1, page - 1))}>Previous</Link>
        <span>Showing {firstResult}-{lastResult} of {total.toLocaleString()} | Page {page} of {totalPages}</span>
        <Link aria-disabled={page >= totalPages} href={subscribersPageHref(q, status, page + 1)}>Next</Link>
      </nav>
    </>
  );
}
