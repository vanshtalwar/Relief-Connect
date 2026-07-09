import { test, expect } from "@playwright/test";

test("landing page loads and links into the dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /hyperlocal disaster coordination/i })).toBeVisible();
  await page.getByRole("link", { name: /enter dashboard/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});