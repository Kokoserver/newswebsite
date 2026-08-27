import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Eye,
  Mail,
  Menu,
  MessageCircle,
  Play,
  Search,
  ThumbsUp,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getAdvertisementsBySlot } from "@/src/db/queries/advertisements";
import { getLatestArticles, getMostReadArticles } from "@/src/db/queries/articles";
import { getTrendingArticles } from "@/src/db/queries/analytics";
import { getCategoryArchive, getNavbarCategories } from "@/src/db/queries/categories";
import { getHomepageData } from "@/src/db/queries/homepage";
import { getVideoMedia } from "@/src/db/queries/media";
import { getSiteUrl } from "@/src/config";

import BrandLogo from "@/components/brand-logo";
import AdvertisementSlot from "@/components/advertisement-slot";
import NewsletterForm from "@/components/newsletter-form";
import ShareButton from "@/components/share-button";
import StickySiteHeader from "@/components/sticky-site-header";
import UserMenu from "@/components/user-menu";
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
  articleViewCount: number | null;
  articleCommentCount: number | null;
  articleLikeCount: number | null;
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
type ArticleSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  categoryName: string;
  categorySlug: string;
};
type ListedStory = {
  id: string;
  title: string;
  href: string;
  category: string;
  categorySlug: string;
  excerpt: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  publishedAt: Date | null;
  seed: string;
  commentCount?: number | null;
  likeCount?: number | null;
  viewCount?: number | null;
  hasVideo?: boolean;
};

function fallbackImage(seed: string) {
  return `https://picsum.photos/seed/world-current-${seed}/1200/760`;
}

function shareUrl(path: string) {
  const baseUrl = getSiteUrl();
  return new URL(path, baseUrl).toString();
}

function formatCount(count: number | null | undefined) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count ?? 0);
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

function itemExcerpt(item: HomepageItem) {
  return (
    item.dekOverride ??
    item.articleExcerpt ??
    "The latest details, context and reaction as this developing story continues."
  );
}

function listedFromHomepage(item: HomepageItem, fallbackId: string): ListedStory {
  const title = itemTitle(item);

  return {
    id: item.articleId ?? item.mediaId ?? item.itemId ?? fallbackId,
    title,
    href: itemHref(item),
    category: itemCategory(item),
    categorySlug: item.articleCategorySlug ?? item.sectionKey,
    excerpt: itemExcerpt(item),
    imageUrl: item.mediaUrl,
    imageAlt: item.mediaAlt ?? title,
    publishedAt: item.publishedAt,
    seed: item.articleSlug ?? item.mediaSlug ?? fallbackId,
    commentCount: item.articleCommentCount,
    likeCount: item.articleLikeCount,
    viewCount: item.articleViewCount,
    hasVideo: Boolean(item.articleVideoUrl),
  };
}

function listedFromArticle(item: ArticleSummary): ListedStory {
  return {
    id: item.id,
    title: item.title,
    href: `/articles/${item.slug}`,
    category: item.categoryName,
    categorySlug: item.categorySlug,
    excerpt: item.excerpt,
    imageUrl: item.heroImageUrl,
    imageAlt: item.heroImageAlt ?? item.title,
    publishedAt: item.publishedAt,
    seed: item.slug,
  };
}

function homepageItemFromArticle(item: ArticleSummary, sectionTitle = "Latest News"): HomepageItem {
  return {
    sectionKey: item.categorySlug,
    sectionTitle,
    sectionKind: "CATEGORY",
    itemId: item.id,
    itemPosition: null,
    titleOverride: null,
    dekOverride: null,
    articleId: item.id,
    articleTitle: item.title,
    articleSlug: item.slug,
    articleExcerpt: item.excerpt,
    articleViewCount: null,
    articleCommentCount: null,
    articleLikeCount: null,
    articleCategoryName: item.categoryName,
    articleCategorySlug: item.categorySlug,
    articleVideoUrl: null,
    articleVideoPoster: null,
    articleVideoCaption: null,
    publishedAt: item.publishedAt,
    mediaId: null,
    mediaUrl: item.heroImageUrl,
    mediaAlt: item.heroImageAlt,
    mediaTitle: null,
    mediaSlug: null,
  };
}

