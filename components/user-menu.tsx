"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import SessionExpiryGuard from "@/components/session-expiry-guard";

type UserMenuProps = { size?: number };

type BrowserSession = {
  expires?: string;
  user?: { email?: string | null; name?: string | null; role?: string };
};

export default function UserMenu({ size = 18 }: UserMenuProps) {
  const [session, setSession] = useState<BrowserSession | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => setSession(value))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const user = session?.user;
  if (!user?.email) {
    return <Link href="/login" aria-label="Sign in" title="Sign in"><UserRound size={size} /></Link>;
  }

  const displayName = user.name ?? user.email;
  const firstName = displayName.split(" ")[0];
  const canViewDashboard = ["SUPER_ADMIN", "ADMIN", "EDITOR"].includes(user.role ?? "");
  const expiresAt = session?.expires ? new Date(session.expires).getTime() : Number.NaN;

  return <>
    {Number.isFinite(expiresAt) ? <SessionExpiryGuard expiresAt={expiresAt} /> : null}
    <details className="user-menu">
      <summary aria-label={`Signed in as ${displayName}`}><UserRound size={size} /><span className="user-menu-name">{firstName}</span></summary>
      <div className="user-menu-dropdown">
        <span>{displayName}</span>
        {canViewDashboard ? <Link href="/admin">Dashboard</Link> : null}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- sign-out is an API route */}
        <a href="/api/auth/signout">Sign out</a>
      </div>
    </details>
  </>;
}
