"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { UploadProgress, uploadMedia } from "./client-media-upload";

export default function MediaUploader({ maxBytes, configured }: { maxBytes: number; configured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true); setProgress(0); setMessage(null);
    try {
      const formData = new FormData(form);
      const { ok, body } = await uploadMedia(formData, setProgress);
      setMessage(body.message ?? (ok ? "Upload complete." : "Upload failed."));
      if (ok) {
        form.reset();
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setPending(false); setProgress(null);
    }
  }
  return (
    <form className="admin-upload-card" onSubmit={upload}>
      <div className="admin-upload-icon"><UploadCloud size={27} /></div>
      <div><strong>Upload media</strong><span>Add images and videos up to {Math.floor(maxBytes / 1024 / 1024)} MB.</span>{configured ? <small>Files are stored securely and available across the newsroom.</small> : <small>Uploads are unavailable. Contact an administrator.</small>}</div>
      <label className="admin-file-button">Choose file<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" required disabled={pending} /></label>
      <label>Title<input name="title" maxLength={240} placeholder="Optional display title" disabled={pending} /></label>
      <label>Alt text<input name="altText" maxLength={320} placeholder="Describe the visual" disabled={pending} /></label>
      {configured ? <button className="admin-button" disabled={pending}>{pending ? "Uploading..." : "Upload"}</button> : null}
      {configured && pending ? <UploadProgress progress={progress} /> : null}
      {message ? <p aria-live="polite">{message}</p> : null}
    </form>
  );
}
