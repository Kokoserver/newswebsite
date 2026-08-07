import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Mail,
  Menu,
  Play,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getLatestArticles, getMostReadArticles } from "@/src/db/queries/articles";
import { getNavbarCategories } from "@/src/db/queries/categories";
import { getHomepageData } from "@/src/db/queries/homepage";
import { getVideoMedia } from "@/src/db/queries/media";
import { getTrendingArticles } from "@/src/db/queries/analytics";

import UserMenu from "@/components/user-menu";
import NewsletterForm from "@/components/newsletter-form";
import VideoPlayer from "@/components/video-player";

export const dynamic = "force-dynamic";

type HomepageItem = {
  sectionKey: string;
  sectionTitle: string;
  sectionKind: string;
  itemId: string | null;
  itemPosition: number | null;
  titleOverride: string | null;
  dekOverride: string | null;
  articleId: string | null;
  articleTitle: string | null;
  articleSlug: string | null;
  articleExcerpt: string | null;
  articleCategoryName: string | null;
  articleCategorySlug: string | null;
  articleVideoUrl: string | null;
  articleVideoPoster: string | null;
  articleVideoCaption: string | null;
  publishedAt: Date | null;
  mediaId: string | null;
  mediaUrl: string | null;
  mediaAlt: string | null;
  mediaTitle: string | null;
  mediaSlug: string | null;
};

function fallbackImage(seed: string) {
  return `https://picsum.photos/seed/daily-chronicle-${seed}/1200/760`;
}

