"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export type AdvertisementMediaItem = {
  id: string;
  kind: string;
  publicUrl: string;
  posterUrl?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

type Advertisement = {
  id: string;
  name: string;
  targetUrl: string;
  mediaUrl?: string | null;
  mediaAlt?: string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  mediaItems?: AdvertisementMediaItem[];
};

const SLIDE_MS = 5000;

export default function AdvertisementSlot({
  ad,
  label = "Advertisement",
  variant = "billboard",
}: {
  ad?: Advertisement | null;
  label?: string;
  variant?: "billboard" | "rail" | "strip";
}) {
  const slides: AdvertisementMediaItem[] = useMemo(
    () => (ad?.mediaItems ?? []).filter((item) => Boolean(item.publicUrl)),
    [ad?.mediaItems],
  );

  const multiple = slides.length > 1;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeIndex = slides.length > 0 ? index % slides.length : 0;

  useEffect(() => {
    if (!multiple || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [multiple, paused, slides.length]);

  function stopGo(event: React.MouseEvent, nextId: number) {
    event.preventDefault();
    event.stopPropagation();
    const count = slides.length;
    setIndex(((nextId % count) + count) % count);
  }

  const active = slides[activeIndex];

  let content: React.ReactNode;
  if (multiple) {
    content =
      active?.kind === "VIDEO" ? (
        <video
          key={`v-${active.id}`}
          src={active.publicUrl}
          poster={active.posterUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className="ad-media-video"
          aria-label={ad?.name ?? label}
        />
      ) : (
        <Image
          key={`i-${active.id}`}
          src={active.publicUrl}
          alt={active.alt ?? ad?.mediaAlt ?? ad?.name ?? label}
          width={active.width ?? (variant === "rail" ? 300 : 1200)}
          height={active.height ?? (variant === "rail" ? 360 : 320)}
          sizes={variant === "rail" ? "(max-width: 1020px) 50vw, 300px" : "(max-width: 1120px) 100vw, 1120px"}
        />
      );
  } else if (ad?.mediaItems?.[0]) {
    const item = ad.mediaItems[0];
    content =
      item.kind === "VIDEO" ? (
        <video
          src={item.publicUrl}
          poster={item.posterUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className="ad-media-video"
          aria-label={ad?.name ?? label}
        />
      ) : (
        <Image
          src={item.publicUrl}
          alt={item.alt ?? ad?.mediaAlt ?? ad?.name ?? label}
          width={item.width ?? (variant === "rail" ? 300 : 1200)}
          height={item.height ?? (variant === "rail" ? 360 : 320)}
          sizes={variant === "rail" ? "(max-width: 1020px) 50vw, 300px" : "(max-width: 1120px) 100vw, 1120px"}
        />
      );
  } else if (ad?.mediaUrl) {
    content = (
      <Image
        src={ad.mediaUrl}
        alt={ad.mediaAlt ?? ad.name}
        width={ad.mediaWidth ?? (variant === "rail" ? 300 : 1200)}
        height={ad.mediaHeight ?? (variant === "rail" ? 360 : 320)}
        sizes={variant === "rail" ? "(max-width: 1020px) 50vw, 300px" : "(max-width: 1120px) 100vw, 1120px"}
      />
    );
  } else {
    content = <strong>THE WORLD CURRENT</strong>;
  }

  return (
    <aside
      className={`ad-module ${variant}${multiple ? " is-multi" : ""}`}
      aria-label={label}
      onMouseEnter={multiple ? () => setPaused(true) : undefined}
      onMouseLeave={multiple ? () => setPaused(false) : undefined}
    >
      {ad ? (
        <a href={ad.targetUrl} rel="nofollow noreferrer" target="_blank">
          {content}
        </a>
      ) : (
        <div>{content}</div>
      )}

      {multiple ? (
        <>
          <button
            type="button"
            className="ad-slideshow-arrow prev"
            onClick={(event) => stopGo(event, activeIndex - 1)}
            aria-label="Previous ad"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="ad-slideshow-arrow next"
            onClick={(event) => stopGo(event, activeIndex + 1)}
            aria-label="Next ad"
          >
            <ChevronRight size={20} />
          </button>
        </>
      ) : null}
    </aside>
  );
}
