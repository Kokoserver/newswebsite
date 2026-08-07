import { expect, test } from "@playwright/test";

test("latest page paginates to older articles", async ({ page }) => {
  await page.goto("/latest");

  await expect(page.locator("h1")).toHaveText("Latest News");
  const page1Titles = await page.locator(".route-card-grid article h2 a").allInnerTexts();
  expect(page1Titles.length).toBeGreaterThan(0);

  const nextLink = page.locator(".pagination-next");
  await expect(nextLink).toHaveText("Older →");
  await nextLink.click();
  await page.waitForURL(/\/latest\?page=2/);

  await expect(page.locator(".pagination-status")).toHaveText("Page 2 of 2");
  const page2Titles = await page.locator(".route-card-grid article h2 a").allInnerTexts();
  expect(page2Titles.length).toBeGreaterThan(0);

  const overlap = page1Titles.filter((title) => page2Titles.includes(title));
  expect(overlap).toHaveLength(0);
});
