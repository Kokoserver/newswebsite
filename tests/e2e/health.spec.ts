import { expect, test } from "@playwright/test";

test("health route responds", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({ status: "ok" });
});

test("readiness route verifies the database", async ({ request }) => {
  const response = await request.get("/api/ready");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({ status: "ready" });
});
