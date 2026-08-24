import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Copy, Search, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";

import InfoTooltip from "@/components/admin/info-tooltip";
import { SubmitButton } from "@/components/admin/submit-button";
import { inviteUser, issueSetupLink, updateUser } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { userRoleValues, users, userStatusValues } from "@/src/db/schema";

const pageSize = 15;

type SearchParams = {
  invite?: string;
  existing?: string;
  q?: string;
  role?: string;
  status?: string;
  page?: string;
};

function usersPageHref(q: string, role: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return `/admin/users?${params}`;
}

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireAdminUser("users:manage");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 120) ?? "";
  const role = userRoleValues.includes(params.role as (typeof userRoleValues)[number])
    ? params.role as (typeof userRoleValues)[number]
    : "";
  const status = userStatusValues.includes(params.status as (typeof userStatusValues)[number])
    ? params.status as (typeof userStatusValues)[number]
    : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where = and(
    q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined,
    role ? eq(users.role, role) : undefined,
    status ? eq(users.status, status) : undefined,
  );
  const db = await getDb();
  const [rows, totalRows] = await Promise.all([
    db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      where,
      orderBy: [desc(users.createdAt), asc(users.name)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ count: sql<number>`cast(count(*) as integer)` }).from(users).where(where),
  ]);
  const total = Number(totalRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstResult = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);
  const assignableRoles = actor.role === "SUPER_ADMIN"
    ? userRoleValues
    : userRoleValues.filter((value) => value !== "SUPER_ADMIN");

  return (
    <>
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Access control</span>
          <h1>Users & staff</h1>
          <p>Invite staff, assign responsibilities, and revoke access immediately.</p>
        </div>
      </header>

      {params.invite ? (
        <div className="admin-invite-banner">
          <div>
            <UserPlus size={20} />
            <span><strong>One-time setup link created</strong><small>Share this securely. It expires automatically.</small></span>
          </div>
          <code>{params.invite}</code>
          <button type="button" title="Select and copy the link manually"><Copy size={16} />Copy link</button>
        </div>
      ) : null}

      {params.existing ? (
        <div className="admin-existing-account-banner">
          <UserCheck size={20} />
          <span>
            <strong>This email already has an account.</strong>
            <small>Update the role and status in the account shown below; no invitation is required.</small>
          </span>
        </div>
      ) : null}

      <section className="admin-card admin-form-section">
        <div className="admin-section-heading">
          <div><span className="admin-eyebrow">New account</span><h2>Invite staff member <InfoTooltip text="Use this only for a new email address. If the person already registered as a reader, find their account below and change its role instead." /></h2></div>
        </div>
        <p className="admin-form-note">
          Use invitations only for new accounts. To promote a registered reader, search for their account below and change its role.
        </p>
        <form action={inviteUser} className="admin-form-grid four">
          <label>Name<input name="name" minLength={2} required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>
            Role
            <select name="role" defaultValue="AUTHOR">
              {assignableRoles.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </label>
          <SubmitButton>Create invitation</SubmitButton>
        </form>
      </section>

      <form className="admin-filter-bar admin-user-filter-bar">
        <label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search name or email" /></label>
        <select name="role" defaultValue={role} aria-label="Filter by role">
          <option value="">All roles</option>
          {userRoleValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
        </select>
        <select name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option>
          {userStatusValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
        </select>
        <button type="submit">Filter</button>
        <span>{total.toLocaleString()} accounts</span>
      </form>

      <section className="admin-user-list">
        {rows.map((user) => {
          const protectedUser = user.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN";
          const rowRoles = protectedUser ? userRoleValues : assignableRoles;

          return (
            <article className="admin-card admin-user-row" key={user.id}>
              <div className="admin-user-identity">
                <div className="admin-user-avatar">{(user.name ?? user.email).slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{user.name ?? "Unnamed account"}</strong>
                  <span>{user.email}</span>
                  <small>Created {new Date(user.createdAt).toLocaleDateString()}</small>
                </div>
              </div>
              <form action={updateUser.bind(null, user.id)} className="admin-form-grid user">
                <label>Name<input name="name" defaultValue={user.name ?? ""} disabled={protectedUser} /></label>
                <label>
                  Role
                  <select name="role" defaultValue={user.role} disabled={protectedUser}>
                    {rowRoles.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                  </select>
                  {protectedUser ? <input type="hidden" name="role" value={user.role} /> : null}
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={user.status} disabled={protectedUser}>
                    {userStatusValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                  </select>
                  {protectedUser ? <input type="hidden" name="status" value={user.status} /> : null}
                </label>
                <SubmitButton>Save account</SubmitButton>
              </form>
              <form action={issueSetupLink.bind(null, user.id)}>
                <SubmitButton>Password link</SubmitButton>
              </form>
            </article>
          );
        })}
      </section>

      {rows.length === 0 ? <p className="admin-empty admin-card">No accounts match these filters.</p> : null}

      <nav className="admin-pagination" aria-label="User pages">
        <Link
          aria-disabled={page <= 1}
          href={usersPageHref(q, role, status, Math.max(1, page - 1))}
        >
          Previous
        </Link>
        <span>Showing {firstResult}-{lastResult} of {total.toLocaleString()} · Page {page} of {totalPages}</span>
        <Link
          aria-disabled={page >= totalPages}
          href={usersPageHref(q, role, status, page + 1)}
        >
          Next
        </Link>
      </nav>
    </>
  );
}
