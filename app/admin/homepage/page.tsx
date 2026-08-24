import { asc, desc, isNull } from "drizzle-orm";
import { ChevronDown, Layers3 } from "lucide-react";

import ArticlePickerField from "@/components/admin/article-picker-field";
import InfoTooltip from "@/components/admin/info-tooltip";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  deleteHomepageItem,
  deleteHomepageSection,
  saveHomepageItem,
  saveHomepageSection,
} from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { formatDateTimeLocal } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { homepageItems, homepageSectionKindValues, homepageSections, media } from "@/src/db/schema";

type MediaOption = {
  id: string;
  title: string | null;
  publicUrl: string;
};

type PlacementValues = {
  articleId: string | null;
  article: { title: string; status: string } | null;
  mediaId: string | null;
  position: number;
  titleOverride: string | null;
  dekOverride: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

function PlacementFields({
  item,
  mediaOptions,
  defaultPosition,
}: {
  item?: PlacementValues;
  mediaOptions: MediaOption[];
  defaultPosition: number;
}) {
  return (
    <>
      <ArticlePickerField
        name="articleId"
        label="Article"
        initialId={item?.articleId}
        initialTitle={item?.article?.title}
      />
      <label>
        Media
        <select name="mediaId" defaultValue={item?.mediaId ?? ""}>
          <option value="">Use article media</option>
          {mediaOptions.map((asset) => (
            <option key={asset.id} value={asset.id}>{asset.title ?? asset.publicUrl}</option>
          ))}
        </select>
      </label>
      <label>
        Position
        <input name="position" type="number" min="1" defaultValue={item?.position ?? defaultPosition} />
      </label>
      <label>
        Title override
        <input name="titleOverride" defaultValue={item?.titleOverride ?? ""} />
      </label>
      <label>
        Dek override
        <input name="dekOverride" defaultValue={item?.dekOverride ?? ""} />
      </label>
      <label>
        Starts
        <input name="startsAt" type="datetime-local" defaultValue={formatDateTimeLocal(item?.startsAt)} />
      </label>
      <label>
        Ends
        <input name="endsAt" type="datetime-local" defaultValue={formatDateTimeLocal(item?.endsAt)} />
      </label>
    </>
  );
}

export default async function HomepageAdminPage() {
  await requireAdminUser("homepage:manage");
  const db = await getDb();
  const [sections, items, mediaRows] = await Promise.all([
    db.query.homepageSections.findMany({ orderBy: [asc(homepageSections.position)] }),
    db.query.homepageItems.findMany({
      with: { article: { columns: { title: true, status: true } } },
      orderBy: [asc(homepageItems.position)],
    }),
    db.query.media.findMany({
      columns: { id: true, title: true, publicUrl: true },
      where: isNull(media.deletedAt),
      orderBy: [desc(media.createdAt)],
      limit: 200,
    }),
  ]);

  return (
    <>
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Front page</span>
          <h1>Homepage curation</h1>
          <p>Control section order, story placement and publishing windows.</p>
        </div>
      </header>

      <section className="admin-card admin-form-section">
        <div className="admin-section-heading">
          <div>
            <span className="admin-eyebrow">Layout</span>
            <h2>Create section <InfoTooltip text="A section is a named block on the homepage. Kind controls its presentation, while position controls its order from top to bottom." /></h2>
          </div>
        </div>
        <form
          action={saveHomepageSection.bind(null, null)}
          className="admin-form-grid four admin-section-create-form"
        >
          <label>Title<input name="title" required /></label>
          <label>Key<input name="key" placeholder="Generated from title" /></label>
          <label>
            Kind
            <select name="kind">
              {homepageSectionKindValues.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            Position
            <input name="position" type="number" min="1" defaultValue={sections.length + 1} />
          </label>
          <SubmitButton>Create section</SubmitButton>
        </form>
      </section>

      <div className="admin-homepage-list-heading">
        <div>
          <span className="admin-eyebrow">Section order</span>
          <h2>Homepage structure <InfoTooltip text="Open one section at a time to edit its settings and placements. Each placement can use an article's media or a separate asset and can have an optional publishing window." /></h2>
        </div>
        <span><Layers3 size={16} />{sections.length} sections</span>
      </div>

      <div className="admin-homepage-stack">
        {sections.map((section, index) => {
          const sectionItems = items.filter((item) => item.sectionId === section.id);

          return (
            <details
              className="admin-card admin-homepage-section"
              key={section.id}
              name="homepage-sections"
              open={index === 0}
            >
              <summary className="admin-homepage-section-summary">
                <span className="admin-homepage-position">{section.position}</span>
                <span className="admin-homepage-section-name">
                  <strong>{section.title}</strong>
                  <small>{section.key}</small>
                </span>
                <span className="admin-homepage-kind">{section.kind.replaceAll("_", " ")}</span>
                <span className="admin-homepage-count">
                  {sectionItems.length} {sectionItems.length === 1 ? "placement" : "placements"}
                </span>
                <ChevronDown size={18} />
              </summary>

              <div className="admin-homepage-section-body">
                <div className="admin-homepage-section-head">
                <form action={saveHomepageSection.bind(null, section.id)} className="admin-form-grid four">
                  <label>Title<input name="title" defaultValue={section.title} /></label>
                  <label>Key<input name="key" defaultValue={section.key} /></label>
                  <label>
                    Kind
                    <select name="kind" defaultValue={section.kind}>
                      {homepageSectionKindValues.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    Position
                    <input name="position" type="number" min="1" defaultValue={section.position} />
                  </label>
                  <SubmitButton>Save section</SubmitButton>
                </form>
                <form action={deleteHomepageSection.bind(null, section.id)}>
                  <SubmitButton danger>Delete section</SubmitButton>
                </form>
                </div>

                <div className="admin-placement-list">
                  {sectionItems.map((item) => (
                    <article key={item.id}>
                      <form action={saveHomepageItem.bind(null, item.id)} className="admin-form-grid placement">
                        <input type="hidden" name="sectionId" value={section.id} />
                        <PlacementFields item={item} mediaOptions={mediaRows} defaultPosition={item.position} />
                        <SubmitButton>Save placement</SubmitButton>
                      </form>
                      <div className="admin-placement-title">{item.article?.title ?? "Media placement"}</div>
                      <form action={deleteHomepageItem.bind(null, item.id)}>
                        <SubmitButton danger>Remove</SubmitButton>
                      </form>
                    </article>
                  ))}
                </div>

                <form
                  action={saveHomepageItem.bind(null, null)}
                  className="admin-form-grid placement admin-new-placement"
                >
                  <input type="hidden" name="sectionId" value={section.id} />
                  <PlacementFields mediaOptions={mediaRows} defaultPosition={sectionItems.length + 1} />
                  <SubmitButton>Add placement</SubmitButton>
                </form>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
