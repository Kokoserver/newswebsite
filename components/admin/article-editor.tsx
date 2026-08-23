"use client";

import { EditorContent, mergeAttributes, Node, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code2, Heading2, ImageIcon, Italic, Link2, List, ListOrdered, Pilcrow, Quote, Redo2, Search, Strikethrough, Underline, Undo2, UploadCloud, Video, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { looksLikeMarkdown, markdownToHtml } from "@/src/admin/markdown";

export type EditorMedia = {
  id: string;
  title: string | null;
  kind: string;
  publicUrl: string;
  altText?: string | null;
  caption?: string | null;
  posterUrl?: string | null;
};

const MediaImage = Node.create({
  name: "mediaImage",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: {}, alt: { default: "" }, title: { default: null }, mediaId: { default: null } };
  },
  parseHTML() { return [{ tag: "figure[data-media-kind='image']", getAttrs: (node) => { const image = (node as HTMLElement).querySelector("img"); return { src: image?.getAttribute("src"), alt: image?.getAttribute("alt") ?? "", title: (node as HTMLElement).querySelector("figcaption")?.textContent, mediaId: (node as HTMLElement).dataset.mediaId }; } }]; },
  renderHTML({ HTMLAttributes }) {
    const caption = HTMLAttributes.title ? ["figcaption", {}, HTMLAttributes.title] : null;
    return ["figure", mergeAttributes({ "data-media-kind": "image", "data-media-id": HTMLAttributes.mediaId }, {}), ["img", { src: HTMLAttributes.src, alt: HTMLAttributes.alt, loading: "lazy" }], ...(caption ? [caption] : [])];
  },
});

const MediaVideo = Node.create({
  name: "mediaVideo",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: {}, title: { default: null }, poster: { default: null }, mediaId: { default: null } };
  },
  parseHTML() { return [{ tag: "figure[data-media-kind='video']", getAttrs: (node) => { const video = (node as HTMLElement).querySelector("video"); return { src: video?.getAttribute("src"), poster: video?.getAttribute("poster"), title: (node as HTMLElement).querySelector("figcaption")?.textContent, mediaId: (node as HTMLElement).dataset.mediaId }; } }]; },
  renderHTML({ HTMLAttributes }) {
    const caption = HTMLAttributes.title ? ["figcaption", {}, HTMLAttributes.title] : null;
    return ["figure", { "data-media-kind": "video", "data-media-id": HTMLAttributes.mediaId }, ["video", { src: HTMLAttributes.src, poster: HTMLAttributes.poster, controls: "true", preload: "metadata" }], ...(caption ? [caption] : [])];
  },
});

function Tool({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} className={active ? "is-active" : ""} onClick={onClick}>{children}</button>;
}

