import { expect, test } from "@playwright/test";

test("video article renders a playable player instead of an image", async ({ page }) => {
  await page.goto(
    "/articles/inheritance-row-exposes-bitter-split-between-relatives",
  );

  const video = page.locator(".video-player video");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("controls", "");
  await expect(video).toHaveAttribute("poster", /https:\/\/picsum\.photos/);

  const source = video.locator("source");
  await expect(source).toHaveAttribute("src", /flower\.mp4$/);
});

test("watch page uses a real video player", async ({ page }) => {
  await page.goto("/watch/inheritance-dispute-video-explain");

  const video = page.locator(".watch-detail-player video");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("controls", "");
  await expect(video.locator("source")).toHaveAttribute("src", /flower\.mp4$/);
});

test("top story video autoplays inline on the homepage", async ({ page }) => {
  await page.goto("/");

  const video = page.locator(".portal-main video");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("autoplay", "");
  await expect(video).toHaveAttribute("muted", "");
  await expect(video).toHaveAttribute("loop", "");
  await expect(video.locator("source")).toHaveAttribute("src", /flower\.mp4$/);
  await expect(page.locator(".portal-main h1")).toContainText(
    "Inheritance row exposes bitter split between relatives",
  );
});
