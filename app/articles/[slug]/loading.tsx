import Link from "next/link";

import BrandLogo from "@/components/brand-logo";

export default function ArticlesLoading() {
  return (
    <main className="article-site">
      <header className="article-masthead">
        <Link href="/" className="article-brand" aria-label="HERITAGE VOICE NEWS home">
          <BrandLogo className="article-logo-normal" />
        </Link>
        <nav aria-label="Article navigation" />
      </header>
      <div className="article-loading">
        <span className="route-spinner" aria-hidden="true" />
        <p>Loading article…</p>
      </div>
    </main>
  );
}
