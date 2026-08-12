import { Clock3, Home, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import AdvertisementSlot from "@/components/advertisement-slot";
import NewsletterForm from "@/components/newsletter-form";
import Pagination from "@/components/pagination";
import SocialFollowCard from "@/components/social-follow-card";
import UserMenu from "@/components/user-menu";
import { getAdvertisementsBySlot } from "@/src/db/queries/advertisements";
import {
  countLatestArticles,
  getLatestArticles,
  getMostReadArticles,
} from "@/src/db/queries/articles";

export const dynamic = "force-dynamic";

const pageSize = 24;

function fallbackImage(seed: string) {
  return `https://picsum.photos/seed/daily-chronicle-latest-${seed}/720/460`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(date: Date | null) {
  if (!date) {
    return "Unpublished";
  }

  return dateTimeFormatter.format(date);
}

type LatestPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function LatestPage({ searchParams }: LatestPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({} as { page?: string }));

  const requestedPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [totalCount, mostReadArticles, sidebarAds] = await Promise.all([
    countLatestArticles(),
    getMostReadArticles(10),
    getAdvertisementsBySlot("HOMEPAGE_MIDDLE", 3),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;

  const articles = await getLatestArticles(pageSize, offset);

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
      <div className="route-kicker">Latest</div>
      <h1>Latest News</h1>
      <p>
        The newest published headlines from the newsroom, loaded from the
        article database in real time.
      </p>
      <div className="latest-layout">
        <div>
          <div className="route-card-grid">
            {articles.map((article) => (
              <article key={article.id}>
                <Link href={`/articles/${article.slug}`}>
                  <Image
                    src={article.heroImageUrl ?? fallbackImage(article.slug)}
                    alt={article.heroImageAlt ?? article.title}
                    width={720}
                    height={460}
                    sizes="(max-width: 768px) 100vw, 340px"
                  />
                </Link>
                <span>{article.categoryName}</span>
                <h2>
                  <Link href={`/articles/${article.slug}`}>{article.title}</Link>
                </h2>
                <p>
                  {article.excerpt ?? "The latest from the Daily Chronicle newsroom."}
                </p>
                <p className="route-meta">
                  <Clock3 size={13} /> {formatDate(article.publishedAt)} ·{" "}
                  {article.authorName}
                </p>
              </article>
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/latest" />
          <Link href="/">Back to homepage</Link>
        </div>

        <aside className="channel-rail">
          <AdvertisementSlot ad={sidebarAds[0] ?? null} variant="rail" />
          <SocialFollowCard />

          <section>
            <h2>Most Read</h2>
            <ol>
              {mostReadArticles.map((article, index) => (
                <li key={article.id}>
                  <span>{index + 1}</span>
                  <Link href={`/articles/${article.slug}`}>{article.title}</Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="channel-newsletter">
            <h2>Stay Informed</h2>
            <p>Get the biggest stories and pictures delivered daily.</p>
            <NewsletterForm />
          </section>
        </aside>
      </div>
    </main>
  );
}
