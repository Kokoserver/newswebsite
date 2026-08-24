import { describe, expect, it } from "vitest";

import { resolveSessionExpiresAt, SESSION_MAX_AGE_SECONDS } from "@/src/auth";

describe("session expiry", () => {
  it("assigns an immutable expiry deadline to a new JWT", () => {
    const now = Date.parse("2026-08-23T12:00:00.000Z");

    expect(resolveSessionExpiresAt(undefined, undefined, now)).toBe(
      now + SESSION_MAX_AGE_SECONDS * 1000,
    );
  });

  it("preserves the deadline when NextAuth refreshes the JWT", () => {
    const sessionExpiresAt = Date.now() + 60_000;

    expect(resolveSessionExpiresAt(sessionExpiresAt, Date.now() / 1000)).toBe(sessionExpiresAt);
  });
});
