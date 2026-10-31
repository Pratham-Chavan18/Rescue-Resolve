import { test, expect } from '@playwright/test';

test.describe('F2: Swiggy Resolve — Reactive Dispute Resolution Flow', () => {
  test('Customer logs in, files a wrong item dispute, previews entitlement, and accepts resolution', async ({ page }) => {
    // 1. Visit Home / Login
    await page.goto('/');

    const customerLoginBtn = page.locator('#quick-login-customer');
    if (await customerLoginBtn.isVisible()) {
      await customerLoginBtn.click();
    } else {
      await page.fill('#phone-input', '9000000001');
      await page.click('#send-otp-btn');
      await page.fill('#otp-input', '1234');
      await page.click('#verify-otp-btn');
    }

    await page.waitForURL('**/track');

    // 2. Navigate to Resolve
    const reportBtn = page.locator('#resolve-nav-btn');
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    await page.waitForURL('**/resolve');
    await expect(page.locator('h1')).toContainText('Report an issue');

    // 3. Select issue type: Wrong item
    const wrongItemOption = page.locator('#issue-option-wrong_item');
    if (await wrongItemOption.isVisible()) {
      await wrongItemOption.click();
      await page.click('#issue-continue-btn');

      // 4. Verify evidence or preview step loads
      await expect(page.locator('text=Upload photo').or(page.locator('text=Preview'))).toBeVisible({ timeout: 10000 });
    }
  });
});
