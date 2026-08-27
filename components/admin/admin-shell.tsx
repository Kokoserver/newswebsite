"use client";

import {
  Activity, Ad, BookOpenText, ChartNoAxesCombined, ChevronLeft, ChevronRight,
  FileText, FolderTree, GalleryVerticalEnd, History, House, ImageIcon, Mail,
  Menu, MessageSquareText, Users, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import SessionExpiryGuard from "@/components/session-expiry-guard";
import type { AdminPermission, AdminUser } from "@/src/admin/permissions";

const items: Array<{ href: string; label: string; permission: AdminPermission; icon: typeof House }> = [
  { href: "/admin", label: "Overview", permission: "dashboard:view", icon: House },
  { href: "/admin/articles", label: "Articles", permission: "articles:view", icon: FileText },
  { href: "/admin/media", label: "Media", permission: "media:view", icon: ImageIcon },
  { href: "/admin/homepage", label: "Homepage", permission: "homepage:manage", icon: GalleryVerticalEnd },
  { href: "/admin/taxonomy", label: "Taxonomy", permission: "taxonomy:manage", icon: FolderTree },
  { href: "/admin/comments", label: "Comments", permission: "comments:moderate", icon: MessageSquareText },
  { href: "/admin/ads", label: "Advertisements", permission: "ads:manage", icon: Ad },
  { href: "/admin/users", label: "Users", permission: "users:manage", icon: Users },
  { href: "/admin/subscribers", label: "Subscribers", permission: "subscribers:manage", icon: Mail },
  { href: "/admin/analytics", label: "Analytics", permission: "analytics:view", icon: ChartNoAxesCombined },
  { href: "/admin/audit", label: "Audit log", permission: "audit:view", icon: History },
];

export default function AdminShell({
  children,
  user,
  permissions,
  sessionExpiresAt,
}: {
  children: React.ReactNode;
  user: AdminUser;
  permissions: AdminPermission[];
  sessionExpiresAt: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const visibleItems = items.filter((item) => permissions.includes(item.permission));

  useEffect(() => {
    const id = window.setTimeout(() => setPending(null), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const handleNav = (href: string) => {
    setOpen(false);
    if (href === pathname || (href !== "/admin" && pathname.startsWith(href))) {
      return;
    }
    setPending(href);
  };

  return (
    <div className={`admin-app${compact ? " is-compact" : ""}`}>
      <SessionExpiryGuard expiresAt={sessionExpiresAt} />
      <div className={pending ? "admin-progress is-visible" : "admin-progress"} aria-hidden="true" />
      <aside className={`admin-sidebar${open ? " is-open" : ""}`}>
        <div className="admin-sidebar-brand">
          <span className="admin-brand-mark"><BookOpenText size={19} /></span>
          <span className="admin-brand-copy"><strong>THE WORLD CURRENT</strong><small>Newsroom control</small></span>
          <button className="admin-mobile-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="admin-nav" aria-label="Administration">
          {visibleItems.map((item) => {
            const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                href={item.href}
                key={item.href}
                className={`${active ? "is-active" : ""}${pending === item.href ? " is-pending" : ""}`}
                onClick={() => handleNav(item.href)}
                title={item.label}
              >
                <span className="admin-nav-icon">{pending === item.href ? <span className="admin-nav-spinner" aria-hidden="true" /> : <item.icon size={18} />}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user-avatar">{(user.name ?? user.email).slice(0, 2).toUpperCase()}</div>
          <div><strong>{user.name ?? "Staff member"}</strong><small>{user.role.replaceAll("_", " ")}</small></div>
          <button onClick={() => setCompact((value) => !value)} aria-label="Toggle compact sidebar">
            {compact ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>
      </aside>
      {open ? <button className="admin-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" /> : null}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="admin-topbar-status"><Activity size={16} /><span>Newsroom live</span></div>
          <div className="admin-topbar-actions">
            <Link href="/" target="_blank">View publication</Link>
            <Link href="/latest">Latest</Link>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
