"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MediaUploader({ maxBytes, configured }: { maxBytes: number; configured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage(null);
    const response = await fetch("/api/admin/media", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setPending(false); setMessage(result.message ?? (response.ok ? "Upload complete." : "Upload failed."));
    if (response.ok) { event.currentTarget.reset(); router.refresh(); }
  }
  return (
    <form className="admin-upload-card" onSubmit={upload}>
      <div className="admin-upload-icon"><UploadCloud size={27} /></div>
      <div><strong>Upload newsroom media</strong><span>Images and videos up to {Math.floor(maxBytes / 1024 / 1024)} MB.</span>{configured ? <small>Bunny Storage and CDN delivery are connected.</small> : <small>Configure the Bunny environment variables before uploading.</small>}</div>
      <label className="admin-file-button">Choose file<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" required /></label>
      <label>Title<input name="title" maxLength={240} placeholder="Optional display title" /></label>
      <label>Alt text<input name="altText" maxLength={320} placeholder="Describe the visual" /></label>
      <button className="admin-button" disabled={pending || !configured}>{pending ? "Uploading..." : configured ? "Upload to Bunny" : "Bunny not configured"}</button>
      {message ? <p aria-live="polite">{message}</p> : null}
    </form>
  );
}
