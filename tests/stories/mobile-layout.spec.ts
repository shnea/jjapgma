import { test, expect } from '@playwright/test';

test('mobile defaults fill the available width, stack sections and wrap long content without clipping', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = (name: string) =>
    entries.find((e) => e.title === '빌더/모바일 기본 배치' && e.name === name)!.id;
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/iframe.html?id=${story('Mobile')}&viewMode=story`);
    const hero = page.locator('[data-node-id="mobile-hero"]');
    const grid = page.locator('[data-node-id="mobile-grid"]');
    await expect(hero).toHaveCSS('flex-direction', 'column');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('[data-node-id="mobile-actions"]')).toHaveCSS('flex-wrap', 'wrap');
    const first = await grid.locator(':scope > .render-card').first().boundingBox();
    const bounds = await grid.boundingBox();
    expect(first!.width).toBeGreaterThan(bounds!.width - 2);
    const overflows = await page
      .locator('[data-node-id="mobile-page"]')
      .evaluate((root) =>
        [...root.querySelectorAll('.render-node, .element-button, .button-text, h2, p')]
          .filter((el) => el.scrollWidth > el.clientWidth + 2)
          .map((el) => el.className),
      );
    expect(overflows).toEqual([]);
    await page.screenshot({ path: `test-results/mobile-default-${width}.png`, fullPage: true });
  }
  await page.goto(`/iframe.html?id=${story('Two Columns')}&viewMode=story`);
  const cards = page.locator('[data-node-id="mobile-grid"] > .render-card');
  expect((await cards.nth(0).boundingBox())!.y).toBe((await cards.nth(1).boundingBox())!.y);
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(`/iframe.html?id=${story('Desktop')}&viewMode=story`);
  await expect(page.locator('[data-node-id="mobile-hero"]')).toHaveCSS('flex-direction', 'row');
  const desktop = page.locator('[data-node-id="mobile-grid"] > .render-card');
  expect((await desktop.first().boundingBox())!.y).toBe((await desktop.last().boundingBox())!.y);
});
