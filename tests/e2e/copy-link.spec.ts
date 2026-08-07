import { expect, test } from "@playwright/test";

test("copy link copies article url", async ({ page }) => {
  await page.addInitScript(() => {
    let copiedValue: string | null = null;

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          copiedValue = text;
          return Promise.resolve();
        },
        readText: () => Promise.resolve(copiedValue),
      },
    });
  });

  await page.goto("/articles/inheritance-row-exposes-bitter-split-between-relatives");

  const button = page.getByRole("button", { name: "Copy link" }).first();
  await expect(button).toBeVisible();
  await button.click();

  await expect(button).toContainText("Copied!");
  await expect(button).toHaveAttribute("aria-pressed", "true");

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(
    "http://localhost:3000/articles/inheritance-row-exposes-bitter-split-between-relatives",
  );
});
