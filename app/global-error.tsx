"use client";

import { Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="status-page status-page-error">
          <header className="status-header">
            <Link className="status-brand" href="/" aria-label="Daily Chronicle home"><span>Daily</span> Chronicle</Link>
            <span className="status-edition">Digital edition · Service notice</span>
          </header>
          <section className="status-stage">
            <div className="status-copy">
              <span className="status-kicker">Temporary interruption</span>
              <h1>The edition could not be opened.</h1>
              <p>Retry the request, or return to the homepage while the service recovers.</p>
              <div className="status-actions">
                <button className="status-action primary" type="button" onClick={reset}><RefreshCw size={17} />Try again</button>
                <Link className="status-action secondary" href="/"><Home size={17} />Return home</Link>
              </div>
              {error.digest ? <small className="status-reference">Reference: {error.digest}</small> : null}
            </div>
            <div className="status-visual status-error-visual" aria-hidden="true">
              <div className="status-signal"><span /><span /><span /><span /><span /></div>
              <div className="status-error-code">500</div>
              <div className="status-breaking-label">Connection interrupted</div>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
