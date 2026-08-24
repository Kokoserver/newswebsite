"use client";

import { useEffect, useRef, useState } from "react";

type DiscoveryFieldsProps = {
  initialTitle?: string;
  initialSubtitle?: string | null;
  initialExcerpt?: string | null;
  initialSlug?: string;
  initialSeoTitle?: string | null;
  initialSeoDescription?: string | null;
  initialCanonicalUrl?: string | null;
  initialSourceName?: string | null;
  initialSourceUrl?: string | null;
  siteUrl: string;
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 320);
}

function truncateAtWord(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  const shortened = normalized.slice(0, limit + 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return shortened.slice(0, lastSpace > limit * 0.65 ? lastSpace : limit).trim();
}

function generatedDescription(excerpt: string, subtitle: string) {
  return truncateAtWord(excerpt || subtitle, 170);
}

export default function ArticleDiscoveryFields({
  initialTitle = "",
  initialSubtitle = "",
  initialExcerpt = "",
  initialSlug = "",
  initialSeoTitle,
  initialSeoDescription,
  initialCanonicalUrl,
  initialSourceName,
  initialSourceUrl,
  siteUrl,
}: DiscoveryFieldsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const seoTitleCustomized = useRef(Boolean(initialSeoTitle));
  const seoDescriptionCustomized = useRef(Boolean(initialSeoDescription));
  const canonicalCustomized = useRef(Boolean(initialCanonicalUrl));
  const initialGeneratedSlug = initialSlug || slugify(initialTitle);
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle ?? truncateAtWord(initialTitle, 70));
  const [seoDescription, setSeoDescription] = useState(
    initialSeoDescription ?? generatedDescription(initialExcerpt ?? "", initialSubtitle ?? ""),
  );
  const [canonicalUrl, setCanonicalUrl] = useState(
    initialCanonicalUrl ?? (initialGeneratedSlug ? `${siteUrl}/articles/${initialGeneratedSlug}` : ""),
  );

  useEffect(() => {
    const form = sectionRef.current?.closest("form");
    if (!form) return;

    function updateDefaults() {
      const data = new FormData(form!);
      const title = String(data.get("title") ?? "");
      const subtitle = String(data.get("subtitle") ?? "");
      const excerpt = String(data.get("excerpt") ?? "");
      const explicitSlug = String(data.get("slug") ?? "");
      const generatedSlug = slugify(explicitSlug || title);

      if (!seoTitleCustomized.current) setSeoTitle(truncateAtWord(title, 70));
      if (!seoDescriptionCustomized.current) setSeoDescription(generatedDescription(excerpt, subtitle));
      if (!canonicalCustomized.current) {
        setCanonicalUrl(generatedSlug ? `${siteUrl}/articles/${generatedSlug}` : "");
      }
    }

    form.addEventListener("input", updateDefaults);
    return () => form.removeEventListener("input", updateDefaults);
  }, [siteUrl]);

  return (
    <div ref={sectionRef} className="admin-form-grid two admin-discovery-fields">
      <p className="admin-auto-fields-note span-two">
        SEO defaults are generated from the headline, excerpt and article URL. Edit any field to override its generated value.
      </p>
      <label>
        SEO title
        <input
          name="seoTitle"
          maxLength={70}
          value={seoTitle}
          onChange={(event) => { seoTitleCustomized.current = true; setSeoTitle(event.target.value); }}
          placeholder="Example: Council approves new city transport plan"
        />
        <small>{seoTitle.length}/70 characters · Generated from headline</small>
      </label>
      <label>
        Canonical URL
        <input
          name="canonicalUrl"
          type="url"
          value={canonicalUrl}
          onChange={(event) => { canonicalCustomized.current = true; setCanonicalUrl(event.target.value); }}
          placeholder={`${siteUrl}/articles/council-approves-new-city-transport-plan`}
        />
        <small>Generated from the article slug</small>
      </label>
      <label className="span-two">
        SEO description
        <textarea
          name="seoDescription"
          rows={3}
          maxLength={170}
          value={seoDescription}
          onChange={(event) => { seoDescriptionCustomized.current = true; setSeoDescription(event.target.value); }}
          placeholder="Example: What the decision means for commuters, costs and the project timeline."
        />
        <small>{seoDescription.length}/170 characters · Generated from excerpt or subtitle</small>
      </label>
      <label>
        Source name
        <input
          name="sourceName"
          defaultValue={initialSourceName ?? ""}
          placeholder="Example: City Council press office"
        />
        <small>Use only when crediting an external source</small>
      </label>
      <label>
        Source URL
        <input
          name="sourceUrl"
          type="url"
          defaultValue={initialSourceUrl ?? ""}
          placeholder="https://example.gov/press-release"
        />
        <small>Link to the original external material</small>
      </label>
    </div>
  );
}
