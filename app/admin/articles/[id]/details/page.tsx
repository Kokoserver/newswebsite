import {
  and,
  desc,
  eq,
  gte,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import {
  ExternalLink,
  Eye,
  FilePenLine,
  History,
  MessageSquareText,
  Pencil,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/admin/submit-button";
import { moderateComment } from "@/src/admin/operations-actions";
import { hasPermission, requireArticleAccess } from "@/src/admin/permissions";
import { humanize } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import {
  articleCategories,
  articleRevisions,
  articleTags,
  articleViewDailyStats,
  articleViews,
  articles,
  auditLogs,
  categories,
  comments,
  commentReactions,
  commentStatusValues,
  homepageItems,
  homepageSections,
  media,
  tags,
  users,
} from "@/src/db/schema";

const commentPageSize = 15;

type SearchParams = {
  commentPage?: string;
  commentStatus?: string;
};

function formatDate(value: Date | null) {
  return value ? value.toLocaleString() : "Not set";
}

function commentsPageHref(id: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (status) params.set("commentStatus", status);
  params.set("commentPage", String(page));
  return `/admin/articles/${id}/details?${params}#comments`;
}

export default async function ArticleDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const actor = await requireArticleAccess(id);
  const query = await searchParams;
  const requestedCommentStatus = query.commentStatus?.trim() ?? "";
  const commentStatus = commentStatusValues.includes(
    requestedCommentStatus as (typeof commentStatusValues)[number],
  )
    ? requestedCommentStatus as (typeof commentStatusValues)[number]
    : "";
  const commentPage = Math.max(1, Number.parseInt(query.commentPage ?? "1", 10) || 1);
  const db = await getDb();
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, id),
  });
  if (!article) notFound();

  const commentWhere = and(
    eq(comments.articleId, id),
    commentStatus ? eq(comments.status, commentStatus) : undefined,
  );
  const mediaIds = [
    article.heroImageId,
    article.heroVideoId,
    article.mobileHeroImageId,
    article.socialImageId,
  ].filter((value): value is string => Boolean(value));
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  const startDay = thirtyDaysAgo.toISOString().slice(0, 10);

  const [
    author,
    categoryRows,
    tagRows,
    mediaRows,
    viewSummary,
    dailyViews,
    commentStatusRows,
    filteredCommentCountRows,
    commentRows,
    revisionCountRows,
    reactionRows,
    placementRows,
    historyRows,
  ] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, article.authorId) }),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug, isPrimary: articleCategories.isPrimary })
      .from(articleCategories)
      .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(eq(articleCategories.articleId, id))
      .orderBy(desc(articleCategories.isPrimary), categories.name),
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, id))
      .orderBy(tags.name),
    mediaIds.length > 0
      ? db.query.media.findMany({ where: inArray(media.id, mediaIds) })
      : Promise.resolve([]),
    db
      .select({
        trackedViews: sql<number>`cast(count(*) as integer)`,
        uniqueVisitors: sql<number>`cast(count(distinct ${articleViews.visitorHash}) as integer)`,
      })
      .from(articleViews)
      .where(eq(articleViews.articleId, id)),
    db
      .select({ day: articleViewDailyStats.day, views: articleViewDailyStats.views })
      .from(articleViewDailyStats)
      .where(and(eq(articleViewDailyStats.articleId, id), gte(articleViewDailyStats.day, startDay)))
      .orderBy(articleViewDailyStats.day),
    db
      .select({ status: comments.status, count: sql<number>`cast(count(*) as integer)` })
      .from(comments)
      .where(eq(comments.articleId, id))
      .groupBy(comments.status),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(comments)
      .where(commentWhere),
    db
      .select({
        id: comments.id,
        body: comments.body,
        status: comments.status,
        authorName: comments.authorName,
        authorEmail: comments.authorEmail,
        createdAt: comments.createdAt,
        userName: users.name,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(commentWhere)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(commentPageSize)
      .offset((commentPage - 1) * commentPageSize),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, id)),
    db
      .select({ type: commentReactions.reactionType, count: sql<number>`cast(count(*) as integer)` })
      .from(commentReactions)
      .innerJoin(comments, eq(commentReactions.commentId, comments.id))
      .where(eq(comments.articleId, id))
      .groupBy(commentReactions.reactionType),
    db
      .select({
        sectionTitle: homepageSections.title,
        position: homepageItems.position,
        startsAt: homepageItems.startsAt,
        endsAt: homepageItems.endsAt,
      })
      .from(homepageItems)
      .innerJoin(homepageSections, eq(homepageItems.sectionId, homepageSections.id))
      .where(eq(homepageItems.articleId, id))
      .orderBy(homepageSections.position, homepageItems.position),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        summary: auditLogs.summary,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(or(eq(auditLogs.articleId, id), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8),
  ]);

  const commentCounts = Object.fromEntries(commentStatusRows.map((row) => [row.status, Number(row.count)]));
  const totalComments = commentStatusRows.reduce((sum, row) => sum + Number(row.count), 0);
  const filteredCommentCount = Number(filteredCommentCountRows[0]?.count ?? 0);
  const totalCommentPages = Math.max(1, Math.ceil(filteredCommentCount / commentPageSize));
  const firstComment = commentRows.length === 0 ? 0 : (commentPage - 1) * commentPageSize + 1;
  const lastComment = Math.min(commentPage * commentPageSize, filteredCommentCount);
  const revisions = Number(revisionCountRows[0]?.count ?? 0);
  const uniqueVisitors = Number(viewSummary[0]?.uniqueVisitors ?? 0);
  const trackedViews = Number(viewSummary[0]?.trackedViews ?? 0);
  const reactionCounts = Object.fromEntries(reactionRows.map((row) => [row.type, Number(row.count)]));
  const mediaById = new Map(mediaRows.map((item) => [item.id, item]));
  const mediaAssignments = [
    ["Hero image", article.heroImageId],
    ["Hero video", article.heroVideoId],
    ["Mobile hero image", article.mobileHeroImageId],
    ["Social image", article.socialImageId],
  ] as const;
  const contentText = (article.renderedContent ?? JSON.stringify(article.content))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = contentText ? contentText.split(" ").length : 0;
  const maxDailyViews = Math.max(1, ...dailyViews.map((item) => item.views));
  const canModerate = hasPermission(actor.role, "comments:moderate");

  return (
    <>
      <header className="admin-page-header compact">
        <div>
          <span className="admin-eyebrow">Article intelligence</span>
          <h1>{article.title}</h1>
          <p>Editorial record, audience performance, publishing context and reader discussion.</p>
        </div>
        <div className="admin-detail-actions">
          <Link className="admin-secondary-link" href="/admin/articles">All articles</Link>
          {article.status === "PUBLISHED" ? (
            <Link className="admin-secondary-link" href={`/articles/${article.slug}`} target="_blank">
              <ExternalLink size={15} />View publication
            </Link>
          ) : null}
          <Link className="admin-button" href={`/admin/articles/${id}`}><Pencil size={15} />Edit article</Link>
        </div>
      </header>

      <section className="admin-stat-grid">
        <div className="admin-stat-card blue">
          <div><span>Total views</span><strong>{article.viewCount.toLocaleString()}</strong><small>{trackedViews.toLocaleString()} tracked view events</small></div>
          <Eye size={22} />
        </div>
        <div className="admin-stat-card green">
          <div><span>Unique visitors</span><strong>{uniqueVisitors.toLocaleString()}</strong><small>Based on available visitor identifiers</small></div>
          <UsersRound size={22} />
        </div>
        <div className="admin-stat-card amber">
          <div><span>Comments</span><strong>{totalComments.toLocaleString()}</strong><small>{Number(commentCounts.APPROVED ?? 0).toLocaleString()} approved</small></div>
          <MessageSquareText size={22} />
        </div>
        <div className="admin-stat-card red">
          <div><span>Revisions</span><strong>{revisions.toLocaleString()}</strong><small>{wordCount.toLocaleString()} words in current version</small></div>
          <History size={22} />
        </div>
      </section>

      <section className="admin-article-overview-grid">
        <div className="admin-card admin-article-detail-card">
          <div className="admin-section-heading">
            <div><span className="admin-eyebrow">Editorial record</span><h2>Article information</h2></div>
            <span className={`admin-status ${article.status.toLowerCase()}`}>{humanize(article.status)}</span>
          </div>
          <dl className="admin-detail-list">
            <div><dt>Article type</dt><dd>{humanize(article.type)}</dd></div>
            <div><dt>Reading time</dt><dd>{article.readingMinutes} minutes</dd></div>
            <div><dt>Created</dt><dd>{formatDate(article.createdAt)}</dd></div>
            <div><dt>Last updated</dt><dd>{formatDate(article.updatedAt)}</dd></div>
            <div><dt>Published</dt><dd>{formatDate(article.publishedAt)}</dd></div>
            <div><dt>Scheduled</dt><dd>{formatDate(article.scheduledAt)}</dd></div>
            <div><dt>Featured</dt><dd>{article.isFeatured ? "Yes" : "No"}</dd></div>
            <div><dt>Comments allowed</dt><dd>{article.allowComments ? "Yes" : "No"}</dd></div>
            <div className="admin-detail-span"><dt>Slug</dt><dd><code>/{article.slug}</code></dd></div>
            <div className="admin-detail-span"><dt>Subtitle</dt><dd>{article.subtitle ?? "Not provided"}</dd></div>
            <div className="admin-detail-span"><dt>Excerpt</dt><dd>{article.excerpt ?? "Not provided"}</dd></div>
          </dl>
        </div>

        <aside className="admin-article-detail-stack">
          <div className="admin-card admin-article-detail-card">
            <div className="admin-section-heading">
              <div><span className="admin-eyebrow">Ownership</span><h2>Author</h2></div>
            </div>
            <div className="admin-article-author-card">
              <div className="admin-user-avatar">{(author?.name ?? author?.email ?? "A").slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{author?.name ?? "Unnamed author"}</strong>
                <span>{author?.email ?? "No email available"}</span>
                <small>{author ? `${humanize(author.role)} · ${humanize(author.status)}` : "Account unavailable"}</small>
              </div>
            </div>
          </div>

          <div className="admin-card admin-article-detail-card">
            <div className="admin-section-heading">
              <div><span className="admin-eyebrow">Classification</span><h2>Taxonomy</h2></div>
            </div>
            <h3>Categories</h3>
            <div className="admin-pill-list">
              {categoryRows.map((category) => <span key={category.id}>{category.name}{category.isPrimary ? " · Primary" : ""}</span>)}
              {categoryRows.length === 0 ? <small>No categories assigned.</small> : null}
            </div>
            <h3>Tags</h3>
            <div className="admin-pill-list">
              {tagRows.map((tag) => <span key={tag.id}>{tag.name}</span>)}
              {tagRows.length === 0 ? <small>No tags assigned.</small> : null}
            </div>
          </div>
        </aside>
      </section>

      <section className="admin-dashboard-grid analytics admin-article-analytics">
        <div className="admin-card admin-chart-card">
          <div className="admin-section-heading">
            <div><span className="admin-eyebrow">Last 30 days</span><h2>Daily views</h2></div>
            <small>{dailyViews.reduce((sum, item) => sum + item.views, 0).toLocaleString()} views</small>
          </div>
          <div className="admin-bar-chart">
            {dailyViews.map((item) => (
              <div key={item.day} title={`${item.day}: ${item.views.toLocaleString()} views`}>
                <span style={{ height: `${Math.max(3, item.views / maxDailyViews * 100)}%` }} />
                <small>{item.day.slice(5)}</small>
              </div>
            ))}
          </div>
          {dailyViews.length === 0 ? <p className="admin-empty">No view data recorded in the last 30 days.</p> : null}
        </div>

        <div className="admin-card admin-article-detail-card">
          <div className="admin-section-heading">
            <div><span className="admin-eyebrow">Distribution</span><h2>Homepage placements</h2></div>
          </div>
          <div className="admin-article-placement-list">
            {placementRows.map((placement, index) => (
              <div key={`${placement.sectionTitle}-${placement.position}-${index}`}>
                <strong>{placement.sectionTitle}</strong>
                <span>Position {placement.position}</span>
                <small>{placement.startsAt || placement.endsAt ? `${formatDate(placement.startsAt)} to ${formatDate(placement.endsAt)}` : "No publishing window"}</small>
              </div>
            ))}
            {placementRows.length === 0 ? <p className="admin-empty">Not assigned to a homepage section.</p> : null}
          </div>
        </div>
      </section>

      <section className="admin-article-support-grid">
        <div className="admin-card admin-article-detail-card">
          <div className="admin-section-heading">
            <div><span className="admin-eyebrow">Discovery</span><h2>SEO and source</h2></div>
          </div>
          <dl className="admin-detail-list one-column">
            <div><dt>SEO title</dt><dd>{article.seoTitle ?? "Uses article title"}</dd></div>
            <div><dt>SEO description</dt><dd>{article.seoDescription ?? "Not provided"}</dd></div>
            <div><dt>Canonical URL</dt><dd>{article.canonicalUrl ?? "Uses publication URL"}</dd></div>
            <div><dt>Source</dt><dd>{article.sourceName ?? "Original reporting"}</dd></div>
            <div><dt>Source URL</dt><dd>{article.sourceUrl ?? "Not provided"}</dd></div>
          </dl>
        </div>

        <div className="admin-card admin-article-detail-card">
          <div className="admin-section-heading">
            <div><span className="admin-eyebrow">Assets</span><h2>Assigned media</h2></div>
          </div>
          <div className="admin-article-media-list">
            {mediaAssignments.map(([label, mediaId]) => {
              const item = mediaId ? mediaById.get(mediaId) : null;
              return (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{item?.title ?? item?.slug ?? (mediaId ? "Media unavailable" : "Not assigned")}</strong>
                  {item ? <a href={item.publicUrl} target="_blank">Open asset <ExternalLink size={12} /></a> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="admin-card admin-article-detail-card">
          <div className="admin-section-heading">
            <div><span className="admin-eyebrow">Engagement</span><h2>Comment activity</h2></div>
          </div>
          <div className="admin-comment-summary">
            {commentStatusValues.map((status) => (
              <span key={status} className={`admin-comment-summary-chip ${status.toLowerCase()}`}>
                <strong>{Number(commentCounts[status] ?? 0).toLocaleString()}</strong>{humanize(status)}
              </span>
            ))}
          </div>
          <p className="admin-article-reactions">
            {Number(reactionCounts.LIKE ?? 0).toLocaleString()} likes · {Number(reactionCounts.DISLIKE ?? 0).toLocaleString()} dislikes
          </p>
        </div>
      </section>

      <section id="comments" className="admin-article-comments-section">
        <div className="admin-article-comments-head">
          <div><span className="admin-eyebrow">Reader discussion</span><h2>All comments</h2><p>Review every comment attached to this article.</p></div>
          <form>
            <label>
              Status
              <select name="commentStatus" defaultValue={commentStatus}>
                <option value="">All statuses</option>
                {commentStatusValues.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
              </select>
            </label>
            <button className="admin-button" type="submit">Filter comments</button>
          </form>
        </div>

        <div className="admin-moderation-list">
          {commentRows.map((comment) => (
            <article className="admin-card" key={comment.id}>
              <div className="admin-comment-head">
                <div className="admin-user-avatar">
                  {(comment.userName ?? comment.authorName ?? "G").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{comment.userName ?? comment.authorName ?? "Guest reader"}</strong>
                  <small>{comment.authorEmail ?? "Registered account"} · {comment.createdAt.toLocaleString()}</small>
                </div>
                <span className={`admin-status ${comment.status.toLowerCase()}`}>{humanize(comment.status)}</span>
              </div>
              <blockquote>{comment.body}</blockquote>
              {canModerate ? (
                <div className="admin-comment-foot">
                  <span>Comment ID: {comment.id}</span>
                  <form action={moderateComment.bind(null, comment.id)}>
                    <select name="status" defaultValue={comment.status}>
                      {commentStatusValues.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                    </select>
                    <SubmitButton>Apply</SubmitButton>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {commentRows.length === 0 ? <p className="admin-empty admin-card">No comments match this view.</p> : null}
        <nav className="admin-pagination" aria-label="Article comment pages">
          <Link
            aria-disabled={commentPage <= 1}
            href={commentsPageHref(id, commentStatus, Math.max(1, commentPage - 1))}
          >
            Previous
          </Link>
          <span>Showing {firstComment}-{lastComment} of {filteredCommentCount.toLocaleString()} · Page {commentPage} of {totalCommentPages}</span>
          <Link
            aria-disabled={commentPage >= totalCommentPages}
            href={commentsPageHref(id, commentStatus, commentPage + 1)}
          >
            Next
          </Link>
        </nav>
      </section>

      <section className="admin-card admin-article-detail-card admin-article-history">
        <div className="admin-section-heading">
          <div><span className="admin-eyebrow">Accountability</span><h2>Recent article history</h2></div>
          <FilePenLine size={18} />
        </div>
        {historyRows.map((entry) => (
          <div className="admin-article-history-row" key={entry.id}>
            <span className={`admin-status ${entry.action.toLowerCase()}`}>{humanize(entry.action)}</span>
            <div><strong>{entry.summary ?? `${humanize(entry.action)} article`}</strong><small>{entry.actorName ?? "System"} · {entry.createdAt.toLocaleString()}</small></div>
          </div>
        ))}
        {historyRows.length === 0 ? <p className="admin-empty">No article history has been recorded.</p> : null}
      </section>
    </>
  );
}
