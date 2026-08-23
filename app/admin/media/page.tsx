import { and, asc, desc, eq, gt, isNull, like, lt, or } from "drizzle-orm";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import MediaUploader from "@/components/admin/media-uploader";
import { SubmitButton } from "@/components/admin/submit-button";
import { deleteMedia, updateMedia } from "@/src/admin/media-actions";
import { decodeMediaCursor, encodeMediaCursor } from "@/src/admin/media-cursor";
import { requireAdminUser } from "@/src/admin/permissions";
import { bunnyConfigured, uploadLimit } from "@/src/admin/storage";
import { getDb } from "@/src/db";
import { media, mediaKindValues } from "@/src/db/schema";

const pageSize = 24;

type SearchParams = { q?: string; kind?: string; cursor?: string; direction?: string };

function mediaPageHref(q: string, kind: string, cursor: string, direction: "next" | "prev") {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (kind) params.set("kind", kind);
  params.set("cursor", cursor);
  params.set("direction", direction);
  return `/admin/media?${params}`;
}

export default async function MediaAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminUser("media:view");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 120) ?? "";
  const kind = mediaKindValues.includes(params.kind as (typeof mediaKindValues)[number])
    ? params.kind as (typeof mediaKindValues)[number]
    : "";
  const cursor = decodeMediaCursor(params.cursor);
  const direction = params.direction === "prev" ? "prev" : "next";
  const cursorFilter = cursor
    ? direction === "prev"
      ? or(gt(media.createdAt, new Date(cursor.createdAt)), and(eq(media.createdAt, new Date(cursor.createdAt)), gt(media.id, cursor.id)))
      : or(lt(media.createdAt, new Date(cursor.createdAt)), and(eq(media.createdAt, new Date(cursor.createdAt)), lt(media.id, cursor.id)))
    : undefined;

  const db = await getDb();
  const fetched = await db.query.media.findMany({
    where: and(
      isNull(media.deletedAt),
      kind ? eq(media.kind, kind) : undefined,
      q ? or(like(media.title, `%${q}%`), like(media.altText, `%${q}%`), like(media.caption, `%${q}%`)) : undefined,
      cursorFilter,
    ),
    orderBy: direction === "prev"
      ? [asc(media.createdAt), asc(media.id)]
      : [desc(media.createdAt), desc(media.id)],
    limit: pageSize + 1,
  });
  const hasExtra = fetched.length > pageSize;
  const pageRows = fetched.slice(0, pageSize);
  const rows = direction === "prev" ? pageRows.reverse() : pageRows;
  const hasPrevious = Boolean(cursor) && (direction === "next" || hasExtra);
  const hasNext = direction === "prev" ? Boolean(cursor) : hasExtra;
  const first = rows[0];
  const last = rows.at(-1);
  const previousHref = hasPrevious && first
    ? mediaPageHref(q, kind, encodeMediaCursor({ createdAt: first.createdAt.getTime(), id: first.id }), "prev")
    : "/admin/media";
  const nextHref = hasNext && last
    ? mediaPageHref(q, kind, encodeMediaCursor({ createdAt: last.createdAt.getTime(), id: last.id }), "next")
    : "/admin/media";

  return (
    <>
      <header className="admin-page-header"><div><span className="admin-eyebrow">Asset desk</span><h1>Media library</h1><p>Upload, describe and reuse publication assets.</p></div></header>
      <MediaUploader maxBytes={uploadLimit()} configured={bunnyConfigured()} />
      <form className="admin-filter-bar">
        <label><Search size={17} /><input name="q" defaultValue={q} placeholder="Search title, alt text or caption" /></label>
        <select name="kind" defaultValue={kind}><option value="">All media</option>{mediaKindValues.map((value) => <option key={value}>{value}</option>)}</select>
        <button>Filter</button><span>{rows.length} assets on this page</span>
      </form>
      <section className="admin-media-grid">
        {rows.map((item) => <article className="admin-card admin-media-card" key={item.id}><div className="admin-media-preview">{item.kind === "IMAGE" ? <Image src={item.publicUrl} alt={item.altText ?? item.title ?? ""} width={420} height={260} /> : item.kind === "VIDEO" ? <video src={item.publicUrl} poster={item.posterUrl ?? undefined} controls preload="metadata" /> : <span>{item.kind}</span>}</div><form action={updateMedia.bind(null, item.id)} className="admin-form-section"><div className="admin-media-meta"><span className="admin-status">{item.kind}</span><small>{(item.byteSize / 1024 / 1024).toFixed(1)} MB · {new Date(item.createdAt).toLocaleDateString()}</small></div><label>Title<input name="title" defaultValue={item.title ?? ""} /></label><label>Alt text<input name="altText" defaultValue={item.altText ?? ""} /></label><label>Caption<textarea name="caption" rows={2} defaultValue={item.caption ?? ""} /></label><SubmitButton>Save metadata</SubmitButton></form><form action={deleteMedia.bind(null, item.id)} className="admin-inline-danger"><SubmitButton danger>Remove</SubmitButton></form></article>)}
      </section>
      {rows.length === 0 ? <p className="admin-empty admin-card">No media found.</p> : null}
      <nav className="admin-pagination" aria-label="Media pages"><Link aria-disabled={!hasPrevious} href={previousHref}>Previous</Link><span>Showing up to {pageSize} assets</span><Link aria-disabled={!hasNext} href={nextHref}>Next</Link></nav>
    </>
  );
}
