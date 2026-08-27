import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDb } from "@/src/db";
import { users, type UserRole } from "@/src/db/schema";
import { getSession } from "@/src/session";
import { hasPermission, type AdminPermission } from "@/src/admin/access-policy";

export { hasPermission };
export type { AdminPermission };

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
};

export const getCurrentAdminUser = cache(async (): Promise<AdminUser | null> => {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const user = await loadAdminUser(session.user.id);
  if (!user || !hasPermission(user.role, "dashboard:view")) {
    return null;
  }

  return user;
});

const loadAdminUser = cache(async (userId: string): Promise<AdminUser | null> => {
  const db = await getDb();
  const user = await db.query.users.findFirst({
    columns: { id: true, name: true, email: true, role: true, status: true },
    where: eq(users.id, userId),
  });
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export async function requireAdminUser(permission: AdminPermission = "dashboard:view") {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");

  const user = await loadAdminUser(session.user.id);
  if (!user) redirect("/login");
  if (!hasPermission(user.role, permission)) redirect("/admin-denied");

  return user;
}

export async function requireArticleAccess(articleId: string) {
  const user = await requireAdminUser("articles:view");
  if (hasPermission(user.role, "articles:edit-all")) return user;

  const db = await getDb();
  const article = await db.query.articles.findFirst({
    columns: { authorId: true },
    where: (table, { eq: equals }) => equals(table.id, articleId),
  });
  if (!article || article.authorId !== user.id) redirect("/admin-denied");
  return user;
}
