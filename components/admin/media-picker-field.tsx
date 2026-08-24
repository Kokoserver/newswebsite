"use client";

import { ImageIcon, Library, Search, UploadCloud, Video, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type MediaOption = {
  id: string;
  title: string | null;
  kind: string;
  publicUrl: string;
  altText?: string | null;
  caption?: string | null;
  posterUrl?: string | null;
};

export default function MediaPickerField({
  name,
  label,
  kind,
  initialId,
}: {
  name: string;
  label: string;
  kind: "IMAGE" | "VIDEO";
  initialId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState(initialId ?? "");
  const [selected, setSelected] = useState<MediaOption | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaOption[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAlt, setUploadAlt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedId || selected) return;
    const controller = new AbortController();
    fetch(`/api/admin/media?id=${encodeURIComponent(selectedId)}&kind=${kind}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { items?: MediaOption[] };
        if (response.ok) setSelected(result.items?.[0] ?? null);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [kind, selected, selectedId]);

  useEffect(() => {
    if (!open || tab !== "library") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ kind, limit: "24" });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/admin/media?${params}`, { signal: controller.signal });
        const result = await response.json() as {
          items?: MediaOption[];
          nextCursor?: string | null;
          message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Could not load the media library.");
        setItems(result.items ?? []);
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
  }, [kind, open, query, tab]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function choose(item: MediaOption) {
    setSelected(item);
    setSelectedId(item.id);
    setOpen(false);
    setError(null);
  }

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ kind, limit: "24", cursor: nextCursor });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/media?${params}`);
      const result = await response.json() as {
        items?: MediaOption[];
        nextCursor?: string | null;
        message?: string;
      };
      if (!response.ok) throw new Error(result.message ?? "Could not load more media.");
      setItems((current) => [...current, ...(result.items ?? [])]);
      setNextCursor(result.nextCursor ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load more media.");
    } finally {
      setLoading(false);
    }
  }

  async function upload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(`Choose ${kind === "IMAGE" ? "an image" : "a video"} to upload.`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("title", uploadTitle);
      formData.set("altText", uploadAlt);
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const result = await response.json() as { item?: MediaOption; message?: string };
      if (!response.ok || !result.item) throw new Error(result.message ?? "Upload failed.");
      if (result.item.kind !== kind) throw new Error(`The uploaded file is not a ${kind.toLowerCase()}.`);
      setUploadTitle("");
      setUploadAlt("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      choose(result.item);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const kindLabel = kind === "IMAGE" ? "image" : "video";

  return (
    <div className="admin-media-field admin-media-library-field">
      <input type="hidden" name={name} value={selectedId} />
      <span className="admin-media-field-label">{label}</span>
      {selected ? (
        <div className="admin-media-selection">
          <div className="admin-media-selection-preview">
            {selected.kind === "VIDEO" ? (
              <><video src={selected.publicUrl} poster={selected.posterUrl ?? undefined} preload="metadata" /><Video size={20} /></>
            ) : (
              <Image src={selected.publicUrl} alt={selected.altText ?? selected.title ?? ""} fill sizes="96px" unoptimized />
            )}
          </div>
          <div>
            <strong>{selected.title ?? `Untitled ${kindLabel}`}</strong>
            <small>{humanFileType(selected.kind)} selected</small>
          </div>
          <button type="button" className="admin-media-change" onClick={() => setOpen(true)}>Change</button>
          <button
            type="button"
            className="admin-media-clear"
            onClick={() => { setSelected(null); setSelectedId(""); }}
            aria-label={`Remove ${label}`}
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button type="button" className="admin-media-library-trigger" onClick={() => setOpen(true)}>
          {kind === "IMAGE" ? <ImageIcon size={20} /> : <Video size={20} />}
          <span><strong>Choose {label.toLowerCase()}</strong><small>Select from the media library or upload a new {kindLabel}.</small></span>
          <Library size={17} />
        </button>
      )}

      {open ? (
        <div className="admin-editor-modal" role="dialog" aria-modal="true" aria-label={`Choose ${label}`}>
          <div className="admin-editor-dialog media admin-field-media-dialog">
            <header>
              <div><span className="admin-eyebrow">Media library</span><h3>Choose {label.toLowerCase()}</h3></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={19} /></button>
            </header>
            <div className="admin-editor-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "library"} onClick={() => { setTab("library"); setError(null); }}>
                <Search size={16} />Media library
              </button>
              <button type="button" role="tab" aria-selected={tab === "upload"} onClick={() => { setTab("upload"); setError(null); }}>
                <UploadCloud size={16} />Upload new
              </button>
            </div>
            {tab === "library" ? (
              <>
                <label className="admin-media-search">
                  <Search size={17} />
                  <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${kindLabel}s`} />
                </label>
                {error ? <p className="admin-editor-message error">{error}</p> : null}
                <div className="admin-editor-media-grid">
                  {items.map((item) => (
                    <button type="button" key={item.id} onClick={() => choose(item)}>
                      {item.kind === "VIDEO" ? (
                        <div className="admin-editor-media-thumb"><video src={item.publicUrl} poster={item.posterUrl ?? undefined} preload="metadata" /><Video size={24} /></div>
                      ) : (
                        <div className="admin-editor-media-thumb"><Image src={item.publicUrl} alt={item.altText ?? item.title ?? ""} fill sizes="(max-width: 540px) 100vw, 240px" unoptimized /></div>
                      )}
                      <span><strong>{item.title ?? `Untitled ${kindLabel}`}</strong><small>{humanFileType(item.kind)}</small></span>
                    </button>
                  ))}
                  {!loading && items.length === 0 ? <p>No {kindLabel}s found. Upload a new one here.</p> : null}
                </div>
                {loading ? <p className="admin-editor-message">Loading media...</p> : null}
                {nextCursor ? <button type="button" className="admin-media-more" onClick={loadMore} disabled={loading}>Load more</button> : null}
              </>
            ) : (
              <div className="admin-editor-upload">
                <div className="admin-editor-upload-mark">
                  <UploadCloud size={30} />
                  <strong>Upload {label.toLowerCase()}</strong>
                  <span>The file will be saved to the media library and selected for this article.</span>
                </div>
                <label>
                  {kind === "IMAGE" ? "Image" : "Video"}
                  <input ref={fileInputRef} type="file" accept={kind === "IMAGE" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm"} />
                </label>
                <label>Title<input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} maxLength={240} placeholder="Newsroom display title" /></label>
                {kind === "IMAGE" ? <label>Alt text<input value={uploadAlt} onChange={(event) => setUploadAlt(event.target.value)} maxLength={320} placeholder="Describe the image for accessibility" /></label> : null}
                <button type="button" className="admin-button" onClick={upload} disabled={uploading}>{uploading ? "Uploading..." : "Upload and select"}</button>
                {error ? <p className="admin-editor-message error" aria-live="polite">{error}</p> : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function humanFileType(kind: string) {
  return kind === "VIDEO" ? "Video" : "Image";
}
