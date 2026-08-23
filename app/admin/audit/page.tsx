import { desc, eq, like, or } from "drizzle-orm";
import { Search } from "lucide-react";

import { requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { auditActionValues, auditLogs, users } from "@/src/db/schema";

export default async function AuditAdminPage({ searchParams }: { searchParams: Promise<{ action?: string; q?: string }> }) {
  await requireAdminUser("audit:view"); const { action = "", q = "" } = await searchParams; const db = await getDb();
  const filter = action && auditActionValues.includes(action as typeof auditActionValues[number]) ? eq(auditLogs.action, action as typeof auditLogs.$inferSelect.action) : q ? or(like(auditLogs.summary, `%${q}%`), like(auditLogs.entityType, `%${q}%`)) : undefined;
  const rows = await db.select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, summary: auditLogs.summary, metadata: auditLogs.metadata, createdAt: auditLogs.createdAt, actorName: users.name, actorEmail: users.email }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(filter).orderBy(desc(auditLogs.createdAt)).limit(250);
  return <><header className="admin-page-header"><div><span className="admin-eyebrow">Governance</span><h1>Audit log</h1><p>An immutable record of newsroom administrative changes.</p></div></header><form className="admin-filter-bar"><label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search activity" /></label><select name="action" defaultValue={action}><option value="">All actions</option>{auditActionValues.map((value) => <option key={value}>{value}</option>)}</select><button>Filter</button><span>{rows.length} entries</span></form><section className="admin-card admin-table-wrap"><table className="admin-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead><tbody>{rows.map((entry) => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString()}</td><td><strong>{entry.actorName ?? "System"}</strong><small>{entry.actorEmail}</small></td><td><span className="admin-status">{humanize(entry.action)}</span></td><td>{humanize(entry.entityType)}<small>{entry.entityId}</small></td><td>{entry.summary ?? "—"}</td></tr>)}</tbody></table>{rows.length === 0 ? <p className="admin-empty">No activity matches this view.</p> : null}</section></>;
}
