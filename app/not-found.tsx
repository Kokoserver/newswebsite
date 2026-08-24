import { ArrowRight, Home, Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="status-page status-page-not-found">
      <header className="status-header">
        <Link className="status-brand" href="/" aria-label="Daily Chronicle home">
          <span>Daily</span> Chronicle
        </Link>
        <span className="status-edition">Digital edition · Page unavailable</span>
      </header>

      <section className="status-stage">
        <div className="status-copy">
          <span className="status-kicker">404 · Off the record</span>
          <h1>This page missed the deadline.</h1>
          <p>
            The address may be outdated, the story may have moved, or the page may no longer be published.
          </p>
          <div className="status-actions">
            <Link className="status-action primary" href="/"><Home size={17} />Return home</Link>
            <Link className="status-action secondary" href="/latest">Read the latest <ArrowRight size={17} /></Link>
          </div>
        </div>

        <div className="status-visual" aria-hidden="true">
          <div className="status-page-number">404</div>
          <div className="status-breaking-label">Story not found</div>
          <div className="status-column-lines"><span /><span /><span /><span /><span /></div>
        </div>
      </section>

      <footer className="status-footer">
        <span>Try another route</span>
        <Link href="/search"><Search size={14} />Search the Chronicle</Link>
        <Link href="/latest">Latest stories</Link>
      </footer>
    </main>
  );
}
