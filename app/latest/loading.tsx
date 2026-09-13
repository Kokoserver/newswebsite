import Link from "next/link";

import BrandLogo from "@/components/brand-logo";

export default function LatestLoading() {
  return (
    <main className="channel-page">
      <header className="channel-header">
        <Link href="/" className="channel-brand" aria-label="THE WORLD CURRENT home">
          <BrandLogo />
        </Link>
        <div className="channel-actions" />
      </header>
      <div className="channel-loading">
        <span className="route-spinner" aria-hidden="true" />
        <p>Loading latest news…</p>
      </div>
    </main>
  );
}
