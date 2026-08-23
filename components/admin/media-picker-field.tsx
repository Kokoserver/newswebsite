"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

type MediaOption = {
  id: string;
  title: string | null;
  kind: string;
  publicUrl: string;
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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId || selected) return;
    const controller = new AbortController();
    fetch(`/api/admin/media?id=${encodeURIComponent(selectedId)}&kind=${kind}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result: { items?: MediaOption[] }) => setSelected(result.items?.[0] ?? null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [kind, selected, selectedId]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ kind, limit: "12" });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/admin/media?${params}`, { signal: controller.signal });
        const result = await response.json() as { items?: MediaOption[] };
        if (response.ok) setItems(result.items ?? []);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [kind, open, query]);

  return (
    <div className="admin-media-field">
      <label>{label}<input type="hidden" name={name} value={selectedId} /><span className="admin-media-field-search"><Search size={15} /><input value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder={`Search ${kind.toLowerCase()}s`} /></span></label>
      {selected ? <div className="admin-media-field-selected"><span><strong>{selected.title ?? "Untitled asset"}</strong><small>{selected.publicUrl}</small></span><button type="button" onClick={() => { setSelected(null); setSelectedId(""); setQuery(""); }} aria-label={`Clear ${label}`}><X size={15} /></button></div> : null}
      {open ? <div className="admin-media-field-results">{items.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setSelectedId(item.id); setQuery(""); setOpen(false); }}><strong>{item.title ?? "Untitled asset"}</strong><small>{item.kind}</small></button>)}{loading ? <span>Searching...</span> : null}{!loading && items.length === 0 ? <span>No matching media</span> : null}<button type="button" className="close" onClick={() => setOpen(false)}>Close results</button></div> : null}
    </div>
  );
}
