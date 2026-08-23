import { asc, eq, inArray } from "drizzle-orm";

import ArticleForm from "@/components/admin/article-form";
import { hasPermission, requireAdminUser } from "@/src/admin/permissions";
import { saveArticle } from "@/src/admin/article-actions";
import { getDb } from "@/src/db";
import { categories, tags, users } from "@/src/db/schema";

export default async function NewArticlePage() {
  const user = await requireAdminUser("articles:create");
  const db = await getDb();
  const [authors, categoryRows, tagRows] = await Promise.all([
    db.query.users.findMany({ columns: { id: true, name: true, email: true }, where: inArray(users.role, ["SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR"]), orderBy: [asc(users.name)] }),
    db.query.categories.findMany({ columns: { id: true, name: true }, where: eq(categories.isActive, true), orderBy: [asc(categories.position), asc(categories.name)] }),
    db.query.tags.findMany({ columns: { id: true, name: true }, orderBy: [asc(tags.name)] }),
  ]);
  const canAssign = hasPermission(user.role, "articles:edit-all");
  const availableAuthors = canAssign ? authors : authors.filter((author) => author.id === user.id);
  return <><header className="admin-page-header compact"><div><span className="admin-eyebrow">New story</span><h1>Create article</h1><p>Build the story, then save as draft or move it through review.</p></div></header><ArticleForm action={saveArticle.bind(null, null)} authors={availableAuthors} categories={categoryRows} tags={tagRows} canPublish={hasPermission(user.role, "articles:publish")} canAssign={canAssign} /></>;
}