function uniqueStories(stories: ListedStory[]) {
  const seen = new Set<string>();

  return stories.filter((story) => {
    const key = story.href;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
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
        sizes={compact ? "(max-width: 760px) 36vw, 170px" : "(max-width: 900px) 100vw, 650px"}
        priority={priority}
      />
    </div>
  );
}

function TopStory({ item }: { item: HomepageItem }) {
  const title = itemTitle(item);
  const href = itemHref(item);

  return (
    <article className="lead-banner portal-main">
      <h1>
        <Link href={href}>{title}</Link>
      </h1>
      {item.articleVideoUrl ? (
        <VideoPlayer
          src={item.articleVideoUrl}
          poster={item.articleVideoPoster ?? item.mediaUrl}
          title={title}
          caption={item.articleVideoCaption}
          autoPlay
          loop
        />
      ) : (
        <Link href={href} aria-label={title}>
          <StoryImage src={item.mediaUrl} alt={item.mediaAlt ?? title} seed={item.articleSlug ?? "hero"} priority />
        </Link>
      )}
      <p>{itemExcerpt(item)}</p>
      <div className="lead-banner-actions" aria-label="Story actions">
        <ShareButton className="share-action" title={title} url={shareUrl(href)}>
          Share
        </ShareButton>
        <strong>
          <MessageCircle size={15} fill="currentColor" /> {formatCount(item.articleCommentCount)} comments
        </strong>
        <strong>
          <ThumbsUp size={15} fill="currentColor" /> {formatCount(item.articleLikeCount)} likes
        </strong>
        <strong>
          <Eye size={15} /> {formatCount(item.articleViewCount)} views
        </strong>
        {item.articleVideoUrl ? (
          <strong>
            <Video size={15} fill="currentColor" /> 1 video
          </strong>
        ) : null}
      </div>
    </article>
  );
}

function ListedStoryCard({ story, featured = false }: { story: ListedStory; featured?: boolean }) {
  return (
    <article className={`listed-story ${featured ? "featured" : ""}`}>
      <Link href={story.href} aria-label={story.title}>
        <StoryImage src={story.imageUrl} alt={story.imageAlt ?? story.title} seed={story.seed} compact />
      </Link>
      <div className="listed-story-body">
        <Tag>{story.category}</Tag>
        <h2>
          <Link href={story.href}>{story.title}</Link>
        </h2>
        <p>{story.excerpt ?? "A concise update with the context readers need now."}</p>
        <StoryActionRow story={story} compact />
      </div>
    </article>
  );
}

function StoryActionRow({ story, compact = false }: { story: ListedStory; compact?: boolean }) {
  return (
    <div className={`story-actions ${compact ? "compact" : ""}`}>
      <span>
        <MessageCircle size={13} fill="currentColor" />{" "}
        {story.commentCount == null ? "comments" : `${formatCount(story.commentCount)} comments`}
      </span>
      {story.hasVideo ? (
        <span>
          <Video size={13} fill="currentColor" /> 1 video
        </span>
      ) : null}
      <ShareButton className="story-share-action" title={story.title} url={shareUrl(story.href)}>
        share
      </ShareButton>
    </div>
  );
}

function SectionLeadStory({ story }: { story: ListedStory }) {
  return (
    <article className="section-lead-banner">
      <h3>
        <Link href={story.href}>{story.title}</Link>
      </h3>
      <Link href={story.href} aria-label={story.title}>
        <StoryImage src={story.imageUrl} alt={story.imageAlt ?? story.title} seed={story.seed} />
      </Link>
      <p>{story.excerpt ?? "A major update with the pictures, context and key details readers need."}</p>
      <StoryActionRow story={story} />
    </article>
  );
}

function SectionRiver({
  title,
  sectionKey,
  stories,
  href,
}: {
  title: string;
  sectionKey: string;
  stories: ListedStory[];
  href?: string;
}) {
  const [lead, ...rest] = stories;
  const sectionHref = href ?? `/section/${sectionKey}`;

  if (!lead) {
    return null;
  }

  return (
    <section className={`section-river ${title === "Top Stories" ? "top-stories-section" : ""}`}>
      <div className="section-river-heading">
        <h2>
          <span>{title === "Top Stories" ? "Lead" : "Desk"}</span> {title}
        </h2>
        <Link href={sectionHref}>
          More <ChevronRight size={14} />
        </Link>
      </div>
      <SectionLeadStory story={lead} />
      <div className="section-card-grid">
        {rest.slice(0, title === "Top Stories" ? 4 : 6).map((story) => (
          <ListedStoryCard story={story} key={story.id} />
        ))}
      </div>
    </section>
  );
}

function RailStory({ story }: { story: ListedStory }) {
  return (
    <article className="rail-story">
      <Link href={story.href} aria-label={story.title}>
        <StoryImage src={story.imageUrl} alt={story.imageAlt ?? story.title} seed={story.seed} compact />
      </Link>
      <h3>
        <Link href={story.href}>{story.title}</Link>
      </h3>
    </article>
  );
}

function RailSection({
  title,
  href,
  stories,
  limit = 10,
}: {
  title: string;
  href: string;
  stories: ListedStory[];
  limit?: number;
}) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section className="rail-section">
      <div className="rail-section-heading">
        <h2>
          <span>More</span> {title}
        </h2>
        <Link href={href}>More</Link>
      </div>
      {stories.slice(0, limit).map((story) => (
        <RailStory story={story} key={story.id} />
      ))}
    </section>
  );
}

