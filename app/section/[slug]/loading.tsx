import Link from "next/link";

import BrandLogo from "@/components/brand-logo";

export default function SectionLoading() {
  return (
    <main className="channel-page">
      <header className="channel-header">
        <Link href="/" className="channel-brand" aria-label="HERITAGE VOICE NEWS home">
          <BrandLogo />
        </Link>
        <div className="channel-actions" />
      </header>
      <div className="channel-loading">
        <span className="route-spinner" aria-hidden="true" />
        <p>Loading section…</p>
      </div>
    </main>
  );
}
