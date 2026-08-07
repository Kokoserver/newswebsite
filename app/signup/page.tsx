import { Home, Search } from "lucide-react";
import Link from "next/link";

import SignupForm from "@/components/signup-form";
import UserMenu from "@/components/user-menu";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="route-page">
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

      <div className="route-kicker">Member</div>
      <h1>Create an account</h1>
      <p>Join Daily Chronicle to comment on stories and follow the conversation.</p>

      <div className="auth-card">
        <SignupForm />
      </div>

      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
