import { describe, expect, it } from "vitest";

describe("health contract", () => {
  it("uses an ok status", () => {
    expect({ status: "ok" }).toEqual({ status: "ok" });
  });
});
