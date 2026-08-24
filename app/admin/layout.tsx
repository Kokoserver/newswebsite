import AdminShell from "@/components/admin/admin-shell";
import { hasPermission, requireAdminUser, type AdminPermission } from "@/src/admin/permissions";
import { getSession } from "@/src/session";

export const dynamic = "force-dynamic";

const allPermissions: AdminPermission[] = [
  "dashboard:view", "articles:view", "articles:create", "articles:edit-all", "articles:publish",
  "media:view", "media:upload", "media:manage", "homepage:manage", "taxonomy:manage",
  "comments:moderate", "ads:manage", "users:manage", "subscribers:manage", "analytics:view", "audit:view",
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, session] = await Promise.all([requireAdminUser(), getSession()]);
  const permissions = allPermissions.filter((permission) => hasPermission(user.role, permission));
  return (
    <AdminShell user={user} permissions={permissions} sessionExpiresAt={session!.expiresAt}>
      {children}
    </AdminShell>
  );
}
