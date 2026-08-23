import { describe, expect, it } from "vitest";

import { decodeMediaCursor, encodeMediaCursor } from "@/src/admin/media-cursor";

describe("media pagination cursor", () => {
  it("round-trips the timestamp and stable id", () => {
    const value = { createdAt: 1_787_322_400_000, id: "media-123" };
    expect(decodeMediaCursor(encodeMediaCursor(value))).toEqual(value);
  });

  it("rejects malformed and oversized cursors", () => {
    expect(decodeMediaCursor("not-base64-json")).toBeNull();
    expect(decodeMediaCursor("x".repeat(513))).toBeNull();
  });
});