function timeAgo(date: Date | null) {
  if (!date) {
    return "Just now";
  }

  const minutes = Math.max(
    1,
    Math.floor((Date.now() - new Date(date).getTime()) / 60_000),
  );

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function itemTitle(item: HomepageItem) {
  return item.titleOverride ?? item.articleTitle ?? item.mediaTitle ?? "Untitled story";
}

function itemHref(item: HomepageItem) {
  if (item.articleSlug) {
    return `/articles/${item.articleSlug}`;
  }

  if (item.mediaSlug) {
    return `/watch/${item.mediaSlug}`;
  }

  return "/";
}

function itemCategory(item: HomepageItem) {
  return item.articleCategoryName ?? item.sectionTitle ?? "News";
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="news-tag">{children}</span>;
}

function StoryImage({
  src,
  alt,
  seed,
  compact = false,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  seed: string;
  compact?: boolean;
  priority?: boolean;
}) {
  return (
    <div className={`news-visual ${compact ? "compact" : ""}`}>
      <Image
        className="news-visual-image"
        src={src ?? fallbackImage(seed)}
        alt={alt}
        width={1200}
        height={760}
        sizes={compact ? "(max-width: 600px) 100vw, 220px" : "(max-width: 1000px) 100vw, 700px"}
        priority={priority}
      />
    </div>
  );
}

function SmallStory({
  title,
  href,
  category,
  imageUrl,
  imageAlt,
  seed,
  time,
}: {
  title: string;
  href: string;
  category: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  seed: string;
  time: string;
}) {
  return (
    <article className="small-story">
      <Link href={href} aria-label={title}>
        <StoryImage src={imageUrl} alt={imageAlt ?? title} seed={seed} compact />
      </Link>
      <div>
        <Tag>{category}</Tag>
        <h3>
          <Link href={href}>{title}</Link>
        </h3>
        <p>Updated {time}</p>
      </div>
    </article>
  );
}

function SectionBlock({
  title,
  sectionKey,
  lead,
  list,
}: {
  title: string;
  sectionKey: string;
  lead: HomepageItem;
  list: HomepageItem[];
}) {
  const leadTitle = itemTitle(lead);
  const leadHref = itemHref(lead);

  return (
    <section className="section-block">
      <div className="block-heading">
        <h2>{title}</h2>
        <Link href={`/section/${sectionKey}`}>
          View all <ChevronRight size={14} />
        </Link>
      </div>
      <div className="section-grid">
        <article className="section-lead">
          <StoryImage
            src={lead.mediaUrl}
            alt={lead.mediaAlt ?? leadTitle}
            seed={lead.articleSlug ?? sectionKey}
          />
          <Tag>{title}</Tag>
          <h3>
            <Link href={leadHref}>{leadTitle}</Link>
          </h3>
          <p>
            {lead.dekOverride ??
              lead.articleExcerpt ??
              "A fast-moving story with updates, background and the detail readers need to understand what happens next."}
          </p>
        </article>
        <div className="section-list">
          {list.map((item) => {
            const itemHrefValue = itemHref(item);
            const itemTitleValue = itemTitle(item);

            return (
              <article key={`${item.articleId ?? item.mediaId ?? itemTitleValue}`}>
                <h3>
                  <Link href={itemHrefValue}>{itemTitleValue}</Link>
                </h3>
                <p>
                  <Clock3 size={12} /> Updated {timeAgo(item.publishedAt)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const [navItems, homepageData, latestArticles, mostReadArticles, trendingArticles, videos] =
    await Promise.all([
      getNavbarCategories(),
      getHomepageData(),
      getLatestArticles(20),
      getMostReadArticles(5),
      getTrendingArticles(6),
      getVideoMedia(6),
    ]);

  const sectionByKey = new Map(homepageData.map((section) => [section.key, section]));
  const heroSection = sectionByKey.get("hero");
  const featuredSection = sectionByKey.get("featured");
  const categorySections = homepageData.filter((section) => section.kind === "CATEGORY");
  const heroItems = heroSection?.items ?? [];
  const heroLead = heroItems[0] ?? null;
  const topGrid = heroItems.slice(1, 5);
  const feedItems = latestArticles.slice(8);
  const picks = featuredSection?.items ?? [];
  const pulseItems = latestArticles.slice(0, 5);
  const latestRiver = latestArticles.slice(0, 8);

  return (
    <main className="news-site">
      <div className="ad-strip">Advertisement · Your message here</div>

      <header className="news-header">
        <button aria-label="Open menu">
          <Menu size={20} />
        </button>
        <Link href="/" className="news-logo">
          Daily Chronicle
        </Link>
        <div className="news-actions">
          <Link href="/search" aria-label="Search" title="Search">
            <Search size={18} />
          </Link>
          <UserMenu size={18} />
        </div>
      </header>

      <nav className="news-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link href={item.href} key={item.id}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="news-pulse" aria-label="News pulse">
        {pulseItems.map((item) => (
          <Link className="news-pulse-tile" href={`/articles/${item.slug}`} key={item.id}>
            <span>{item.categoryName}</span>
            <strong>{item.title}</strong>
            <em>Live</em>
          </Link>
        ))}
      </div>

      <section className="hero-portal">
        <article className="portal-main">
          {heroLead ? (
            <>
              {heroLead.articleVideoUrl ? (
                <VideoPlayer
                  src={heroLead.articleVideoUrl}
                  poster={heroLead.articleVideoPoster ?? heroLead.mediaUrl}
                  title={itemTitle(heroLead)}
                  caption={heroLead.articleVideoCaption}
                  autoPlay
                  loop
                />
              ) : (
                <StoryImage
                  src={heroLead.mediaUrl}
                  alt={heroLead.mediaAlt ?? itemTitle(heroLead)}
                  seed={heroLead.articleSlug ?? "hero"}
                  priority
                />
              )}
              <Tag>Top Story</Tag>
              <h1>
                <Link href={itemHref(heroLead)}>{itemTitle(heroLead)}</Link>
              </h1>
              <p>
                {heroLead.dekOverride ??
                  heroLead.articleExcerpt ??
                  "Exclusive details, photographs and eyewitness accounts tell the inside story behind the moment dominating conversation today."}
              </p>
            </>
          ) : null}
        </article>

        <div className="portal-stack">
          {topGrid.map((item) => (
            <SmallStory
              key={item.articleId ?? item.itemId}
              title={itemTitle(item)}
              href={itemHref(item)}
              category={itemCategory(item)}
              imageUrl={item.mediaUrl}
              imageAlt={item.mediaAlt}
              seed={item.articleSlug ?? item.mediaSlug ?? "story"}
              time={timeAgo(item.publishedAt)}
            />
          ))}
        </div>

        <aside className="right-rail">
          <div className="widget">
            <h2>
              <BarChart3 size={16} /> Trending
            </h2>
            <ol>
              {trendingArticles.map((item) => (
                <li key={item.id}>
                  <Link href={`/articles/${item.slug}`}>{item.title}</Link>
                </li>
              ))}
            </ol>
          </div>
          <div className="widget">
            <h2>Most read</h2>
            {mostReadArticles.map((item, index) => (
              <p className="ranking" key={item.id}>
                <span>{index + 1}</span>
                <Link href={`/articles/${item.slug}`}>{item.title}</Link>
                <strong>{item.viewCount.toLocaleString()}</strong>
              </p>
            ))}
          </div>
        </aside>
      </section>

      <section className="latest-river">
        <div className="block-heading">
          <h2>Latest News</h2>
          <Link href="/latest">
            More headlines <ChevronRight size={14} />
          </Link>
        </div>
        <div className="river-grid">
          {latestRiver.map((item) => (
            <SmallStory
              key={item.id}
              title={item.title}
              href={`/articles/${item.slug}`}
              category={item.categoryName}
              imageUrl={item.heroImageUrl}
              imageAlt={item.heroImageAlt}
              seed={item.slug}
              time={timeAgo(item.publishedAt)}
            />
          ))}
        </div>
      </section>

      <div className="content-layout">
        <div>
          {categorySections.map((section) => {
            const [lead, ...list] = section.items;

            if (!lead) {
              return null;
            }

            return (
              <SectionBlock
                key={section.id}
                title={section.title}
                sectionKey={section.key}
                lead={lead}
                list={list}
              />
            );
          })}

          {feedItems.length > 0 ? (
            <section className="feed-block">
              <div className="block-heading">
                <h2>More From Daily Chronicle</h2>
                <Link href="/latest">
                  Full feed <ChevronRight size={14} />
                </Link>
              </div>
              {feedItems.map((item) => (
                <article className="feed-item" key={item.id}>
                  <StoryImage
                    src={item.heroImageUrl}
                    alt={item.heroImageAlt ?? item.title}
                    seed={item.slug}
                    compact
                  />
                  <div>
                    <Tag>{item.categoryName}</Tag>
                    <h3>
                      <Link href={`/articles/${item.slug}`}>{item.title}</Link>
                    </h3>
                    <p>
                      {item.excerpt ??
                        "A concise update with context, reaction and the background needed to follow the story as it develops."}
                    </p>
                  </div>
                  <span className="feed-time">{timeAgo(item.publishedAt)}</span>
                </article>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="sticky-rail">
          <div className="widget">
            <h2>
              <CalendarDays size={16} /> Editor’s picks
            </h2>
            {picks.map((item) => (
              <p className="schedule" key={item.articleId ?? item.itemId}>
                <Link href={itemHref(item)}>{itemTitle(item)}</Link>
                <strong>Updated</strong>
              </p>
            ))}
          </div>
          <div className="widget newsletter-card">
            <span className="newsletter-icon">
              <Mail size={20} />
            </span>
            <h2>Get the Daily Brief</h2>
            <p>Top headlines, features and must-read stories every morning.</p>
            <NewsletterForm />
          </div>
        </aside>
      </div>

      {videos.length > 0 ? (
        <section className="video-strip">
          <div className="block-heading">
            <h2>Watch</h2>
            <Link href="/watch">
              All video <ChevronRight size={14} />
            </Link>
          </div>
          <div className="watch-grid">
            {videos.map((video) => (
              <article key={video.id}>
                <Link
                  className="watch-card"
                  href={`/watch/${video.slug}`}
                  aria-label={`Play ${video.title ?? "video"}`}
                >
                  <StoryImage
                    src={video.posterUrl}
                    alt={video.altText ?? video.title ?? "Video"}
                    seed={video.slug ?? video.id}
                  />
                  <span className="watch-play" aria-hidden="true">
                    <Play size={18} fill="currentColor" />
                  </span>
                  <h3>{video.title}</h3>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="news-footer">
        <h2>Daily Chronicle</h2>
        <p>News, features, lifestyle, showbiz, money and must-read stories.</p>
        <nav>
          {navItems.slice(0, 9).map((item) => (
            <Link href={item.href} key={item.id}>
              {item.label}
            </Link>
          ))}
        </nav>
      </footer>
    </main>
  );
}
