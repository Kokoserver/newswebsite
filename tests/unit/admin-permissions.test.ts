import { describe, expect, it } from "vitest";

import { hasPermission } from "@/src/admin/access-policy";

describe("admin permission policy", () => {
  it("gives super administrators access to privileged modules", () => {
    expect(hasPermission("SUPER_ADMIN", "users:manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "audit:view")).toBe(true);
  });

  it("keeps editor access focused on newsroom operations", () => {
    expect(hasPermission("EDITOR", "articles:publish")).toBe(true);
    expect(hasPermission("EDITOR", "comments:moderate")).toBe(true);
    expect(hasPermission("EDITOR", "users:manage")).toBe(false);
    expect(hasPermission("EDITOR", "audit:view")).toBe(false);
  });

  it("limits authors to their editorial workspace", () => {
    expect(hasPermission("AUTHOR", "articles:create")).toBe(true);
    expect(hasPermission("AUTHOR", "media:upload")).toBe(true);
    expect(hasPermission("AUTHOR", "articles:publish")).toBe(false);
    expect(hasPermission("READER", "dashboard:view")).toBe(false);
  });
});
