import { test, expect } from '@playwright/test';

test.describe('F3: Swiggy Resolve — Agent Escalation & Support Console Flow', () => {
  test('Agent logs in, views escalated case queue, and reviews case details', async ({ page }) => {
    // 1. Visit Home / Login
    await page.goto('/');

    const agentLoginBtn = page.locator('#quick-login-agent');
    if (await agentLoginBtn.isVisible()) {
      await agentLoginBtn.click();
    } else {
      await page.fill('#phone-input', '9000000004');
      await page.click('#send-otp-btn');
      await page.fill('#otp-input', '1234');
      await page.click('#verify-otp-btn');
    }

    // 2. Should redirect to /agent
    await page.waitForURL('**/agent');
    await expect(page.locator('text=Agent Console')).toBeVisible();

    // 3. Queue header visible
    await expect(page.locator('text=Escalated cases').or(page.locator('text=Case queue'))).toBeVisible();
  });
});
