"use client";

import { Bookmark, Check } from "lucide-react";
import { useEffect, useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
  }

  return (
    <button
      type="button"
      className="share-copy"
      onClick={copy}
      aria-pressed={copied}
      aria-label="Copy link"
    >
      {copied ? <Check size={15} /> : <Bookmark size={15} />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
