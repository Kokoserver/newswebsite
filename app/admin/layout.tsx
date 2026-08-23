import AdminShell from "@/components/admin/admin-shell";
import { hasPermission, requireAdminUser, type AdminPermission } from "@/src/admin/permissions";

export const dynamic = "force-dynamic";

const allPermissions: AdminPermission[] = [
  "dashboard:view", "articles:view", "articles:create", "articles:edit-all", "articles:publish",
  "media:view", "media:upload", "media:manage", "homepage:manage", "taxonomy:manage",
  "comments:moderate", "ads:manage", "users:manage", "subscribers:manage", "analytics:view", "audit:view",
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser();
  const permissions = allPermissions.filter((permission) => hasPermission(user.role, permission));
  return <AdminShell user={user} permissions={permissions}>{children}</AdminShell>;
}
