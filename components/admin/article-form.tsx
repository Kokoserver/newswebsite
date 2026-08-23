import Link from "next/link";

import ArticleEditor from "@/components/admin/article-editor";
import MediaPickerField from "@/components/admin/media-picker-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { formatDateTimeLocal, humanize } from "@/src/admin/shared";
import { articleStatusValues, articleTypeValues } from "@/src/db/schema";

type ArticleRecord = {
  id: string; title: string; slug: string; subtitle: string | null; excerpt: string | null;
  renderedContent: string | null; status: (typeof articleStatusValues)[number]; type: (typeof articleTypeValues)[number];
  authorId: string; heroImageId: string | null; heroVideoId: string | null; seoTitle: string | null;
  seoDescription: string | null; canonicalUrl: string | null; sourceName: string | null; sourceUrl: string | null;
  isFeatured: boolean; allowComments: boolean; scheduledAt: Date | null; publishedAt: Date | null;
};

export default function ArticleForm({
  article,
  action,
  authors,
  categories,
  tags,
  selectedCategoryIds = [],
  selectedTagIds = [],
  primaryCategoryId,
  canPublish,
  canAssign,
}: {
  article?: ArticleRecord;
  action: (formData: FormData) => Promise<void>;
  authors: Array<{ id: string; name: string | null; email: string }>;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  selectedCategoryIds?: string[];
  selectedTagIds?: string[];
  primaryCategoryId?: string | null;
  canPublish: boolean;
  canAssign: boolean;
}) {
  return (
    <form action={action} className="admin-article-form">
      <div className="admin-editor-main">
        <section className="admin-card admin-form-section">
          <label className="admin-title-input">Headline<input name="title" required minLength={5} maxLength={300} defaultValue={article?.title ?? ""} placeholder="Write a clear, specific headline" /></label>
          <div className="admin-form-grid two">
            <label>Slug<input name="slug" defaultValue={article?.slug ?? ""} placeholder="Generated from headline" /></label>
            <label>Article type<select name="type" defaultValue={article?.type ?? "STANDARD"}>{articleTypeValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          </div>
          <label>Subtitle<input name="subtitle" defaultValue={article?.subtitle ?? ""} maxLength={500} /></label>
          <label>Excerpt<textarea name="excerpt" rows={3} maxLength={1200} defaultValue={article?.excerpt ?? ""} /></label>
        </section>
        <section className="admin-card admin-form-section">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Story body</span><h2>Write and format</h2></div><small>Changes create a revision automatically.</small></div>
          <ArticleEditor initialHtml={article?.renderedContent} />
        </section>
        <section className="admin-card admin-form-section">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Discovery</span><h2>Search and source</h2></div></div>
          <div className="admin-form-grid two">
            <label>SEO title<input name="seoTitle" maxLength={70} defaultValue={article?.seoTitle ?? ""} /><small>{article?.seoTitle?.length ?? 0}/70 characters</small></label>
            <label>Canonical URL<input name="canonicalUrl" type="url" defaultValue={article?.canonicalUrl ?? ""} /></label>
            <label className="span-two">SEO description<textarea name="seoDescription" rows={3} maxLength={170} defaultValue={article?.seoDescription ?? ""} /></label>
            <label>Source name<input name="sourceName" defaultValue={article?.sourceName ?? ""} /></label>
            <label>Source URL<input name="sourceUrl" type="url" defaultValue={article?.sourceUrl ?? ""} /></label>
          </div>
        </section>
      </div>
      <aside className="admin-editor-aside">
        <section className="admin-card admin-form-section admin-publish-card">
          <span className="admin-eyebrow">Workflow</span>
          <label>Status<select name="status" defaultValue={article?.status ?? "DRAFT"}>{articleStatusValues.filter((status) => canPublish || ["DRAFT", "IN_REVIEW"].includes(status)).map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Schedule time<input name="scheduledAt" type="datetime-local" defaultValue={formatDateTimeLocal(article?.scheduledAt)} /></label>
          <label>Author<select name="authorId" defaultValue={article?.authorId ?? authors[0]?.id} disabled={!canAssign}>{authors.map((author) => <option key={author.id} value={author.id}>{author.name ?? author.email}</option>)}</select>{!canAssign ? <input type="hidden" name="authorId" value={article?.authorId ?? authors[0]?.id} /> : null}</label>
          <label className="admin-check"><input type="checkbox" name="isFeatured" defaultChecked={article?.isFeatured} />Feature this article</label>
          <label className="admin-check"><input type="checkbox" name="allowComments" defaultChecked={article?.allowComments ?? true} />Allow comments</label>
          <SubmitButton>{article ? "Save changes" : "Create article"}</SubmitButton>
          {article?.status === "PUBLISHED" ? <Link className="admin-secondary-link" target="_blank" href={`/articles/${article.slug}`}>Open published story</Link> : null}
        </section>
        <section className="admin-card admin-form-section">
          <span className="admin-eyebrow">Classification</span>
          <fieldset className="admin-choice-list"><legend>Categories</legend>{categories.map((category) => <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={selectedCategoryIds.includes(category.id)} />{category.name}</label>)}</fieldset>
          <label>Primary category<select name="primaryCategoryId" defaultValue={primaryCategoryId ?? ""}><option value="">Use first selected</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <fieldset className="admin-choice-list"><legend>Tags</legend>{tags.map((tag) => <label key={tag.id}><input type="checkbox" name="tagIds" value={tag.id} defaultChecked={selectedTagIds.includes(tag.id)} />{tag.name}</label>)}</fieldset>
        </section>
        <section className="admin-card admin-form-section">
          <span className="admin-eyebrow">Visuals</span>
          <MediaPickerField name="heroImageId" label="Hero image" kind="IMAGE" initialId={article?.heroImageId} />
          <MediaPickerField name="heroVideoId" label="Hero video" kind="VIDEO" initialId={article?.heroVideoId} />
          <Link className="admin-secondary-link" href="/admin/media">Open media library</Link>
        </section>
      </aside>
    </form>
  );
}
