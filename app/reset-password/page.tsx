import { Home, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import ResetPasswordForm from "@/components/reset-password-form";
import UserMenu from "@/components/user-menu";
import { getSession } from "@/src/session";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const [params, session] = await Promise.all([searchParams, getSession()]);
  const token = params?.token?.trim() ?? "";

  if (session?.user?.id || session?.user?.email) {
    redirect("/");
  }

  return (
    <main className="route-page auth-route-page">
      <header className="route-header">
        <Link href="/" className="route-brand">
          Daily Chronicle
        </Link>
        <div className="route-actions">
          <Link href="/search" aria-label="Search" title="Search">
            <Search size={16} />
          </Link>
          <Link href="/" aria-label="Home" title="Home">
            <Home size={16} />
          </Link>
          <UserMenu size={16} />
        </div>
      </header>

      <section className="auth-hero">
        <div className="auth-hero-copy">
          <div className="route-kicker">Account recovery</div>
          <h1>Choose a new password</h1>
          <p>
            Use a strong password with at least 8 characters. Reset links expire
            after one hour.
          </p>
        </div>

        <div className="auth-card">
          <span className="auth-card-kicker">Password reset</span>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="auth-notice">
              This reset link is missing a token. Please request a new password
              reset link.
            </p>
          )}

          <p className="auth-switch">
            Need a new link? <Link href="/forgot-password">Request reset</Link>
          </p>
        </div>
      </section>

      <section className="auth-benefits" aria-label="Password reset guidance">
        <article>
          <strong>One use</strong>
          <span>Each reset link works once, then expires immediately.</span>
        </article>
        <article>
          <strong>One hour</strong>
          <span>Expired links must be replaced from the recovery page.</span>
        </article>
        <article>
          <strong>Sign in</strong>
          <span>After resetting, sign in with your new password.</span>
        </article>
      </section>
    </main>
  );
}