export default function ArticleEditor({ initialHtml = "" }: { initialHtml?: string | null }) {
  const [html, setHtml] = useState(initialHtml ?? "");
  const [json, setJson] = useState("{}");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [markdownOpen, setMarkdownOpen] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [query, setQuery] = useState("");
  const [mediaItems, setMediaItems] = useState<EditorMedia[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaTab, setMediaTab] = useState<"library" | "upload">("library");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, markdownLinks: true } }), MediaImage, MediaVideo],
    content: initialHtml || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard || clipboard.getData("text/html")) return false;
        const text = clipboard.getData("text/plain");
        if (!looksLikeMarkdown(text)) return false;
        event.preventDefault();
        editor?.commands.insertContent(markdownToHtml(text));
        return true;
      },
    },
    onCreate: ({ editor: instance }) => setJson(JSON.stringify(instance.getJSON())),
    onUpdate: ({ editor: instance }) => {
      setHtml(instance.getHTML());
      setJson(JSON.stringify(instance.getJSON()));
    },
  });

  useEffect(() => {
    if (!mediaOpen || mediaTab !== "library") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setMediaLoading(true); setMediaError(null);
      try {
        const params = new URLSearchParams({ limit: "24" });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/admin/media?${params}`, { signal: controller.signal });
        const result = await response.json() as { items?: EditorMedia[]; nextCursor?: string | null; message?: string };
        if (!response.ok) throw new Error(result.message ?? "Could not load media.");
        setMediaItems(result.items ?? []);
        setNextCursor(result.nextCursor ?? null);
      } catch (error) {
        if (!controller.signal.aborted) setMediaError(error instanceof Error ? error.message : "Could not load media.");
      } finally {
        if (!controller.signal.aborted) setMediaLoading(false);
      }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [mediaOpen, mediaTab, query]);

  if (!editor) return <div className="admin-editor-loading">Loading editor...</div>;
  const activeEditor = editor;

  function setLink() {
    const current = activeEditor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", current ?? "https://");
    if (href === null) return;
    if (!href.trim()) activeEditor.chain().focus().unsetLink().run();
    else activeEditor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  function insertMedia(item: EditorMedia) {
    const node = item.kind === "VIDEO"
      ? { type: "mediaVideo", attrs: { src: item.publicUrl, title: item.caption ?? item.title, poster: item.posterUrl, mediaId: item.id } }
      : { type: "mediaImage", attrs: { src: item.publicUrl, alt: item.altText ?? item.title ?? "", title: item.caption, mediaId: item.id } };
    activeEditor.chain().focus().insertContent([node, { type: "paragraph" }]).run();
    setMediaOpen(false);
  }

  function importMarkdown() {
    if (!markdown.trim()) return;
    activeEditor.chain().focus().insertContent(markdownToHtml(markdown)).run();
    setMarkdown("");
    setMarkdownOpen(false);
  }

  async function loadMoreMedia() {
    if (!nextCursor || mediaLoading) return;
    setMediaLoading(true); setMediaError(null);
    try {
      const params = new URLSearchParams({ limit: "24", cursor: nextCursor });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/media?${params}`);
      const result = await response.json() as { items?: EditorMedia[]; nextCursor?: string | null; message?: string };
      if (!response.ok) throw new Error(result.message ?? "Could not load more media.");
      setMediaItems((current) => [...current, ...(result.items ?? [])]);
      setNextCursor(result.nextCursor ?? null);
    } catch (error) { setMediaError(error instanceof Error ? error.message : "Could not load more media."); }
    finally { setMediaLoading(false); }
  }

  async function uploadFromEditor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setUploading(true); setUploadMessage(null);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: new FormData(form) });
      const result = await response.json() as { item?: EditorMedia; message?: string };
      if (!response.ok || !result.item) throw new Error(result.message ?? "Upload failed.");
      setMediaItems((current) => [result.item!, ...current.filter((item) => item.id !== result.item!.id)]);
      form.reset();
      setUploadMessage("Uploaded to Bunny Storage and inserted into the article.");
      insertMedia(result.item);
    } catch (error) { setUploadMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-toolbar" aria-label="Editor formatting">
        <Tool label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></Tool>
        <Tool label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></Tool>
        <span />
        <Tool label="Paragraph" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow size={17} /></Tool>
        <Tool label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></Tool>
        <Tool label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></Tool>
        <Tool label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={17} /></Tool>
        <Tool label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={17} /></Tool>
        <Tool label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></Tool>
        <Tool label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></Tool>
        <Tool label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></Tool>
        <Tool label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={17} /></Tool>
        <Tool label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={17} /></Tool>
        <Tool label="Add link" active={editor.isActive("link")} onClick={setLink}><Link2 size={17} /></Tool>
        <span />
        <button type="button" className="admin-editor-action" onClick={() => setMediaOpen(true)}><ImageIcon size={16} />Media</button>
        <button type="button" className="admin-editor-action" onClick={() => setMarkdownOpen(true)}><strong>MD</strong>Import</button>
      </div>
      <EditorContent editor={editor} />
      <div className="admin-editor-status"><span>{editor.getText().length} characters</span><span>Paste formatted text or Markdown directly</span></div>
      <input type="hidden" name="renderedContent" value={html} />
      <input type="hidden" name="contentJson" value={json} />
      {mediaOpen ? <div className="admin-editor-modal" role="dialog" aria-modal="true" aria-label="Insert media"><div className="admin-editor-dialog media"><header><div><span className="admin-eyebrow">Bunny media cloud</span><h3>Insert media</h3></div><button type="button" onClick={() => setMediaOpen(false)} aria-label="Close"><X size={19} /></button></header><div className="admin-editor-tabs" role="tablist"><button type="button" role="tab" aria-selected={mediaTab === "library"} onClick={() => setMediaTab("library")}><Search size={16} />Search library</button><button type="button" role="tab" aria-selected={mediaTab === "upload"} onClick={() => setMediaTab("upload")}><UploadCloud size={16} />Upload to Bunny</button></div>{mediaTab === "library" ? <><label className="admin-media-search"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search images and videos" /></label>{mediaError ? <p className="admin-editor-message error">{mediaError}</p> : null}<div className="admin-editor-media-grid">{mediaItems.map((item) => <button type="button" key={item.id} onClick={() => insertMedia(item)}>{item.kind === "VIDEO" ? <div className="admin-editor-media-thumb"><video src={item.publicUrl} poster={item.posterUrl ?? undefined} preload="metadata" /><Video size={24} /></div> : <div className="admin-editor-media-thumb"><Image src={item.publicUrl} alt={item.altText ?? item.title ?? ""} fill sizes="(max-width: 540px) 100vw, 240px" unoptimized /></div>}<span><strong>{item.title ?? "Untitled asset"}</strong><small>{item.kind}</small></span></button>)}{!mediaLoading && mediaItems.length === 0 ? <p>No matching images or videos. Upload a new asset here.</p> : null}</div>{mediaLoading ? <p className="admin-editor-message">Loading media...</p> : null}{nextCursor ? <button type="button" className="admin-media-more" onClick={loadMoreMedia} disabled={mediaLoading}>Load more</button> : null}</> : <form className="admin-editor-upload" onSubmit={uploadFromEditor}><div className="admin-editor-upload-mark"><UploadCloud size={30} /><strong>Upload directly into this story</strong><span>The file is stored in Bunny, registered centrally, and inserted at the cursor.</span></div><label>Image or video<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" required /></label><label>Title<input name="title" maxLength={240} placeholder="Newsroom display title" /></label><label>Alt text<input name="altText" maxLength={320} placeholder="Describe the image for accessibility" /></label><button className="admin-button" disabled={uploading}>{uploading ? "Uploading to Bunny..." : "Upload and insert"}</button>{uploadMessage ? <p className="admin-editor-message" aria-live="polite">{uploadMessage}</p> : null}</form>}</div></div> : null}
      {markdownOpen ? <div className="admin-editor-modal" role="dialog" aria-modal="true" aria-label="Import Markdown"><div className="admin-editor-dialog markdown"><header><div><span className="admin-eyebrow">Markdown import</span><h3>Paste content from ChatGPT</h3></div><button type="button" onClick={() => setMarkdownOpen(false)} aria-label="Close"><X size={19} /></button></header><p>Headings, lists, links, quotes, bold, italic and code blocks will become editable rich text.</p><textarea autoFocus value={markdown} onChange={(event) => setMarkdown(event.target.value)} placeholder="# Article heading&#10;&#10;Paste Markdown here..." /><footer><button type="button" onClick={() => setMarkdownOpen(false)}>Cancel</button><button type="button" className="admin-button" onClick={importMarkdown} disabled={!markdown.trim()}>Insert into article</button></footer></div></div> : null}
    </div>
  );
}
