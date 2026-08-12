"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function ShareButton({
  title,
  url,
  className,
  children = "Share",
}: {
  title: string;
  url: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyUrl() {
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

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyUrl();
  }

  return (
    <button
      type="button"
      className={className}
      onClick={share}
      aria-label={copied ? "Link copied" : "Share story"}
      aria-pressed={copied}
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      {copied ? "Copied!" : children}
    </button>
  );
}
