import { expect, test } from "@playwright/test";

// POST /v3/sessions/ is rate-limited to 5 requests/300s on the live API, so
// this suite mocks the app's own /api/smarkets/session route rather than
// hitting the real upstream on every CI run. The real flow — both the
// failure path and a successful sign-in — has been verified manually
// against the live API; see README.md.

test.describe("Login form", () => {
  test("surfaces the server's error message on invalid credentials", async ({ page }) => {
    await page.route("**/api/smarkets/session", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Incorrect email or password." }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Next.js's own route announcer (`#__next-route-announcer__`) also has
    // role="alert", so match on the visible error text instead of the role.
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("navigates home on a successful sign-in", async ({ page }) => {
    await page.route("**/api/smarkets/session", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: true }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("correct-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });
});
