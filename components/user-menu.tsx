import { UserRound } from "lucide-react";
import Link from "next/link";

import { getSession } from "@/src/session";

type UserMenuProps = {
  size?: number;
};

export default async function UserMenu({ size = 18 }: UserMenuProps) {
  const session = await getSession();
  const user = session?.user;

  if (!user?.email) {
    return (
      <Link href="/login" aria-label="Sign in" title="Sign in">
        <UserRound size={size} />
      </Link>
    );
  }

  const displayName = user.name ?? user.email;
  const firstName = displayName.split(" ")[0];
  const canManageAds =
    user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "EDITOR";

  return (
    <details className="user-menu">
      <summary aria-label={`Signed in as ${displayName}`}>
        <UserRound size={size} />
        <span className="user-menu-name">{firstName}</span>
      </summary>
      <div className="user-menu-dropdown">
        <span>{displayName}</span>
        {canManageAds ? <Link href="/admin/ads">Manage ads</Link> : null}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- sign-out is an API route, not an app page */}
        <a href="/api/auth/signout">Sign out</a>
      </div>
    </details>
  );
}
