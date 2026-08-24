import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("change-me-locally");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/admin", { timeout: 90_000 });
}

test("admin can sign in and open the newsroom dashboard", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Newsroom overview" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Administration" })).toContainText("Articles");
  await expect(page.getByRole("navigation", { name: "Administration" })).toContainText("Audit log");
});

test("admin can import Markdown and format ordered and unordered lists", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/articles/new");

  await page.getByRole("button", { name: "Import" }).click();
  await page.getByRole("dialog", { name: "Import Markdown" }).getByRole("textbox").fill("# Imported heading\n\nA **bold** opening paragraph.");
  await page.getByRole("button", { name: "Insert into article" }).click();
  await expect(page.locator(".tiptap h2")).toContainText("Imported heading");
  await expect(page.locator(".tiptap strong")).toContainText("bold");

  await page.getByRole("button", { name: "Bullet list" }).click();
  await expect(page.locator(".tiptap ul")).toContainText("A bold opening paragraph.");
  await page.getByRole("button", { name: "Numbered list" }).click();
  await expect(page.locator(".tiptap ol")).toContainText("A bold opening paragraph.");
});

test("admin can search inline media", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/articles/new");

  await page.getByRole("button", { name: "Media", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Insert media" });
  await expect(picker.getByPlaceholder("Search images and videos")).toBeVisible();
  await expect(picker.locator(".admin-editor-media-grid > button").first()).toBeVisible({ timeout: 30_000 });
  await picker.getByRole("tab", { name: "Upload new", exact: true }).click();
  await expect(picker.getByRole("button", { name: "Upload and insert" })).toBeVisible();
});

test("admin can paginate the central media library", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/media");

  await expect(page.locator(".admin-media-card")).toHaveCount(24);
  const pagination = page.getByRole("navigation", { name: "Media pages" });
  await pagination.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/admin\/media\?.*cursor=/, { timeout: 30_000 });
  await expect(page.locator(".admin-media-card").first()).toBeVisible();
  await expect(pagination.getByRole("link", { name: "Previous" })).toHaveAttribute("aria-disabled", "false");
});

test("unauthenticated readers cannot access admin routes", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});
