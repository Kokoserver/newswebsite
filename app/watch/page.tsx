import { Home, Play, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import BrandLogo from "@/components/brand-logo";
import UserMenu from "@/components/user-menu";
import { getVideoMedia } from "@/src/db/queries/media";

export const dynamic = "force-dynamic";

function fallbackImage(seed: string) {
  return `https://picsum.photos/seed/world-current-video-${seed}/1280/720`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

function formatDate(date: Date) {
  return dateTimeFormatter.format(date);
}

export default async function WatchPage() {
  const videos = await getVideoMedia(12);

  if (videos.length === 0) {
    notFound();
  }

  return (
    <main className="route-page">
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
      <div className="route-kicker">Video</div>
      <h1>Watch</h1>
      <p>
        Video briefings, interviews and packages from THE WORLD CURRENT newsroom.
      </p>
      <div className="watch-page-grid">
        {videos.map((video) => (
          <article key={video.id}>
            <Link
              className="watch-page-card"
              href={`/watch/${video.slug}`}
              aria-label={`Play ${video.title ?? "video"}`}
            >
              <Image
                src={video.posterUrl ?? fallbackImage(video.slug ?? video.id)}
                alt={video.altText ?? video.title ?? "Video"}
                width={1280}
                height={720}
                sizes="(max-width: 768px) 100vw, 640px"
              />
              <span className="watch-play" aria-hidden="true">
                <Play size={20} fill="currentColor" />
              </span>
              <h2>{video.title}</h2>
              <p>{video.caption ?? "A video package from THE WORLD CURRENT."}</p>
              <span>{formatDate(video.createdAt)}</span>
            </Link>
          </article>
        ))}
      </div>
      <Link href="/">Back to homepage</Link>
    </main>
  );
}
