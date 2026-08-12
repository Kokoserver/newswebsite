"use client";

import { useEffect, useState } from "react";

export default function StickySiteHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    function updateScrolled() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollTop = Math.max(
          window.scrollY,
          document.documentElement.scrollTop,
          document.body.scrollTop,
          document.scrollingElement?.scrollTop ?? 0,
        );

        setScrolled(scrollTop > 4);
      });
    }

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    document.addEventListener("scroll", updateScrolled, { passive: true, capture: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrolled);
      document.removeEventListener("scroll", updateScrolled, { capture: true });
    };
  }, []);

  return (
    <div className={`sticky-site-header${className ? ` ${className}` : ""} ${scrolled ? "is-scrolled" : ""}`}>
      {children}
    </div>
  );
}
