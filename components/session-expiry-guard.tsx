"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const MAX_TIMEOUT_MS = 2_147_483_647;

export default function SessionExpiryGuard({ expiresAt }: { expiresAt: number }) {
  const router = useRouter();

  useEffect(() => {
    let timeoutId: number | undefined;
    let signingOut = false;

    function expireSession() {
      if (signingOut || Date.now() < expiresAt) return;
      signingOut = true;
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const loginUrl = `/login?reason=session-expired&callbackUrl=${encodeURIComponent(returnTo)}`;
      void signOut({ callbackUrl: loginUrl }).catch(() => {
        router.replace(loginUrl);
        router.refresh();
      });
    }

    function scheduleExpiry() {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) return expireSession();
      timeoutId = window.setTimeout(scheduleExpiry, Math.min(remaining, MAX_TIMEOUT_MS));
    }

    function checkVisibleSession() {
      if (document.visibilityState === "visible") expireSession();
    }

    scheduleExpiry();
    window.addEventListener("focus", expireSession);
    document.addEventListener("visibilitychange", checkVisibleSession);
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", expireSession);
      document.removeEventListener("visibilitychange", checkVisibleSession);
    };
  }, [expiresAt, router]);

  return null;
}
