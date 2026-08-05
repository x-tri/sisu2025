import { expect, test } from '@playwright/test';
import { installApiMocks } from './fixtures/api';
import { selectVerifiedL1Course } from './fixtures/flows';

const viewports = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name}: não cria rolagem horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installApiMocks(page);
    await page.goto('/');
    await selectVerifiedL1Course(page);

    const dimensions = await page.evaluate(() => ({
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));

    expect(dimensions.documentScrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
      dimensions.documentClientWidth,
    );
    expect(dimensions.bodyScrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
      dimensions.bodyClientWidth,
    );
  });
}
