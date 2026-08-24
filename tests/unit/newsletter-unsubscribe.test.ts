import { describe, expect, it } from "vitest";

import { createNewsletterUnsubscribeToken, readNewsletterUnsubscribeToken } from "@/src/newsletter/unsubscribe";

describe("newsletter unsubscribe tokens", () => {
  it("round-trips a normalized subscriber email", () => {
    const token = createNewsletterUnsubscribeToken("Reader@Example.com");
    expect(readNewsletterUnsubscribeToken(token)).toBe("reader@example.com");
  });

  it("rejects a modified signature", () => {
    const token = createNewsletterUnsubscribeToken("reader@example.com");
    expect(readNewsletterUnsubscribeToken(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(readNewsletterUnsubscribeToken("not-a-token")).toBeNull();
  });
});
