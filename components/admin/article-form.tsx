import Link from "next/link";

import ArticleDiscoveryFields from "@/components/admin/article-discovery-fields";
import ArticleEditor from "@/components/admin/article-editor";
import InfoTooltip from "@/components/admin/info-tooltip";
import MediaPickerField from "@/components/admin/media-picker-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { formatDateTimeLocal, humanize } from "@/src/admin/shared";
import { getSiteUrl } from "@/src/config";
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
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Story body</span><h2>Write and format <InfoTooltip text="Use the toolbar for headings, links, lists and media. Every save creates a recoverable article revision." /></h2></div><small>Changes create a revision automatically.</small></div>
          <ArticleEditor initialHtml={article?.renderedContent} />
        </section>
        <section className="admin-card admin-form-section">
          <div className="admin-section-heading"><div><span className="admin-eyebrow">Discovery</span><h2>Search and source <InfoTooltip text="SEO fields control how the article appears in search results. Generated defaults follow the headline, excerpt and slug until you edit them." /></h2></div></div>
          <ArticleDiscoveryFields
            initialTitle={article?.title}
            initialSubtitle={article?.subtitle}
            initialExcerpt={article?.excerpt}
            initialSlug={article?.slug}
            initialSeoTitle={article?.seoTitle}
            initialSeoDescription={article?.seoDescription}
            initialCanonicalUrl={article?.canonicalUrl}
            initialSourceName={article?.sourceName}
            initialSourceUrl={article?.sourceUrl}
            siteUrl={getSiteUrl().replace(/\/+$/, "")}
          />
        </section>
      </div>
      <aside className="admin-editor-aside">
        <section className="admin-card admin-form-section admin-publish-card">
          <div className="admin-help-heading"><span className="admin-eyebrow">Workflow</span><InfoTooltip text="Choose the editorial state, schedule publication when needed, assign ownership, then save. Only authorized roles can publish." /></div>
          <label>Status<select name="status" defaultValue={article?.status ?? "DRAFT"}>{articleStatusValues.filter((status) => canPublish || ["DRAFT", "IN_REVIEW"].includes(status)).map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Schedule time<input name="scheduledAt" type="datetime-local" defaultValue={formatDateTimeLocal(article?.scheduledAt)} /></label>
          <label>Author<select name="authorId" defaultValue={article?.authorId ?? authors[0]?.id} disabled={!canAssign}>{authors.map((author) => <option key={author.id} value={author.id}>{author.name ?? author.email}</option>)}</select>{!canAssign ? <input type="hidden" name="authorId" value={article?.authorId ?? authors[0]?.id} /> : null}</label>
          <label className="admin-check"><input type="checkbox" name="isFeatured" defaultChecked={article?.isFeatured} />Feature this article</label>
          <label className="admin-check"><input type="checkbox" name="allowComments" defaultChecked={article?.allowComments ?? true} />Allow comments</label>
          <SubmitButton>{article ? "Save changes" : "Create article"}</SubmitButton>
          {article?.status === "PUBLISHED" ? <Link className="admin-secondary-link" target="_blank" href={`/articles/${article.slug}`}>Open published story</Link> : null}
        </section>
        <section className="admin-card admin-form-section">
          <div className="admin-help-heading"><span className="admin-eyebrow">Classification</span><InfoTooltip text="Categories determine where the story appears. The primary category is used as its main section; tags support related content and discovery." /></div>
          <fieldset className="admin-choice-list"><legend>Categories</legend>{categories.map((category) => <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={selectedCategoryIds.includes(category.id)} />{category.name}</label>)}</fieldset>
          <label>Primary category<select name="primaryCategoryId" defaultValue={primaryCategoryId ?? ""}><option value="">Use first selected</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <fieldset className="admin-choice-list"><legend>Tags</legend>{tags.map((tag) => <label key={tag.id}><input type="checkbox" name="tagIds" value={tag.id} defaultChecked={selectedTagIds.includes(tag.id)} />{tag.name}</label>)}</fieldset>
        </section>
        <section className="admin-card admin-form-section">
          <div className="admin-help-heading"><span className="admin-eyebrow">Visuals</span><InfoTooltip text="The article banner leads the story visually. A featured video is optional. Select an existing asset or upload one from either media-library dialog." /></div>
          <MediaPickerField name="heroImageId" label="Article banner" kind="IMAGE" initialId={article?.heroImageId} />
          <MediaPickerField name="heroVideoId" label="Featured video" kind="VIDEO" initialId={article?.heroVideoId} />
        </section>
      </aside>
    </form>
  );
}
