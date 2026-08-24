import { Home, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import LoginForm from "@/components/login-form";
import UserMenu from "@/components/user-menu";
import { getSession } from "@/src/session";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    reason?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawCallbackUrl = params?.callbackUrl;

  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";
  const signupUrl =
    callbackUrl === "/" ? "/signup" : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const session = await getSession();

  if (session?.user?.id || session?.user?.email) {
    redirect(callbackUrl);
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
          <div className="route-kicker">Member access</div>
          <h1>Sign in to join the conversation</h1>
          <p>
            Comment on stories, react to reader opinions, and return directly to
            the article you were reading.
          </p>
        </div>

        <div className="auth-card">
          <span className="auth-card-kicker">Daily Chronicle account</span>
          {params?.reason === "session-expired" ? (
            <p className="auth-notice">Your session expired. Sign in again to continue.</p>
          ) : null}
          <LoginForm callbackUrl={callbackUrl} />

          <p className="auth-switch">
            New here? <Link href={signupUrl}>Create an account</Link>
          </p>
        </div>
      </section>

      <section className="auth-benefits" aria-label="Account benefits">
        <article>
          <strong>Comment</strong>
          <span>Join reader discussions on every open story.</span>
        </article>
        <article>
          <strong>React</strong>
          <span>Like or dislike comments after signing in.</span>
        </article>
        <article>
          <strong>Return</strong>
          <span>Continue from the story section that brought you here.</span>
        </article>
      </section>
    </main>
  );
}
