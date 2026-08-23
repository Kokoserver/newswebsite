"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import slugify from "slugify";
import { z } from "zod";

import { hasPermission, requireAdminUser, requireArticleAccess } from "@/src/admin/permissions";
import { checked, dateOrNull, optionalText, textValue } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import {
  articleCategories, articleRevisions, articleTags, articles, auditLogs,
  articleStatusValues, articleTypeValues,
} from "@/src/db/schema";

const articleInput = z.object({
  title: z.string().trim().min(5).max(300),
  slug: z.string().trim().min(1).max(320),
  subtitle: z.string().max(500).nullable(),
  excerpt: z.string().max(1200).nullable(),
  status: z.enum(articleStatusValues),
  type: z.enum(articleTypeValues),
  authorId: z.string().uuid(),
  heroImageId: z.string().uuid().nullable(),
  heroVideoId: z.string().uuid().nullable(),
  seoTitle: z.string().max(70).nullable(),
  seoDescription: z.string().max(170).nullable(),
  canonicalUrl: z.url().nullable(),
  sourceName: z.string().max(200).nullable(),
  sourceUrl: z.url().nullable(),
  scheduledAt: z.date().nullable(),
  renderedContent: z.string().min(1),
  content: z.unknown(),
  categories: z.array(z.string().uuid()).max(20),
  tags: z.array(z.string().uuid()).max(50),
  primaryCategoryId: z.string().uuid().nullable(),
  isFeatured: z.boolean(),
  allowComments: z.boolean(),
});

