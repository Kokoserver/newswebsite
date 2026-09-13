import type { UserRole } from "@/src/db/schema/users";

export type AdminPermission =
  | "dashboard:view"
  | "articles:view"
  | "articles:create"
  | "articles:edit-all"
  | "articles:publish"
  | "media:view"
  | "media:upload"
  | "media:manage"
  | "homepage:manage"
  | "taxonomy:manage"
  | "comments:moderate"
  | "ads:manage"
  | "users:manage"
  | "subscribers:manage"
  | "analytics:view"
  | "audit:view";

const rolePermissions: Record<UserRole, readonly AdminPermission[]> = {
  SUPER_ADMIN: [
    "dashboard:view", "articles:view", "articles:create", "articles:edit-all",
    "articles:publish", "media:view", "media:upload", "media:manage",
    "homepage:manage", "taxonomy:manage", "comments:moderate", "ads:manage",
    "users:manage", "subscribers:manage", "analytics:view", "audit:view",
  ],
  ADMIN: [
    "dashboard:view", "articles:view", "articles:create", "articles:edit-all",
    "articles:publish", "media:view", "media:upload", "media:manage",
    "homepage:manage", "taxonomy:manage", "comments:moderate", "ads:manage",
    "users:manage", "subscribers:manage", "analytics:view", "audit:view",
  ],
  EDITOR: [
    "dashboard:view", "articles:view", "articles:create", "articles:edit-all",
    "articles:publish", "media:view", "media:upload", "media:manage",
    "homepage:manage", "taxonomy:manage", "comments:moderate", "ads:manage",
    "analytics:view",
  ],
  AUTHOR: ["articles:view", "articles:create", "media:view", "media:upload"],
  READER: [],
};

export function hasPermission(role: UserRole, permission: AdminPermission) {
  return rolePermissions[role].includes(permission);
}
