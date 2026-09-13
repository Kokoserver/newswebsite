import { Home, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import BrandLogo from "@/components/brand-logo";
import SignupForm from "@/components/signup-form";
import UserMenu from "@/components/user-menu";
import { getSession } from "@/src/session";

export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const rawCallbackUrl = params?.callbackUrl;
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";
  const loginUrl =
    callbackUrl === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const session = await getSession();

  if (session?.user?.id || session?.user?.email) {
    redirect(callbackUrl);
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
          <div className="route-kicker">Member access</div>
          <h1>Create your THE WORLD CURRENT account</h1>
          <p>
            Sign up to comment on stories, react to reader opinions, and continue
            directly from the article that brought you here.
          </p>
        </div>

        <div className="auth-card">
          <span className="auth-card-kicker">Reader profile</span>
          <SignupForm callbackUrl={callbackUrl} />

          <p className="auth-switch">
            Already have an account? <Link href={loginUrl}>Sign in</Link>
          </p>
        </div>
      </section>

      <section className="auth-benefits" aria-label="Account benefits">
        <article>
          <strong>Comment</strong>
          <span>Add your voice to stories with open discussion.</span>
        </article>
        <article>
          <strong>React</strong>
          <span>Like or dislike reader comments after joining.</span>
        </article>
        <article>
          <strong>Return</strong>
          <span>Go back to the exact story section after signup.</span>
        </article>
      </section>
    </main>
  );
}
