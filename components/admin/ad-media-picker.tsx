"use client";

import { ArrowDown, ArrowUp, Library, Play, Plus, Search, Video, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type MediaItem = {
  id: string;
  title?: string | null;
  kind: string;
  publicUrl: string;
  posterUrl?: string | null;
  altText?: string | null;
  caption?: string | null;
};

export default function AdMediaPicker({
  label = "Creative media",
  initialItems = [],
}: {
  label?: string;
  initialItems?: MediaItem[];
}) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "24" });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/admin/media?${params}`, { signal: controller.signal });
        const result = await response.json() as {
          items?: MediaItem[];
          nextCursor?: string | null;
          message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Could not load the media library.");
        setLibrary(result.items ?? []);
        setNextCursor(result.nextCursor ?? null);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : "Could not load the media library.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function add(item: MediaItem) {
    setItems((current) => (current.some((value) => value.id === item.id) ? current : [...current, item]));
    setOpen(false);
    setError(null);
    setQuery("");
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function move(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "24", cursor: nextCursor });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/media?${params}`);
      const result = await response.json() as {
        items?: MediaItem[];
        nextCursor?: string | null;
        message?: string;
      };
      if (!response.ok) throw new Error(result.message ?? "Could not load more media.");
      setLibrary((current) => [...current, ...(result.items ?? [])]);
      setNextCursor(result.nextCursor ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load more media.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-media-field admin-ad-media-picker">
      <span className="admin-media-field-label">{label}</span>

      {items.length > 0 ? (
        <ul className="admin-ad-media-list">
          {items.map((item, index) => (
            <li key={item.id} className="admin-ad-media-row">
              <div className="admin-media-selection-preview">
                {item.kind === "VIDEO" ? (
                  <><video src={item.publicUrl} poster={item.posterUrl ?? undefined} preload="metadata" muted /><Play size={18} /></>
                ) : (
                  <Image src={item.publicUrl} alt={item.altText ?? item.title ?? ""} fill sizes="72px" unoptimized />
                )}
              </div>
              <div className="admin-ad-media-meta">
                <strong>{item.title ?? `Untitled ${item.kind === "VIDEO" ? "video" : "image"}`}</strong>
                <small>{item.kind === "VIDEO" ? "Video" : "Image"}{index === 0 ? " · Cover" : ""}</small>
              </div>
              <div className="admin-ad-media-actions">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up"><ArrowUp size={16} /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Move down"><ArrowDown size={16} /></button>
                <button type="button" onClick={() => remove(item.id)} aria-label="Remove"><X size={16} /></button>
              </div>
              <input type="hidden" name="mediaItem" value={item.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-editor-message">No media chosen yet. Add an image or video — multiple images rotate as a slideshow, and a video autoplays.</p>
      )}

      <button type="button" className="admin-media-library-trigger" onClick={() => setOpen(true)}>
        <Library size={20} />
        <span><strong>{items.length > 0 ? "Add another" : "Choose media"}</strong><small>Select images or a video from the library.</small></span>
        <Plus size={17} />
      </button>

      {open ? (
        <div className="admin-editor-modal" role="dialog" aria-modal="true" aria-label="Choose ad media">
          <div className="admin-editor-dialog media admin-field-media-dialog">
            <header>
              <div><span className="admin-eyebrow">Media library</span><h3>Add creative media</h3></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={19} /></button>
            </header>
            <p className="admin-editor-hint">Images and videos. The first item is the cover; images rotate as a slideshow and a video autoplays.</p>
            <label className="admin-media-search">
              <Search size={17} />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search images and videos" />
            </label>
            {error ? <p className="admin-editor-message error">{error}</p> : null}
            <div className="admin-editor-media-grid">
              {library.map((item) => {
                const chosen = items.some((value) => value.id === item.id);
                return (
                  <button type="button" key={item.id} onClick={() => add(item)} disabled={chosen} className={chosen ? "is-chosen" : ""}>
                    {item.kind === "VIDEO" ? (
                      <div className="admin-editor-media-thumb"><video src={item.publicUrl} poster={item.posterUrl ?? undefined} preload="metadata" muted /><Video size={24} /></div>
                    ) : (
                      <div className="admin-editor-media-thumb"><Image src={item.publicUrl} alt={item.altText ?? item.title ?? ""} fill sizes="(max-width: 540px) 100vw, 240px" unoptimized /></div>
                    )}
                    <span><strong>{item.title ?? `Untitled ${item.kind === "VIDEO" ? "video" : "image"}`}</strong><small>{chosen ? "Added" : item.kind === "VIDEO" ? "Video" : "Image"}</small></span>
                  </button>
                );
              })}
              {!loading && library.length === 0 ? <p>No media found.</p> : null}
            </div>
            {loading ? <p className="admin-editor-message">Loading media...</p> : null}
            {nextCursor ? <button type="button" className="admin-media-more" onClick={loadMore} disabled={loading}>Load more</button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
