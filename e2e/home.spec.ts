import { expect, test } from "@playwright/test";

// Hits the real Smarkets API through the app's own route handlers — no
// mocking, consistent with the rest of this project's "verify against the
// live API" philosophy. Assertions are structural (at least one event link
// exists) rather than pinned to specific team/event names, since the live
// feed changes over time.

test.describe("Homepage", () => {
  test("shows the exchange header and at least one live event", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Smarkets" })).toBeVisible();
    await expect(page.getByText(/delayed prices|live prices/i)).toBeVisible();

    const eventLinks = page.locator('a[href^="/events/"]');
    await expect(eventLinks.first()).toBeVisible({ timeout: 15_000 });
    expect(await eventLinks.count()).toBeGreaterThan(0);

    // A priced contract, not just an event link — proves the homepage's
    // markets/contracts/quotes batch actually populated, not only the
    // events list. PriceButton's accessible name always starts with
    // "Back "/"Lay " when that side has liquidity — stable regardless of
    // which live event/contract it is.
    await expect(
      page.getByRole("button", { name: /^(Back|Lay) /i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("renders at least one section heading", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: 15_000 });
  });
});
