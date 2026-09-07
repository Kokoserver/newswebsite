"use client";

type UploadResponseBody = {
  item?: {
    id: string;
    title: string | null;
    kind: string;
    publicUrl: string;
    altText?: string | null;
    caption?: string | null;
    posterUrl?: string | null;
  };
  message?: string;
};

export function uploadMedia(
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; status: number; body: UploadResponseBody }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/media");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      let body: UploadResponseBody = {};
      try {
        body = JSON.parse(request.responseText) as UploadResponseBody;
      } catch {
        // Ignore malformed responses; a generic failure message handles it.
      }
      resolve({ ok: request.status >= 200 && request.status < 300, status: request.status, body });
    };
    request.onerror = () => reject(new Error("The upload could not reach the server."));
    request.onabort = () => reject(new Error("The upload was cancelled."));
    request.send(formData);
  });
}

export function UploadProgress({ progress }: { progress: number | null }) {
  if (progress === null) return null;
  const percent = Math.min(100, Math.max(0, progress));
  return (
    <div className="admin-upload-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="admin-upload-progress-track"><span style={{ width: `${percent}%` }} /></div>
      <small>{percent >= 100 ? "Finalising upload…" : `Uploading… ${percent}%`}</small>
    </div>
  );
}