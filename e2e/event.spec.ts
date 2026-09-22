import { expect, test } from "@playwright/test";

test.describe("Event page", () => {
  test("clicking an event card navigates to its own page with markets", async ({ page }) => {
    await page.goto("/");

    const firstEventLink = page.locator('a[href^="/events/"]').first();
    await expect(firstEventLink).toBeVisible({ timeout: 15_000 });
    await firstEventLink.click();

    await expect(page).toHaveURL(/\/events\/\d+$/);
    await expect(page.getByRole("link", { name: /all events/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a non-existent event shows a clean not-found state, not a crash", async ({ page }) => {
    await page.goto("/events/00000000");

    await expect(page.getByText(/could not be found/i)).toBeVisible();
  });
});
