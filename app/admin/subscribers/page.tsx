import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { Download, Search } from "lucide-react";
import Link from "next/link";

import { SubmitButton } from "@/components/admin/submit-button";
import { deleteSubscriber, updateSubscriber } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { newsletterSubscribers, newsletterSubscriberStatusValues } from "@/src/db/schema";

const pageSize = 20;

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
};

function subscribersPageHref(q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return `/admin/subscribers?${params}`;
}

export default async function SubscribersAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminUser("subscribers:manage");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 160) ?? "";
  const requestedStatus = params.status?.trim() ?? "";
  const status = newsletterSubscriberStatusValues.includes(
    requestedStatus as (typeof newsletterSubscriberStatusValues)[number],
  )
    ? requestedStatus as (typeof newsletterSubscriberStatusValues)[number]
    : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where = and(
    q ? ilike(newsletterSubscribers.email, `%${q}%`) : undefined,
    status ? eq(newsletterSubscribers.status, status) : undefined,
  );
  const db = await getDb();
  const [rows, totalRows] = await Promise.all([
    db.query.newsletterSubscribers.findMany({
      where,
      orderBy: [desc(newsletterSubscribers.createdAt), desc(newsletterSubscribers.id)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(newsletterSubscribers)
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
          <span className="admin-eyebrow">Audience</span>
          <h1>Newsletter subscribers</h1>
          <p>Manage consent status and export the current audience list.</p>
        </div>
        <Link className="admin-button" href="/api/admin/subscribers/export">
          <Download size={17} />Export CSV
        </Link>
      </header>

      <form className="admin-filter-bar">
        <label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search email" /></label>
        <select name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {newsletterSubscriberStatusValues.map((value) => <option key={value}>{value}</option>)}
        </select>
        <button>Filter</button>
        <span>{total.toLocaleString()} subscribers</span>
      </form>

      <section className="admin-card admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Joined</th><th>Confirmed</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((subscriber) => (
              <tr key={subscriber.id}>
                <td><strong>{subscriber.email}</strong></td>
                <td>{new Date(subscriber.createdAt).toLocaleDateString()}</td>
                <td>{subscriber.confirmedAt ? new Date(subscriber.confirmedAt).toLocaleDateString() : "-"}</td>
                <td>
                  <form action={updateSubscriber.bind(null, subscriber.id)} className="admin-table-action">
                    <select name="status" defaultValue={subscriber.status}>
                      {newsletterSubscriberStatusValues.map((value) => (
                        <option key={value}>{humanize(value)}</option>
                      ))}
                    </select>
                    <SubmitButton>Save</SubmitButton>
                  </form>
                </td>
                <td>
                  <form action={deleteSubscriber.bind(null, subscriber.id)}>
                    <SubmitButton danger>Delete</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="admin-empty">No subscribers match this view.</p> : null}
      </section>

      <nav className="admin-pagination" aria-label="Newsletter subscriber pages">
        <Link
          aria-disabled={page <= 1}
          href={subscribersPageHref(q, status, Math.max(1, page - 1))}
        >
          Previous
        </Link>
        <span>
          Showing {firstResult}-{lastResult} of {total.toLocaleString()} · Page {page} of {totalPages}
        </span>
        <Link
          aria-disabled={page >= totalPages}
          href={subscribersPageHref(q, status, page + 1)}
        >
          Next
        </Link>
      </nav>
    </>
  );
}
