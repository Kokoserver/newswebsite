import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Search } from "lucide-react";
import Link from "next/link";

import { requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { auditActionValues, auditLogs, users } from "@/src/db/schema";

const pageSize = 25;

type SearchParams = {
  action?: string;
  q?: string;
  page?: string;
};

function auditPageHref(q: string, action: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (action) params.set("action", action);
  params.set("page", String(page));
  return `/admin/audit?${params}`;
}

export default async function AuditAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminUser("audit:view");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 160) ?? "";
  const requestedAction = params.action?.trim() ?? "";
  const action = auditActionValues.includes(
    requestedAction as (typeof auditActionValues)[number],
  )
    ? requestedAction as (typeof auditActionValues)[number]
    : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where = and(
    action ? eq(auditLogs.action, action) : undefined,
    q
      ? or(
          ilike(auditLogs.summary, `%${q}%`),
          ilike(auditLogs.entityType, `%${q}%`),
          ilike(users.name, `%${q}%`),
          ilike(users.email, `%${q}%`),
        )
      : undefined,
  );
  const db = await getDb();
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        summary: auditLogs.summary,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
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
          <span className="admin-eyebrow">Governance</span>
          <h1>Audit log</h1>
          <p>An immutable record of newsroom administrative changes.</p>
        </div>
      </header>

      <form className="admin-filter-bar">
        <label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search activity or actor" /></label>
        <select name="action" defaultValue={action}>
          <option value="">All actions</option>
          {auditActionValues.map((value) => <option key={value}>{value}</option>)}
        </select>
        <button>Filter</button>
        <span>{total.toLocaleString()} entries</span>
      </form>

      <section className="admin-card admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td><strong>{entry.actorName ?? "System"}</strong><small>{entry.actorEmail}</small></td>
                <td><span className="admin-status">{humanize(entry.action)}</span></td>
                <td>{humanize(entry.entityType)}<small>{entry.entityId}</small></td>
                <td>{entry.summary ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="admin-empty">No activity matches this view.</p> : null}
      </section>

      <nav className="admin-pagination" aria-label="Audit log pages">
        <Link
          aria-disabled={page <= 1}
          href={auditPageHref(q, action, Math.max(1, page - 1))}
        >
          Previous
        </Link>
        <span>
          Showing {firstResult}-{lastResult} of {total.toLocaleString()} · Page {page} of {totalPages}
        </span>
        <Link
          aria-disabled={page >= totalPages}
          href={auditPageHref(q, action, page + 1)}
        >
          Next
        </Link>
      </nav>
    </>
  );
}
