import { test, expect } from '@playwright/test';
import { mobileLayoutFixture } from '../../apps/web/src/features/editor/mobile-layout.fixture';
import { openSpec } from './helpers';

test('saved desktop layouts use mobile defaults in the editor without rewriting the page', async ({
  page,
}) => {
  const { initial } = await openSpec(page, mobileLayoutFixture(), '모바일 기본 배치');
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  const hero = page.locator('[data-node-id="mobile-hero"]');
  await expect(hero).toHaveCSS('flex-direction', 'column');
  const grid = page.locator('[data-node-id="mobile-grid"]');
  await expect
    .poll(async () => (await grid.locator(':scope > .render-card').first().boundingBox())!.width)
    .toBeGreaterThan(270);
  await expect(
    page.getByRole('button', { name: 'very.long.contact.address@example.com', exact: true }),
  ).toBeVisible();
  const saved = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  expect(saved.spec.root.children[0].style.direction).toBe('row');
  expect(saved.spec.root.children[1].style.gridColumns).toBe(5);
  await page.reload();
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await expect(hero).toHaveCSS('flex-direction', 'column');
});
