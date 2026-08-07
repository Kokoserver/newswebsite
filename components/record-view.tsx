"use client";

import { useEffect } from "react";

const reported = new Set<string>();

function visitorId(): string {
  const stored = localStorage.getItem("dc-visitor-id");

  if (stored) {
    return stored;
  }

  let id = "";

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    id = crypto.randomUUID();
  } else {
    id = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  localStorage.setItem("dc-visitor-id", id);
  return id;
}

export default function RecordView({ articleId }: { articleId: string }) {
  useEffect(() => {
    if (!articleId || reported.has(articleId)) {
      return;
    }

    const payload = JSON.stringify({
      articleId,
      visitorId: visitorId(),
      referrer: document.referrer || undefined,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/views",
        new Blob([payload], { type: "application/json" }),
      );
    } else {
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }

    reported.add(articleId);
  }, [articleId]);

  return null;
}
