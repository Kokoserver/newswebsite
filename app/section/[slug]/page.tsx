import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import UserMenu from "@/components/user-menu";
import NewsletterForm from "@/components/newsletter-form";
import Pagination from "@/components/pagination";
import { getMostReadArticles } from "@/src/db/queries/articles";
import {
  countCategoryArticles,
  getCategoryArchive,
  getCategoryBySlug,
  getNavbarCategories,
} from "@/src/db/queries/categories";

export const dynamic = "force-dynamic";

const pageSize = 24;

type SectionPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    page?: string;
  }>;
};

function fallbackImage(seed: string) {
  return `https://picsum.photos/seed/daily-chronicle-section-${seed}/720/460`;
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

export default async function SectionArchivePage({
  params,
  searchParams,
}: SectionPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({} as { page?: string }));

  if (!slug) {
    notFound();
  }

  const requestedPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [category, navItems, mostReadArticles, totalCount] = await Promise.all([
    getCategoryBySlug(slug),
    getNavbarCategories(),
    getMostReadArticles(10),
    countCategoryArticles(slug),
  ]);

  if (!category) {
    notFound();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;

  const archive = await getCategoryArchive(slug, pageSize, offset);

  const title = category.name;
  const intro =
    category.description ??
    "Latest stories, analysis and features from this section.";
  const items = archive?.items ?? [];
  const [leadStory, secondStory, thirdStory, ...feedStories] = items;

  return (
    <main className="channel-page">
      <div className="channel-ad">Advertisement</div>

      <header className="channel-header">
        <Link href="/" className="channel-brand">
          Daily Chronicle
        </Link>
        <div className="channel-actions">
          <Link href="/search" aria-label="Search" title="Search">
            <Search size={17} />
          </Link>
          <UserMenu size={17} />
        </div>
      </header>

      <nav className="channel-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link href={item.href} key={item.id}>
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="channel-hero">
        <div>
          <div className="channel-kicker">{title}</div>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <Link href="/">Back to homepage</Link>
      </section>

      <section className="channel-layout">
        <div className="channel-main">
          {currentPage === 1 ? (
            <>
              {leadStory ? (
                <article className="channel-lead">
                  <Link href={`/articles/${leadStory.slug}`}>
                    <Image
                      src={leadStory.heroImageUrl ?? fallbackImage(leadStory.slug)}
                      alt={leadStory.heroImageAlt ?? leadStory.title}
                      width={960}
                      height={600}
                      sizes="(max-width: 960px) 100vw, 960px"
                      priority
                    />
                  </Link>
                  <span>{title}</span>
                  <h2>
                    <Link href={`/articles/${leadStory.slug}`}>{leadStory.title}</Link>
                  </h2>
                  <p>{leadStory.excerpt ?? "Latest coverage from this section."}</p>
                  <p className="channel-feed-date">{formatDate(leadStory.publishedAt)}</p>
                </article>
              ) : (
                <p>No published stories in this section yet.</p>
              )}

              {secondStory && thirdStory ? (
                <div className="channel-top-grid">
                  {[secondStory, thirdStory].map((story) => (
                    <article key={story.id}>
                      <Link href={`/articles/${story.slug}`}>
                        <Image
                          src={story.heroImageUrl ?? fallbackImage(story.slug)}
                          alt={story.heroImageAlt ?? story.title}
                          width={720}
                          height={450}
                          sizes="(max-width: 768px) 100vw, 460px"
                        />
                      </Link>
                      <span>{title}</span>
                      <h2>
                        <Link href={`/articles/${story.slug}`}>{story.title}</Link>
                      </h2>
                    </article>
                  ))}
                </div>
              ) : null}

              {feedStories.length > 0 ? (
                <div className="channel-feed">
                  {feedStories.map((story, index) => (
                    <article className={index % 6 === 0 ? "channel-feed-wide" : ""} key={story.id}>
                      <Link href={`/articles/${story.slug}`}>
                        <Image
                          src={story.heroImageUrl ?? fallbackImage(story.slug)}
                          alt={story.heroImageAlt ?? story.title}
                          width={720}
                          height={450}
                          sizes="(max-width: 768px) 100vw, 460px"
                        />
                      </Link>
                      <div>
                        <span>{title}</span>
                        <h2>
                          <Link href={`/articles/${story.slug}`}>{story.title}</Link>
                        </h2>
                        <p>{story.excerpt ?? "Latest coverage from this section."}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : items.length > 0 ? (
            <div className="channel-feed">
              {items.map((story, index) => (
                <article className={index % 6 === 0 ? "channel-feed-wide" : ""} key={story.id}>
                  <Link href={`/articles/${story.slug}`}>
                    <Image
                      src={story.heroImageUrl ?? fallbackImage(story.slug)}
                      alt={story.heroImageAlt ?? story.title}
                      width={720}
                      height={450}
                      sizes="(max-width: 768px) 100vw, 460px"
                    />
                  </Link>
                  <div>
                    <span>{title}</span>
                    <h2>
                      <Link href={`/articles/${story.slug}`}>{story.title}</Link>
                    </h2>
                    <p>{story.excerpt ?? "Latest coverage from this section."}</p>
                    <p className="channel-feed-date">{formatDate(story.publishedAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p>No published stories in this section yet.</p>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={`/section/${slug}`}
          />
        </div>

        <aside className="channel-rail">
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
      </section>
    </main>
  );
}
