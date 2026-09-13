import { Home, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import BrandLogo from "@/components/brand-logo";
import ForgotPasswordForm from "@/components/forgot-password-form";
import UserMenu from "@/components/user-menu";
import { getSession } from "@/src/session";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const session = await getSession();

  if (session?.user?.id || session?.user?.email) {
    redirect("/");
  }

  return (
    <main className="route-page auth-route-page">
      <header className="route-header">
        <Link href="/" className="route-brand">
          <BrandLogo />
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
          <h1>Reset your password</h1>
          <p>
            Enter your account email and we will create a secure reset link for
            your THE WORLD CURRENT account.
          </p>
        </div>

        <div className="auth-card">
          <span className="auth-card-kicker">Password help</span>
          <ForgotPasswordForm />

          <p className="auth-switch">
            Remembered it? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>

      <section className="auth-benefits" aria-label="Password reset notes">
        <article>
          <strong>Secure</strong>
          <span>Reset links expire and can only be used once.</span>
        </article>
        <article>
          <strong>Private</strong>
          <span>We do not reveal whether an email is registered.</span>
        </article>
        <article>
          <strong>Fast</strong>
          <span>Use the link to set a new password and continue reading.</span>
        </article>
      </section>
    </main>
  );
}
