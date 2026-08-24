import { Home } from "lucide-react";
import Link from "next/link";

export default async function NewsletterUnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const invalid = status === "invalid";

  return (
    <main className="status-page status-page-error">
      <header className="status-header"><Link className="status-brand" href="/" aria-label="Daily Chronicle home"><span>Daily</span> Chronicle</Link><span className="status-edition">Newsletter preferences</span></header>
      <section className="status-stage">
        <div className="status-copy">
          <span className="status-kicker">Audience update</span>
          <h1>{invalid ? "This link is not valid." : "You have been unsubscribed."}</h1>
          <p>{invalid ? "The unsubscribe link may be incomplete. Contact the newsroom if you still need assistance." : "You will no longer receive newsletter campaigns from Daily Chronicle."}</p>
          <div className="status-actions"><Link className="status-action primary" href="/"><Home size={17} />Return home</Link></div>
        </div>
        <div className="status-visual status-error-visual" aria-hidden="true"><div className="status-error-code">MAIL</div><div className="status-breaking-label">Preferences updated</div></div>
      </section>
      <footer className="status-footer"><span>Daily Chronicle</span><p>Independent reporting, delivered responsibly.</p></footer>
    </main>
  );
}
