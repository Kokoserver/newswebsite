import { asc } from "drizzle-orm";

import { getCurrentAdminUser, hasPermission } from "@/src/admin/permissions";
import { getDb } from "@/src/db";
import { auditLogs, newsletterSubscribers } from "@/src/db/schema";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
export async function GET() {
  const actor = await getCurrentAdminUser(); if (!actor) return new Response("Unauthorized", { status: 401 }); if (!hasPermission(actor.role, "subscribers:manage")) return new Response("Forbidden", { status: 403 });
  const db = await getDb(); const rows = await db.query.newsletterSubscribers.findMany({ orderBy: [asc(newsletterSubscribers.createdAt)] });
  const body = [["email", "status", "created_at", "confirmed_at", "unsubscribed_at"].map(csv).join(","), ...rows.map((item) => [item.email, item.status, item.createdAt.toISOString(), item.confirmedAt?.toISOString() ?? "", item.unsubscribedAt?.toISOString() ?? ""].map(csv).join(","))].join("\r\n");
  await db.insert(auditLogs).values({ actorId: actor.id, action: "CREATE", entityType: "subscriber_export", summary: `Exported ${rows.length} subscribers`, metadata: { count: rows.length } });
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="daily-chronicle-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