function ids(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

function parseArticle(formData: FormData, actorId: string, canEditAll: boolean) {
  const title = textValue(formData, "title");
  const rawSlug = optionalText(formData, "slug") ?? title;
  const renderedContent = sanitizeHtml(textValue(formData, "renderedContent"), {
    allowedTags: ["p", "h2", "h3", "h4", "strong", "em", "u", "s", "a", "blockquote", "ul", "ol", "li", "br", "hr", "code", "pre", "figure", "figcaption", "img", "video"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      figure: ["data-media-kind", "data-media-id"],
      img: ["src", "alt", "title", "loading"],
      video: ["src", "poster", "controls", "preload"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"], video: ["http", "https"] },
    allowProtocolRelative: false,
  });
  let content: unknown;
  try { content = JSON.parse(textValue(formData, "contentJson")); } catch { content = { type: "doc", content: [] }; }
  const status = textValue(formData, "status");
  const categories = ids(formData, "categoryIds");
  return articleInput.parse({
    title,
    slug: slugify(rawSlug, { lower: true, strict: true, trim: true }),
    subtitle: optionalText(formData, "subtitle"),
    excerpt: optionalText(formData, "excerpt"),
    status: canEditAll ? status : status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT",
    type: textValue(formData, "type"),
    authorId: canEditAll ? textValue(formData, "authorId") : actorId,
    heroImageId: optionalText(formData, "heroImageId"),
    heroVideoId: optionalText(formData, "heroVideoId"),
    seoTitle: optionalText(formData, "seoTitle"),
    seoDescription: optionalText(formData, "seoDescription"),
    canonicalUrl: optionalText(formData, "canonicalUrl"),
    sourceName: optionalText(formData, "sourceName"),
    sourceUrl: optionalText(formData, "sourceUrl"),
    scheduledAt: dateOrNull(formData, "scheduledAt"),
    renderedContent,
    content,
    categories,
    tags: ids(formData, "tagIds"),
    primaryCategoryId: optionalText(formData, "primaryCategoryId") ?? categories[0] ?? null,
    isFeatured: checked(formData, "isFeatured"),
    allowComments: checked(formData, "allowComments"),
  });
}

function publicationDates(status: (typeof articleStatusValues)[number], scheduledAt: Date | null, previousPublishedAt?: Date | null) {
  if (status === "SCHEDULED" && !scheduledAt) throw new Error("A scheduled article requires a publication date.");
  return {
    scheduledAt: status === "SCHEDULED" ? scheduledAt : null,
    publishedAt: status === "PUBLISHED" ? previousPublishedAt ?? new Date() : previousPublishedAt ?? null,
  };
}

export async function saveArticle(articleId: string | null, formData: FormData) {
  const actor = articleId ? await requireArticleAccess(articleId) : await requireAdminUser("articles:create");
  const canEditAll = hasPermission(actor.role, "articles:edit-all");
  const input = parseArticle(formData, actor.id, canEditAll);
  if ((input.status === "PUBLISHED" || input.status === "SCHEDULED") && !hasPermission(actor.role, "articles:publish")) {
    throw new Error("You do not have permission to publish articles.");
  }

  const db = await getDb();
  let id = articleId;
  await db.transaction(async (tx) => {
    const existing = articleId ? await tx.query.articles.findFirst({ where: eq(articles.id, articleId) }) : null;
    if (articleId && !existing) throw new Error("Article not found.");
    const dates = publicationDates(input.status, input.scheduledAt, existing?.publishedAt);
    const values = {
      title: input.title, slug: input.slug, subtitle: input.subtitle, excerpt: input.excerpt,
      content: input.content, renderedContent: input.renderedContent, status: input.status, type: input.type,
      authorId: input.authorId, heroImageId: input.heroImageId, heroVideoId: input.heroVideoId,
      seoTitle: input.seoTitle, seoDescription: input.seoDescription, canonicalUrl: input.canonicalUrl,
      sourceName: input.sourceName, sourceUrl: input.sourceUrl, isFeatured: input.isFeatured,
      allowComments: input.allowComments, scheduledAt: dates.scheduledAt, publishedAt: dates.publishedAt,
      readingMinutes: Math.max(1, Math.ceil(input.renderedContent.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 220)),
      updatedAt: new Date(), deletedAt: null,
    };
    if (existing) {
      await tx.update(articles).set(values).where(eq(articles.id, existing.id));
      id = existing.id;
    } else {
      const [created] = await tx.insert(articles).values(values).returning({ id: articles.id });
      id = created.id;
    }
    if (!id) throw new Error("Article could not be saved.");
    await tx.insert(articleRevisions).values({ articleId: id, editorId: actor.id, title: input.title, content: input.content });
    await tx.delete(articleCategories).where(eq(articleCategories.articleId, id));
    if (input.categories.length) await tx.insert(articleCategories).values(input.categories.map((categoryId) => ({ articleId: id!, categoryId, isPrimary: categoryId === input.primaryCategoryId })));
    await tx.delete(articleTags).where(eq(articleTags.articleId, id));
    if (input.tags.length) await tx.insert(articleTags).values(input.tags.map((tagId) => ({ articleId: id!, tagId })));
    await tx.insert(auditLogs).values({
      actorId: actor.id, articleId: id, action: existing ? "UPDATE" : "CREATE",
      entityType: "article", entityId: id, summary: `${existing ? "Updated" : "Created"} ${input.title}`,
      metadata: { status: input.status },
    });
  });

  revalidatePath("/");
  revalidatePath("/latest");
  revalidatePath("/admin");
  revalidatePath("/admin/articles");
  redirect(`/admin/articles/${id}?saved=1`);
}

export async function archiveArticle(articleId: string) {
  const actor = await requireArticleAccess(articleId);
  const db = await getDb();
  await db.transaction(async (tx) => {
    const article = await tx.query.articles.findFirst({ columns: { title: true }, where: eq(articles.id, articleId) });
    if (!article) return;
    await tx.update(articles).set({ status: "ARCHIVED", deletedAt: new Date(), updatedAt: new Date() }).where(eq(articles.id, articleId));
    await tx.insert(auditLogs).values({ actorId: actor.id, articleId, action: "DELETE", entityType: "article", entityId: articleId, summary: `Archived ${article.title}`, metadata: {} });
  });
  revalidatePath("/");
  revalidatePath("/admin/articles");
  redirect("/admin/articles");
}
