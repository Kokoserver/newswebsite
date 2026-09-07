"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevUrlRef = useRef(`${pathname}${searchParams?.toString() ?? ""}`);

  useEffect(() => {
    const currentUrl = `${pathname}${searchParams?.toString() ?? ""}`;
    if (currentUrl === prevUrlRef.current) return;
    prevUrlRef.current = currentUrl;

    if (timerRef.current) clearInterval(timerRef.current);

    setVisible(true);
    setProgress(10);

    const step = () => {
      setProgress((value) => {
        if (value >= 90) {
          if (timerRef.current) clearInterval(timerRef.current);
          return value;
        }
        return value + Math.random() * 22;
      });
    };

    timerRef.current = setInterval(step, 160);

    const finish = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      const done = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      prevUrlRef.current = `${pathname}${searchParams?.toString() ?? ""}`;
      return () => window.clearTimeout(done);
    };

    const raf = requestAnimationFrame(finish);
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div className="navigation-progress" role="status" aria-label="Loading page">
      <span
        className="navigation-progress-bar"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
