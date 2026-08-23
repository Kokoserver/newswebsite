import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import ArticleForm from "@/components/admin/article-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { archiveArticle, saveArticle } from "@/src/admin/article-actions";
import { hasPermission, requireArticleAccess } from "@/src/admin/permissions";
import { getDb } from "@/src/db";
import { articleCategories, articleTags, categories, tags, users } from "@/src/db/schema";

export default async function EditArticlePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const actor = await requireArticleAccess(id);
  const db = await getDb();
  const [article, authors, categoryRows, tagRows, selectedCategories, selectedTags, query] = await Promise.all([
    db.query.articles.findFirst({ where: (table, { eq: equals }) => equals(table.id, id) }),
    db.query.users.findMany({ columns: { id: true, name: true, email: true }, where: inArray(users.role, ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"]), orderBy: [asc(users.name)] }),
    db.query.categories.findMany({ columns: { id: true, name: true }, orderBy: [asc(categories.position), asc(categories.name)] }),
    db.query.tags.findMany({ columns: { id: true, name: true }, orderBy: [asc(tags.name)] }),
    db.select({ id: articleCategories.categoryId, primary: articleCategories.isPrimary }).from(articleCategories).where(eq(articleCategories.articleId, id)),
    db.select({ id: articleTags.tagId }).from(articleTags).where(eq(articleTags.articleId, id)),
    searchParams,
  ]);
  if (!article) notFound();
  const canAssign = hasPermission(actor.role, "articles:edit-all");
  return <>{query.saved ? <div className="admin-toast">Article changes saved.</div> : null}<header className="admin-page-header compact"><div><span className="admin-eyebrow">Editing</span><h1>{article.title}</h1><p>Last updated {new Date(article.updatedAt).toLocaleString()}.</p></div><form action={archiveArticle.bind(null, id)}><SubmitButton danger>Archive article</SubmitButton></form></header><ArticleForm article={article} action={saveArticle.bind(null, id)} authors={canAssign ? authors : authors.filter((author) => author.id === actor.id)} categories={categoryRows} tags={tagRows} selectedCategoryIds={selectedCategories.map((item) => item.id)} selectedTagIds={selectedTags.map((item) => item.id)} primaryCategoryId={selectedCategories.find((item) => item.primary)?.id} canPublish={hasPermission(actor.role, "articles:publish")} canAssign={canAssign} /></>;
}