function categoryRiverStories(
  slug: string,
  title: string,
  latest: ListedStory[],
  archive: { items: { id: string; title: string; slug: string; excerpt: string | null; heroImageUrl: string | null; heroImageAlt: string | null }[] } | null,
) {
  const archiveStories =
    archive?.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: `/articles/${item.slug}`,
      category: title,
      categorySlug: slug,
      excerpt: item.excerpt,
      imageUrl: item.heroImageUrl,
      imageAlt: item.heroImageAlt ?? item.title,
      publishedAt: null,
      seed: item.slug,
    })) ?? [];
  const sameCategory = latest.filter((story) => story.categorySlug === slug);

  return uniqueStories([...archiveStories, ...sameCategory]).slice(0, 6);
}

export default async function Home() {
  const [homepageData, latestArticles, mostReadArticles, trendingArticles, videos, homepageTopAds, homepageMiddleAds, navItems] = await Promise.all([
    getHomepageData(),
    getLatestArticles(32),
    getMostReadArticles(8),
    getTrendingArticles(8),
    getVideoMedia(6),
    getAdvertisementsBySlot("HOMEPAGE_TOP", 6),
    getAdvertisementsBySlot("HOMEPAGE_MIDDLE", 6),
    getNavbarCategories(),
  ]);

  const latestStories = latestArticles.map(listedFromArticle);
  const pulseItems = latestStories.slice(0, 5);

  const sectionByKey = new Map(homepageData.map((section) => [section.key, section]));
  const heroItems = sectionByKey.get("hero")?.items ?? [];
  const featuredItems = sectionByKey.get("featured")?.items ?? [];
  const categorySections = homepageData
    .filter((section) => section.kind === "CATEGORY")
    .slice(0, 12);

  const fallbackHeroItems = latestStories.slice(0, 5).map((item) =>
    homepageItemFromArticle({
      id: item.id,
      title: item.title,
      slug: item.href.replace("/articles/", ""),
      excerpt: item.excerpt,
      publishedAt: item.publishedAt,
      heroImageUrl: item.imageUrl,
      heroImageAlt: item.imageAlt,
      categoryName: item.category,
      categorySlug: item.categorySlug,
    }),
  );
  const displayHeroItems = heroItems.length > 0 ? heroItems : fallbackHeroItems;
  const heroLead = displayHeroItems[0] ?? null;

  const featuredStories = uniqueStories([
    ...featuredItems.map((item, index) => listedFromHomepage(item, `featured-${index}`)),
    ...latestStories.slice(0, 4),
  ]);

  const curatedStories = homepageData.flatMap((section) =>
    section.items.map((item, index) => listedFromHomepage(item, `${section.key}-${index}`)),
  );
  const railStories = uniqueStories([...curatedStories, ...latestStories]).slice(0, 10);

  const billboardAd = homepageTopAds[0] ?? null;
  const railAds = [...homepageMiddleAds, ...homepageTopAds.slice(1)];
  const railAdAt = (index: number) => {
    if (railAds.length === 0) {
      return null;
    }

    return railAds[index % railAds.length] ?? null;
  };

  const railNavItems = navItems.length > 0 ? navItems : categorySections.map((s) => ({
    id: s.key,
    label: s.title,
    href: `/section/${s.key}`,
    slug: s.key,
    position: 0,
  }));

  const sidebarRails = await Promise.all(
    railNavItems.map(async (item) => ({
      id: item.slug,
      title: item.label,
      href: item.href,
      stories: categoryRiverStories(item.slug, item.label, latestStories, await getCategoryArchive(item.slug, 10, 0)),
    })),
  );

  return (
    <main className="news-site world-current-home">
      <header className="news-header">
        <details className="desktop-menu">
          <summary aria-label="Open menu">
            <Menu size={20} />
          </summary>
          <div className="desktop-menu-panel">
            <strong>Sections</strong>
            <nav aria-label="Expanded sections menu">
              <Link href="/">Home</Link>
              {navItems.map((item) => (
                <Link href={item.href} key={item.id}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </details>
        <Link href="/" className="news-logo" aria-label="THE WORLD CURRENT home">
          <BrandLogo priority />
        </Link>
        <div className="news-actions">
          <Link href="/search" aria-label="Search" title="Search">
            <Search size={18} />
          </Link>
          <UserMenu size={18} />
        </div>
      </header>

      <StickySiteHeader>
        <nav className="news-nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          {navItems.map((item) => (
            <Link href={item.href} key={item.id}>
              {item.label}
            </Link>
          ))}
        </nav>
      </StickySiteHeader>

      <section className="world-current-brief" aria-label="THE WORLD CURRENT positioning">
        <strong>Different Nations. One World. One Voice.</strong>
        <span>An ACHEBE HOPE FOUNDATION Initiative</span>
      </section>

      <AdvertisementSlot ad={billboardAd} variant="billboard" />

      <section className="headline-strip" aria-label="Breaking headlines">
        {pulseItems.map((item) => (
          <Link href={item.href} key={item.id}>
            <strong>{item.category}</strong>
            <span>{item.title}</span>
          </Link>
        ))}
      </section>

      {heroLead ? (
        <section className="top-news-grid">
          <TopStory item={heroLead} />
        </section>
      ) : null}

      <div className="home-river-layout">
        <div className="home-river">
          <div className="river-heading">
            <h2>Global newsroom</h2>
            <Link href="/latest">
              Latest news <ChevronRight size={14} />
            </Link>
          </div>
          <SectionRiver
            title="Top Stories"
            sectionKey="latest"
            stories={featuredStories}
            href="/latest"
          />
          {categorySections.map((section) => (
            <SectionRiver
              title={section.title}
              sectionKey={section.key}
              stories={categoryRiverStories(section.key, section.title, latestStories, null)}
              key={section.id}
            />
          ))}
          <SectionRiver
            title="Latest News"
            sectionKey="latest"
            stories={latestStories.slice(5)}
            href="/latest"
          />
        </div>

        <aside className="home-side-rail">
          <div className="home-side-rail-inner">
            <div className="rail-widget trending-widget">
              <h2>
                <BarChart3 size={15} /> Trending now
              </h2>
              <ol className="trending-ranking">
                {trendingArticles.map((item) => (
                  <li key={item.id}>
                    <Link className="trending-thumb" href={`/articles/${item.slug}`}>
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.imageAlt ?? item.title}
                          width={92}
                          height={64}
                          sizes="92px"
                        />
                      ) : (
                        <strong>{item.categoryName?.slice(0, 1) ?? "D"}</strong>
                      )}
                    </Link>
                    <div className="trending-copy">
                      {item.categoryName ? <em>{item.categoryName}</em> : null}
                      <Link href={`/articles/${item.slug}`}>{item.title}</Link>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <AdvertisementSlot ad={railAdAt(0)} variant="rail" />
            <div className="rail-widget most-read-widget">
              <h2>Most read</h2>
              <ol className="most-read-ranking">
                {mostReadArticles.map((item) => (
                  <li className="ranking" key={item.id}>
                    <div className="ranking-copy">
                      {item.categoryName ? <em>{item.categoryName}</em> : null}
                      <Link href={`/articles/${item.slug}`}>{item.title}</Link>
                      <strong>{item.viewCount.toLocaleString()}</strong>
                    </div>
                    <Link className="ranking-thumb" href={`/articles/${item.slug}`}>
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.imageAlt ?? item.title}
                          width={92}
                          height={64}
                          sizes="92px"
                        />
                      ) : (
                        <b>{item.categoryName?.slice(0, 1) ?? "D"}</b>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <AdvertisementSlot ad={railAdAt(1)} variant="rail" />
            <div className="rail-widget">
              <h2>
                <CalendarDays size={15} /> Editor’s picks
              </h2>
              {railStories.slice(0, 5).map((story) => (
                <RailStory story={story} key={story.id} />
              ))}
            </div>
            <div className="rail-widget newsletter-card">
              <span className="newsletter-icon">
                <Mail size={20} />
              </span>
              <h2>Get The Current Brief</h2>
              <p>Global headlines connecting Africa, the diaspora and the wider world.</p>
              <NewsletterForm />
            </div>
            {sidebarRails.map((section, index) => (
              <div className="rail-section-stack" key={section.id}>
                <AdvertisementSlot ad={railAdAt(index + 2)} variant="rail" />
                <RailSection title={section.title} href={section.href} stories={section.stories} />
              </div>
            ))}
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
        <h2>
          <BrandLogo variant="dark" />
        </h2>
        <p>
          Africa. Britain. America. The World. Different Nations. One World. One Voice.
          An ACHEBE HOPE FOUNDATION Initiative.
        </p>
        <nav>
          <Link href="/">Home</Link>
          {navItems.map((item) => (
            <Link href={item.href} key={item.id}>
              {item.label}
            </Link>
          ))}
        </nav>
      </footer>
    </main>
  );
}
