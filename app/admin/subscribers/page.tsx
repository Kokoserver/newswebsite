import { desc, eq, like } from "drizzle-orm";
import { Download, Search } from "lucide-react";
import Link from "next/link";

import { SubmitButton } from "@/components/admin/submit-button";
import { deleteSubscriber, updateSubscriber } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { newsletterSubscribers, newsletterSubscriberStatusValues } from "@/src/db/schema";

export default async function SubscribersAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdminUser("subscribers:manage"); const { q = "", status = "" } = await searchParams; const db = await getDb();
  const filter = status && newsletterSubscriberStatusValues.includes(status as typeof newsletterSubscriberStatusValues[number]) ? eq(newsletterSubscribers.status, status as typeof newsletterSubscribers.$inferSelect.status) : q ? like(newsletterSubscribers.email, `%${q}%`) : undefined;
  const rows = await db.query.newsletterSubscribers.findMany({ where: filter, orderBy: [desc(newsletterSubscribers.createdAt)], limit: 200 });
  return <><header className="admin-page-header"><div><span className="admin-eyebrow">Audience</span><h1>Newsletter subscribers</h1><p>Manage consent status and export the current audience list.</p></div><Link className="admin-button" href="/api/admin/subscribers/export"><Download size={17} />Export CSV</Link></header><form className="admin-filter-bar"><label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search email" /></label><select name="status" defaultValue={status}><option value="">All statuses</option>{newsletterSubscriberStatusValues.map((value) => <option key={value}>{value}</option>)}</select><button>Filter</button><span>{rows.length} subscribers</span></form><section className="admin-card admin-table-wrap"><table className="admin-table"><thead><tr><th>Email</th><th>Joined</th><th>Confirmed</th><th>Status</th><th /></tr></thead><tbody>{rows.map((subscriber) => <tr key={subscriber.id}><td><strong>{subscriber.email}</strong></td><td>{new Date(subscriber.createdAt).toLocaleDateString()}</td><td>{subscriber.confirmedAt ? new Date(subscriber.confirmedAt).toLocaleDateString() : "—"}</td><td><form action={updateSubscriber.bind(null, subscriber.id)} className="admin-table-action"><select name="status" defaultValue={subscriber.status}>{newsletterSubscriberStatusValues.map((value) => <option key={value}>{humanize(value)}</option>)}</select><SubmitButton>Save</SubmitButton></form></td><td><form action={deleteSubscriber.bind(null, subscriber.id)}><SubmitButton danger>Delete</SubmitButton></form></td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-empty">No subscribers match this view.</p> : null}</section></>;
}
