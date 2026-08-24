"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

type ArticleOption = {
  id: string;
  title: string;
  status: string;
};

type ArticlePickerFieldProps = {
  name: string;
  label: string;
  initialId?: string | null;
  initialTitle?: string | null;
};

export default function ArticlePickerField({
  name,
  label,
  initialId,
  initialTitle,
}: ArticlePickerFieldProps) {
  const resultsId = useId();
  const [selectedId, setSelectedId] = useState(initialId ?? "");
  const [query, setQuery] = useState(initialTitle ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ArticleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "12" });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/admin/articles?${params}`, { signal: controller.signal });
        const result = await response.json() as { items?: ArticleOption[] };
        if (!response.ok) throw new Error("Article search is temporarily unavailable.");
        setItems(result.items ?? []);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : "Article search is temporarily unavailable.");
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

  function selectArticle(item: ArticleOption) {
    setSelectedId(item.id);
    setQuery(item.title);
    setOpen(false);
  }

  function clearArticle() {
    setSelectedId("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div className="admin-article-picker">
      <label>
        {label}
        <input type="hidden" name={name} value={selectedId} />
        <span className="admin-article-picker-control">
          <Search size={15} />
          <input
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={resultsId}
            aria-expanded={open}
            autoComplete="off"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedId("");
              setOpen(true);
            }}
            placeholder="Search articles"
          />
          {selectedId ? (
            <button type="button" onClick={clearArticle} aria-label={`Clear ${label}`}>
              <X size={14} />
            </button>
          ) : null}
        </span>
      </label>
      {open ? (
        <div className="admin-media-field-results" id={resultsId} role="listbox">
          {items.map((item) => (
            <button type="button" role="option" aria-selected={item.id === selectedId} key={item.id} onClick={() => selectArticle(item)}>
              <strong>{item.title}</strong>
              <small>{item.status.replaceAll("_", " ")}</small>
            </button>
          ))}
          {loading ? <span>Searching...</span> : null}
          {!loading && error ? <span>{error}</span> : null}
          {!loading && !error && items.length === 0 ? <span>No matching articles</span> : null}
          <button type="button" className="close" onClick={() => setOpen(false)}>Close results</button>
        </div>
      ) : null}
    </div>
  );
}
