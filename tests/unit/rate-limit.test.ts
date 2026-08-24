import { beforeEach, describe, expect, it } from "vitest";

import { checkRateLimit, resetMemoryRateLimitsForTests } from "@/src/security/rate-limit";

describe("rate limiter fallback", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    resetMemoryRateLimitsForTests();
  });

  it("rejects requests beyond the fixed-window limit", async () => {
    await expect(checkRateLimit("client-a", 2, 60_000)).resolves.toMatchObject({ allowed: true });
    await expect(checkRateLimit("client-a", 2, 60_000)).resolves.toMatchObject({ allowed: true });
    await expect(checkRateLimit("client-a", 2, 60_000)).resolves.toMatchObject({ allowed: false });
  });

  it("keeps independent clients in separate buckets", async () => {
    await checkRateLimit("client-a", 1, 60_000);
    await expect(checkRateLimit("client-b", 1, 60_000)).resolves.toMatchObject({ allowed: true });
  });
});
