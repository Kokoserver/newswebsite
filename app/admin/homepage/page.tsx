"use client";

import { ChevronDown, Layers3 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import ArticlePickerField from "@/components/admin/article-picker-field";
import InfoTooltip from "@/components/admin/info-tooltip";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  deleteHomepageItem,
  deleteHomepageSection,
  saveHomepageItem,
  saveHomepageSection,
} from "@/src/admin/operations-actions";

const homepageSectionKinds = [
  "HERO",
  "LATEST",
  "FEATURED",
  "CATEGORY",
  "OPINION",
  "VIDEO",
  "ADVERTISEMENT",
] as const;

type SectionDto = {
  id: string;
  key: string;
  title: string;
  kind: string;
  position: number;
};

type MediaOption = {
  id: string;
  title: string | null;
  publicUrl: string;
};

type ItemDto = {
  id: string;
  sectionId: string;
  articleId: string | null;
  mediaId: string | null;
  titleOverride: string | null;
  dekOverride: string | null;
  position: number;
  startsAt: string | null;
  endsAt: string | null;
  article: { title: string; status: string } | null;
};

type ImageGuidance = {
  short: string;
  detail: string;
};

function imageGuidanceForSection(section: Pick<SectionDto, "key" | "kind" | "title">): ImageGuidance {
  const key = section.key.toLowerCase();

  if (key === "hero" || section.kind === "HERO") {
    return {
      short: "Image size: 1200 x 760 px",
      detail: "Use a 1200 x 760 px lead image for the homepage hero.",
    };
  }

  if (section.kind === "ADVERTISEMENT") {
    return {
      short: "Ad sizes: 1200 x 320 px or 300 x 360 px",
      detail: "Use 1200 x 320 px for billboard ads and 300 x 360 px for rail ads.",
    };
  }

  if (section.kind === "VIDEO") {
    return {
      short: "Poster size: 1280 x 720 px",
      detail: "Use a 1280 x 720 px poster image for video placements.",
    };
  }

  return {
    short: "Image size: 1200 x 760 px",
    detail: "Use a 1200 x 760 px image. Homepage cards crop this asset automatically for section leads and sidebar placements.",
  };
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function formatDateTimeLocal(value: Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function PlacementFields({
  item,
  mediaOptions,
  defaultPosition,
}: {
  item?: ItemDto | null;
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
        <input name="startsAt" type="datetime-local" defaultValue={formatDateTimeLocal(toDate(item?.startsAt ?? null))} />
      </label>
      <label>
        Ends
        <input name="endsAt" type="datetime-local" defaultValue={formatDateTimeLocal(toDate(item?.endsAt ?? null))} />
      </label>
    </>
  );
}

export default function HomepageAdminPage() {
  const [sections, setSections] = useState<SectionDto[] | null>(null);
  const [media, setMedia] = useState<MediaOption[]>([]);
  const [itemsBySection, setItemsBySection] = useState<Record<string, ItemDto[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [readySections, setReadySections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedSections = useRef<Set<string>>(new Set());

  const loadSectionItems = useCallback(async (sectionId: string) => {
    if (loadedSections.current.has(sectionId)) return;
    loadedSections.current.add(sectionId);
    try {
      const response = await fetch(`/api/admin/homepage?section=${encodeURIComponent(sectionId)}`);
      const data = await response.json() as { items?: ItemDto[] };
      if (response.ok) {
        setItemsBySection((prev) => ({ ...prev, [sectionId]: data.items ?? [] }));
      }
    } catch {
      loadedSections.current.delete(sectionId);
    } finally {
      setReadySections((prev) => {
        const next = new Set(prev);
        next.add(sectionId);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/admin/homepage", { signal: controller.signal });
        const data = await response.json() as {
          sections?: SectionDto[];
          media?: MediaOption[];
          message?: string;
        };
        if (!response.ok) throw new Error(data.message ?? "Unable to load homepage.");
        const loaded = data.sections ?? [];
        setSections(loaded);
        setMedia(data.media ?? []);
        if (loaded.length > 0) {
          setOpenId(loaded[0].id);
          await loadSectionItems(loaded[0].id);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load homepage.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [loadSectionItems]);

  function handleSummaryClick(event: React.MouseEvent<HTMLElement>, sectionId: string) {
    event.preventDefault();
    const willOpen = openId !== sectionId;
    setOpenId(willOpen ? sectionId : null);
    if (willOpen) {
      void loadSectionItems(sectionId);
    }
  }

  if (loading) {
    return (
      <div className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Front page</span>
          <h1>Homepage curation</h1>
        </div>
        <div className="admin-loading" role="status" aria-live="polite">
          <span className="admin-spinner" aria-hidden="true" />
          <p>Loading homepage…</p>
        </div>
      </div>
    );
  }

  if (error && !sections) {
    return (
      <div className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Front page</span>
          <h1>Homepage curation</h1>
          <p className="admin-empty">{error}</p>
        </div>
      </div>
    );
  }

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
            <p className="admin-homepage-guidance-list">
              HERO: <code>1200 x 760</code> px. CATEGORY, LATEST, FEATURED, OPINION: <code>1200 x 760</code> px. VIDEO: <code>1280 x 720</code> px poster. ADVERTISEMENT: <code>1200 x 320</code> px billboard or <code>300 x 360</code> px rail.
            </p>
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
              {homepageSectionKinds.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            Position
            <input name="position" type="number" min="1" defaultValue={(sections?.length ?? 0) + 1} />
          </label>
          <SubmitButton>Create section</SubmitButton>
        </form>
      </section>

      <div className="admin-homepage-list-heading">
        <div>
          <span className="admin-eyebrow">Section order</span>
          <h2>Homepage structure <InfoTooltip text="Open one section at a time to edit its settings and placements. Each placement can use an article's media or a separate asset and can have an optional publishing window." /></h2>
        </div>
        <span><Layers3 size={16} />{sections?.length ?? 0} sections</span>
      </div>

      <div className="admin-homepage-stack">
        {(sections ?? []).map((section) => {
          const items = itemsBySection[section.id] ?? [];
          const sectionLoading = !readySections.has(section.id);
          const imageGuidance = imageGuidanceForSection(section);

          return (
            <details
              className="admin-card admin-homepage-section"
              key={section.id}
              open={openId === section.id}
            >
              <summary
                className="admin-homepage-section-summary"
                onClick={(event) => handleSummaryClick(event, section.id)}
              >
                <span className="admin-homepage-position">{section.position}</span>
                <span className="admin-homepage-section-name">
                  <strong>{section.title}</strong>
                  <small>{section.key}</small>
                  <small className="admin-homepage-guidance">{imageGuidance.short}</small>
                </span>
                <span className="admin-homepage-kind">{section.kind.replaceAll("_", " ")}</span>
                {sectionLoading && openId === section.id ? (
                  <span className="admin-homepage-loading" aria-hidden="true">
                    <span className="admin-spinner admin-spinner-sm" />
                  </span>
                ) : null}
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
                        {homepageSectionKinds.map((value) => <option key={value}>{value}</option>)}
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

                <p className="admin-homepage-section-note">{imageGuidance.detail}</p>

                {sectionLoading ? (
                  <div className="admin-loading admin-section-loading" role="status" aria-live="polite">
                    <span className="admin-spinner" aria-hidden="true" />
                    <p>Loading placements…</p>
                  </div>
                ) : (
                  <div className="admin-placement-list">
                    {items.map((item) => (
                      <article key={item.id}>
                        <form action={saveHomepageItem.bind(null, item.id)} className="admin-form-grid placement">
                          <input type="hidden" name="sectionId" value={section.id} />
                          <PlacementFields item={item} mediaOptions={media} defaultPosition={item.position} />
                          <SubmitButton>Save placement</SubmitButton>
                        </form>
                        <div className="admin-placement-title">{item.article?.title ?? "Media placement"}</div>
                        <form action={deleteHomepageItem.bind(null, item.id)}>
                          <SubmitButton danger>Remove</SubmitButton>
                        </form>
                      </article>
                    ))}
                  </div>
                )}

                <form
                  action={saveHomepageItem.bind(null, null)}
                  className="admin-form-grid placement admin-new-placement"
                >
                  <input type="hidden" name="sectionId" value={section.id} />
                  <PlacementFields mediaOptions={media} defaultPosition={items.length + 1} />
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
