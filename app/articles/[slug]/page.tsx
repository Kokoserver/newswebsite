import {
  ChevronRight,
  Clock3,
  Eye,
  Mail,
  MessageCircle,
  Search,
  Share2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import CommentActions from "@/components/comment-actions";
import CopyLinkButton from "@/components/copy-link-button";
import RecordView from "@/components/record-view";
import StickySiteHeader from "@/components/sticky-site-header";
import UserMenu from "@/components/user-menu";
import VideoPlayer from "@/components/video-player";
import {
  getApprovedCommentsForArticle,
  getMostReadArticles,
  getPublishedArticleBySlug,
  getRelatedArticles,
} from "@/src/db/queries/articles";
import { getArticleViewCount } from "@/src/db/queries/analytics";
import { getNavbarCategories } from "@/src/db/queries/categories";
import { getSession } from "@/src/session";

import { commentAutoApproveEnabled, getSiteUrl } from "@/src/config";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    comment?: string;
  }>;
};

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

function fallbackImage(seed: string) {
  return `https://picsum.photos/seed/daily-chronicle-article-${seed}/960/620`;
}

function shareUrl(path: string) {
  const baseUrl = getSiteUrl();
  return new URL(path, baseUrl).toString();
}

function ArticleImage({
  src,
  alt,
  seed,
  caption,
}: {
  src?: string | null;
  alt?: string | null;
  seed: string;
  caption: string;
}) {
  return (
    <figure className="article-figure">
      <Image
        src={src ?? fallbackImage(seed)}
        alt={alt ?? caption}
        width={960}
        height={620}
        className="article-db-image"
        sizes="(max-width: 960px) 100vw, 960px"
        priority
      />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function ShareRow({ title, url }: { title: string; url: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="share-row" aria-label="Share article">
      <a
        className="share-facebook"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        rel="noreferrer"
        target="_blank"
      >
        <Share2 size={15} /> Share
      </a>
      <a
        className="share-x"
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        rel="noreferrer"
        target="_blank"
      >
        <X size={15} /> Tweet
      </a>
      <a className="share-mail" href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}>
        <Mail size={15} /> Email
      </a>
      <CopyLinkButton url={url} />
    </div>
  );
}

export default async function ArticlePage({ params, searchParams }: ArticlePageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { comment?: string }),
  ]);

  if (!slug) {
    notFound();
  }

  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const primaryCategory =
    article.categories.find((category) => category.isPrimary) ?? article.categories[0];
  const articleUrl = shareUrl(`/articles/${article.slug}`);
  const commentsCallbackUrl = `/articles/${article.slug}#comments`;
  const loginCallbackUrl = `/login?callbackUrl=${encodeURIComponent(commentsCallbackUrl)}`;

  const session = await getSession();

  const [navItems, articleComments, relatedArticles, mostReadArticles, liveViewCount] =
    await Promise.all([
      getNavbarCategories(),
      getApprovedCommentsForArticle(article.id, session?.user?.id),
      getRelatedArticles(
        article.id,
        article.categories.map((category) => category.id),
      ),
      getMostReadArticles(30),
      getArticleViewCount(article.id),
    ]);

  const commentAutoApprove = commentAutoApproveEnabled();
  const signedIn = Boolean(session?.user?.id || session?.user?.email);
  const commenterName = session?.user?.name ?? session?.user?.email ?? "your account";

  return (
    <main className="article-site">
      <RecordView articleId={article.id} />
      <StickySiteHeader className="article-sticky-header">
        <header className="article-masthead">
          <Link href="/" className="article-brand">
            Daily Chronicle
          </Link>
          <nav aria-label="Article navigation">
            <Link href="/">Home</Link>
            {navItems.slice(0, 6).map((item) => (
              <Link href={item.href} key={item.id}>
                {item.label}
              </Link>
            ))}
            <Link href="/search" aria-label="Search" title="Search">
              <Search size={15} />
            </Link>
            <UserMenu size={15} />
          </nav>
        </header>

        <div className="article-breaking">
          <strong>{article.type.replaceAll("_", " ")}</strong>
          <span>{primaryCategory?.name ?? "News"} · Follow updates, pictures and reader reaction</span>
        </div>
      </StickySiteHeader>

      <div className="article-layout">
        <article className="article-body">
          <div className="article-section-label">
            {primaryCategory ? (
              <Link href={`/section/${primaryCategory.slug}`}>{primaryCategory.name}</Link>
            ) : (
              "News"
            )}
          </div>
          <h1>{article.title}</h1>

          <p className="article-standfirst">
            {article.excerpt ??
              article.subtitle ??
              "Latest details, pictures and analysis from the Daily Chronicle newsroom."}
          </p>

          <ul className="article-bullets">
            <li>Published in {primaryCategory?.name ?? "News"}.</li>
            <li>{article.readingMinutes} minute read.</li>
            <li>{liveViewCount.toLocaleString()} readers have viewed this story.</li>
          </ul>

          <div className="article-meta">
            <span>By {article.author?.name ?? "Daily Chronicle Reporter"}</span>
            <span>
              <Clock3 size={13} /> Published: {formatDate(article.publishedAt)}
            </span>
            <span>
              <Eye size={13} /> {liveViewCount.toLocaleString()} views
            </span>
          </div>

          <ShareRow title={article.title} url={articleUrl} />

          {article.heroVideo ? (
            <VideoPlayer
              src={article.heroVideo.publicUrl}
              poster={article.heroVideo.posterUrl ?? article.heroImage?.publicUrl}
              title={article.title}
              caption={article.heroVideo.caption ?? article.heroVideo.altText}
            />
          ) : (
            <ArticleImage
              src={article.heroImage?.publicUrl}
              alt={article.heroImage?.altText}
              seed={article.slug}
              caption={
                article.heroImage?.altText ??
                `${article.title} is part of the seeded demo news library.`
              }
            />
          )}

          {article.renderedContent ? (
            <div
              className="article-rich-content"
              dangerouslySetInnerHTML={{ __html: article.renderedContent }}
            />
          ) : (
            <p>{article.excerpt ?? "This story is ready for editorial content."}</p>
          )}

          <aside className="article-pullout">
            <h2>More in {primaryCategory?.name ?? "News"}</h2>
            <p>
              Browse related stories from the same category, all loaded from the
              database.
            </p>
            <Link href={`/section/${primaryCategory?.slug ?? "news"}`}>
              View section <ChevronRight size={14} />
            </Link>
          </aside>

          <ArticleImage
            seed={`${article.slug}-secondary`}
            caption="Sample supporting image for the demo article page."
          />

          <div className="article-tags">
            {article.tags.map((tag) => (
              <Link href={`/latest?tag=${tag.slug}`} key={tag.id}>
                {tag.name}
              </Link>
            ))}
          </div>

          <ShareRow title={article.title} url={articleUrl} />

          <section className="article-comments" id="comments">
            <h2>Comments</h2>
            <div className="comment-box">
              <MessageCircle size={34} />
              <p>
                {article.allowComments
                  ? commentAutoApprove
                    ? "Join the conversation."
                    : "Join the conversation. Comments are reviewed before appearing."
                  : "Comments are closed for this article."}
              </p>
            </div>

            {resolvedSearchParams.comment === "posted" ? (
              <p className="comment-status">
                Your comment has been posted.
              </p>
            ) : null}
            {resolvedSearchParams.comment === "pending" ? (
              <p className="comment-status">
                Your comment was received and is waiting for moderation.
              </p>
            ) : null}
            {resolvedSearchParams.comment === "invalid" ? (
              <p className="comment-status">
                Please provide a valid name, email address and comment.
              </p>
            ) : null}

            {article.allowComments ? (
              signedIn ? (
                <>
                  <p className="comment-auth">
                    Commenting as{" "}
                    <strong>{commenterName}</strong>.
                    {commentAutoApprove ? null : " Comments are reviewed before appearing."}
                  </p>
                  <form className="comment-form" action={`/articles/${article.slug}/comments`} method="post">
                    <label>
                      Comment
                      <textarea name="body" required minLength={5} rows={4} />
                    </label>
                    <button type="submit">Submit comment</button>
                  </form>
                </>
              ) : (
                <>
                  <form className="comment-form" action={`/articles/${article.slug}/comments`} method="post">
                    <label>
                      Name
                      <input name="authorName" required maxLength={160} />
                    </label>
                    <label>
                      Email
                      <input name="authorEmail" required type="email" maxLength={320} />
                    </label>
                    <label>
                      Comment
                      <textarea name="body" required minLength={5} rows={4} />
                    </label>
                    <button type="submit">Submit comment</button>
                  </form>
                  <p className="comment-auth">
                    Have an account?{" "}
                    <Link href={loginCallbackUrl}>
                      Sign in
                    </Link>{" "}
                    to skip entering your details.
                  </p>
                </>
              )
            ) : null}

            {articleComments.length === 0 ? (
              <p className="comment-empty">No approved comments yet.</p>
            ) : (
              articleComments.map((comment) => (
                <article key={comment.id}>
                  <h3>{comment.userName ?? comment.authorName ?? "Reader"}</h3>
                  <p>{comment.body}</p>
                  <div>
                    <CommentActions
                      commentId={comment.id}
                      initialLikes={comment.likes}
                      initialDislikes={comment.dislikes}
                      initialReaction={comment.myReaction}
                      signedIn={signedIn}
                      loginUrl={loginCallbackUrl}
                    />
                    <span>{formatDate(comment.createdAt)}</span>
                  </div>
                </article>
              ))
            )}
          </section>
        </article>

        <aside className="article-rail">
          <section className="rail-card rail-card-primary">
            <h2>More top stories</h2>
            {relatedArticles.map((story) => (
              <Link href={`/articles/${story.slug}`} key={story.id}>
                <Image
                  src={story.heroImageUrl ?? fallbackImage(story.slug)}
                  alt={story.heroImageAlt ?? story.title}
                  width={164}
                  height={124}
                  className="rail-thumb-image"
                />
                <strong>{story.title}</strong>
              </Link>
            ))}
          </section>

          <section className="rail-card">
            <h2>Most read</h2>
            <ol className="most-read-list">
              {mostReadArticles.map((item, index) => (
                <li key={item.id}>
                  <span>{index + 1}</span>
                  <Link href={`/articles/${item.slug}`}>{item.title}</Link>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
