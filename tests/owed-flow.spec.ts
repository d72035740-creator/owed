import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

async function resetDemo(request: APIRequestContext) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request.post("/api/owed/reset");
    if (response.ok()) return;
  }
  throw new Error("Could not reset the synthetic demo");
}

async function openDemo(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/");
    if (
      await page
        .getByRole("heading", { name: "₹23,740 still owed" })
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }
  }
  throw new Error("Could not load the synthetic demo");
}

async function reloadUntilVisible(page: Page, selector: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.reload();
    if (await page.locator(selector).isVisible().catch(() => false)) return;
  }
  throw new Error(`Persisted state did not reload: ${selector}`);
}

test("completes the synthetic OWED journey", async ({ page, request }) => {
  await resetDemo(request);
  await openDemo(page);

  await expect(page.getByRole("heading", { name: "₹23,740 still owed" })).toBeVisible();
  await expect(page.getByText("SBI ••••1028", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Fix where my refund goes" }).click();
  await expect(page.getByText("HDFC Bank", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Validate account" }).click();
  await expect(page.getByRole("button", { name: "Authorize HDFC" })).toBeVisible({ timeout: 120_000 });

  await reloadUntilVisible(page, 'button:has-text("Authorize HDFC")');
  await expect(page.getByRole("button", { name: "Authorize HDFC" })).toBeVisible({ timeout: 120_000 });
  await page.getByRole("button", { name: "Authorize HDFC" }).dblclick();

  await expect(page.getByText("Refund remains unpaid", { exact: true })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Refund Reissue Request", { exact: true })).toBeVisible();
  await expect(page.getByText("Payment resumed automatically", { exact: true })).toBeVisible();
  await expect(page.locator("#outcome-heading")).toHaveText("₹23,740 delivered", {
    timeout: 120_000,
  });
  await expect(page.getByText(/Government obligation: Completed/)).toBeVisible();
  await expect(page.locator(".metrics-grid div").nth(0)).toContainText("1");
  await expect(page.locator(".metrics-grid div").nth(0)).toContainText("failed delivery");
  await expect(page.locator(".metrics-grid div").nth(1)).toContainText("1");
  await expect(page.locator(".metrics-grid div").nth(1)).toContainText("destination repair");
  await expect(page.locator(".metrics-grid div").nth(2)).toContainText("0");
  await expect(page.locator(".metrics-grid div").nth(2)).toContainText("reapplications");
  await expect(page.getByRole("button", { name: /Retry refund|Refund Reissue|Submit refund/i })).toHaveCount(0);
  await page.getByText("View what OWED did", { exact: true }).click();
  await expect(page.getByText("OWED → COMPLETED", { exact: true })).toBeVisible();
  await expect(page.getByText("SCHEDULED → PROCESSING → DELIVERED", { exact: true })).toBeVisible();
  await expect(page.getByText("PREVENTED", { exact: true })).toBeVisible();

  await reloadUntilVisible(page, "#outcome-heading");
  await expect(page.locator("#outcome-heading")).toHaveText("₹23,740 delivered", {
    timeout: 120_000,
  });

  await resetDemo(request);
});
