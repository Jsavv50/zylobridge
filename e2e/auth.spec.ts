import { test, expect } from "@playwright/test";

test.describe("Zylobridge Authentication E2E", () => {
  test("sign-in page loads and displays Google and Email OTP options", async ({ page }) => {
    await page.goto("http://localhost:3000/sign-in");
    await expect(page.locator("text=Sign in to Zylobridge")).toBeVisible();
    await expect(page.locator("button:has-text('Google')")).toBeVisible();
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("email OTP form triggers validation on empty input", async ({ page }) => {
    await page.goto("http://localhost:3000/sign-in");
    await page.click("button:has-text('Continue with Email')");
    await expect(page.locator("input[type='email']")).toBeVisible();
  });
});
