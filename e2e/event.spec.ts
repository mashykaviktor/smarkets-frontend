import { expect, test } from "@playwright/test";

// Assertions here are structural (roles/accessible names from the real
// components — MarketCard's <h3>, PriceButton's "Back "/"Lay " prefix),
// never live team/event names, so they stay resilient as the feed changes.

test.describe("Event page", () => {
  test("clicking an event card navigates to a page rendering at least one market and one priced contract", async ({
    page,
  }) => {
    await page.goto("/");

    const firstEventLink = page.locator('a[href^="/events/"]').first();
    await expect(firstEventLink).toBeVisible({ timeout: 15_000 });
    await firstEventLink.click();

    await expect(page).toHaveURL(/\/events\/\d+$/);
    await expect(page.getByRole("link", { name: /all events/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // At least one market card (MarketCard renders its market name as an
    // <h3>) — proves the markets/contracts fetch actually populated the
    // page, not just the event header.
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible({ timeout: 15_000 });

    // At least one priced contract: PriceButton's accessible name always
    // starts with "Back " or "Lay " (a stable prefix, independent of the
    // contract name or odds value) when that side has liquidity.
    await expect(
      page.getByRole("button", { name: /^(Back|Lay) /i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("a non-existent event shows a clean not-found state, not a crash", async ({ page }) => {
    await page.goto("/events/00000000");

    await expect(page.getByText(/could not be found/i)).toBeVisible();
  });
});
