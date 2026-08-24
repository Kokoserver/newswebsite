import { describe, expect, it } from "vitest";

import { createContentSecurityPolicy } from "@/src/security/content-security-policy";

describe("content security policy", () => {
  it("uses a nonce without unsafe inline directives in production", () => {
    const policy = createContentSecurityPolicy("test-nonce", true);

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-test-nonce'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("permits eval only for the development bundler", () => {
    expect(createContentSecurityPolicy("test-nonce", false)).toContain("'unsafe-eval'");
  });
});
