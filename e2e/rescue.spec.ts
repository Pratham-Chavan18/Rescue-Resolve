import { test, expect } from '@playwright/test';

test.describe('F1: Swiggy Rescue — Proactive Recovery Flow', () => {
  test('Customer logs in, views live order, triggers simulator fault, and accepts rescue credit', async ({ page }) => {
    // 1. Visit Home / Login
    await page.goto('/');
    await expect(page).toHaveTitle(/Swiggy Unified Recovery/i);

    // 2. Select Customer Demo Quick Login
    const customerLoginBtn = page.locator('#quick-login-customer');
    if (await customerLoginBtn.isVisible()) {
      await customerLoginBtn.click();
    } else {
      await page.fill('#phone-input', '9000000001');
      await page.click('#send-otp-btn');
      await page.fill('#otp-input', '1234');
      await page.click('#verify-otp-btn');
    }

    // 3. Should redirect to /track
    await page.waitForURL('**/track');
    await expect(page.locator('text=Your order')).toBeVisible();

    // 4. Check simulator controls are available
    const simRiderStuck = page.locator('#sim-fault-rider_stuck');
    if (await simRiderStuck.isVisible()) {
      await simRiderStuck.click();

      // 5. Verify Rescue Bottom Sheet / choice buttons appear
      const waitChoiceBtn = page.locator('#rescue-choice-wait');
      await expect(waitChoiceBtn).toBeVisible({ timeout: 10000 });

      // 6. Click "Wait with credit"
      await waitChoiceBtn.click();

      // 7. Verify confirmation notification banner
      await expect(page.locator('text=credit on its way')).toBeVisible({ timeout: 5000 });
    }
  });
});
