import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const VIEWPORTS = [
  { name: '320_small_mobile', width: 320, height: 568 },
  { name: '360_android', width: 360, height: 640 },
  { name: '375_iphone', width: 375, height: 667 },
  { name: '390_iphone_14', width: 390, height: 844 },
  { name: '414_iphone_plus', width: 414, height: 896 },
  { name: '768_tablet', width: 768, height: 1024 },
  { name: '1024_desktop_small', width: 1024, height: 768 },
  { name: '1280_desktop', width: 1280, height: 800 },
  { name: '1440_desktop_large', width: 1440, height: 900 },
];

const screenshotDir = path.resolve('docs/screenshots');

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

test.describe('Responsive & Visual Quality Audit', () => {
  test('Landing Page renders with no horizontal overflow across all 9 viewports', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify page title and heading
      await expect(page.locator('h1')).toBeVisible();

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow, `Overflow detected at ${vp.width}px`).toBeFalsy();
    }
  });

  test('Capture required audit screenshots', async ({ page }) => {
    // 1. Landing page — desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '01_landing_desktop_1440.png'), fullPage: false });

    // 2. Landing page — mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '02_landing_mobile_375.png'), fullPage: false });

    // 3. Customer Login & Dashboard — desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('#quick-login-customer').click();
    await page.waitForURL('**/track');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '03_customer_dashboard_desktop_1440.png') });

    // 4. Customer dashboard — mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '04_customer_dashboard_mobile_375.png') });

    // 5. Rescue page — mobile (375px)
    await page.goto('/rescue');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '05_rescue_mobile_375.png') });

    // 6. Resolve page — mobile (375px)
    await page.goto('/resolve');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '06_resolve_mobile_375.png') });

    // 7. Restaurant dashboard — mobile (375px)
    await page.goto('/');
    await page.locator('#quick-login-restaurant').click();
    await page.waitForURL('**/partner/restaurant');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '07_restaurant_mobile_375.png') });

    // 8. Rider dashboard — mobile (375px)
    await page.goto('/');
    await page.locator('#quick-login-rider').click();
    await page.waitForURL('**/partner/rider');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '08_rider_mobile_375.png') });

    // 9. Agent dashboard — desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('#quick-login-agent').click();
    await page.waitForURL('**/agent');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '09_agent_desktop_1440.png') });

    // 10. Simulator drawer — desktop and mobile
    const simBtn = page.locator('#toggle-simulator-btn');
    if (await simBtn.isVisible()) {
      await simBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, '10_simulator_drawer_desktop_1440.png') });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(screenshotDir, '10_simulator_drawer_mobile_375.png') });
    }
  });
});
