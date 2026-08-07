import { Home, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import UserMenu from "@/components/user-menu";
import VideoPlayer from "@/components/video-player";
import { getVideoBySlug, getVideoMedia } from "@/src/db/queries/media";

export const dynamic = "force-dynamic";

type WatchDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function fallbackImage(seed: string) {
  return `https://picsum.photos/seed/daily-chronicle-video-${seed}/1280/720`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

function formatDate(date: Date) {
  return dateTimeFormatter.format(date);
}

export default async function WatchDetailPage({ params }: WatchDetailPageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const [video, moreVideos] = await Promise.all([
    getVideoBySlug(slug),
    getVideoMedia(6),
  ]);

  if (!video) {
    notFound();
  }

  const related = moreVideos.filter((item) => item.id !== video.id).slice(0, 3);

  return (
    <main className="watch-detail">
      <header className="route-header watch-detail-header">
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
      <div className="watch-detail-player">
        <VideoPlayer
          src={video.publicUrl ?? fallbackImage(video.slug ?? video.id)}
          poster={video.posterUrl ?? fallbackImage(video.slug ?? video.id)}
          title={video.title}
          caption={video.caption}
        />
      </div>

      <div className="watch-detail-body">
        <div className="route-kicker">Video</div>
        <h1>{video.title}</h1>
        <p>{video.caption ?? "A video package from the Daily Chronicle."}</p>
        <p className="watch-detail-meta">
          {video.mimeType} · {formatDate(video.createdAt)}
        </p>
      </div>

      {related.length > 0 ? (
        <section className="watch-detail-more">
          <h2>More video</h2>
          <div className="watch-page-grid">
            {related.map((item) => (
              <article key={item.id}>
                <Link href={`/watch/${item.slug}`} aria-label={item.title ?? "Video"}>
                  <Image
                    src={item.posterUrl ?? fallbackImage(item.slug ?? item.id)}
                    alt={item.altText ?? item.title ?? "Video"}
                    width={1280}
                    height={720}
                  />
                  <h3>{item.title}</h3>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <Link className="watch-detail-back" href="/watch">
        Back to Watch
      </Link>
    </main>
  );
}
