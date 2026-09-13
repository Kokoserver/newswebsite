import { Home } from "lucide-react";
import Link from "next/link";

import BrandLogo from "@/components/brand-logo";

export default async function NewsletterUnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const invalid = status === "invalid";

  return (
    <main className="status-page status-page-error">
      <header className="status-header"><Link className="status-brand" href="/" aria-label="THE WORLD CURRENT home"><BrandLogo /></Link><span className="status-edition">Newsletter preferences</span></header>
      <section className="status-stage">
        <div className="status-copy">
          <span className="status-kicker">Audience update</span>
          <h1>{invalid ? "This link is not valid." : "You have been unsubscribed."}</h1>
          <p>{invalid ? "The unsubscribe link may be incomplete. Contact the newsroom if you still need assistance." : "You will no longer receive newsletter campaigns from THE WORLD CURRENT."}</p>
          <div className="status-actions"><Link className="status-action primary" href="/"><Home size={17} />Return home</Link></div>
        </div>
        <div className="status-visual status-error-visual" aria-hidden="true"><div className="status-error-code">MAIL</div><div className="status-breaking-label">Preferences updated</div></div>
      </section>
      <footer className="status-footer"><span>THE WORLD CURRENT</span><p>Global reporting, delivered responsibly.</p></footer>
    </main>
  );
}
