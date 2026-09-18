import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('rich text design edits apply, cancel and clear through the real package', async ({
  page,
}) => {
  await page.goto('/iframe.html?id=빌더-서식-편집기--design&viewMode=story');
  await page.getByRole('button', { name: '본문 편집', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '본문 편집', exact: true });
  const input = dialog.locator('[contenteditable=true]');
  await input.fill('새롭게 작성한 본문');
  await dialog.getByRole('button', { name: '본문 적용' }).click();
  await expect(page.locator('.render-richText')).toContainText('새롭게 작성한 본문');
  await page.getByLabel('본문 기본 글꼴').selectOption('serif');
  await expect(page.locator('.render-richText .bn-editor')).toHaveCSS('font-family', /Georgia/);
  await page.getByRole('button', { name: '본문 편집', exact: true }).click();
  await input.fill('취소할 문구');
  await dialog.getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.locator('.render-richText')).not.toContainText('취소할 문구');
  await page.getByRole('button', { name: '본문 편집', exact: true }).click();
  await input.fill('');
  await dialog.getByRole('button', { name: '본문 적용' }).click();
  await expect(page.locator('.render-richText')).not.toContainText('새롭게 작성한 본문');
});

test('rich text viewer and table remain readable on mobile and expose no editable controls', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/iframe.html?id=빌더-서식-편집기--viewer&viewMode=story&args=breakpoint:mobile');
  await expect(page.getByText('달라진 점', { exact: true })).toBeVisible();
  await expect(page.locator('[contenteditable=true]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include('.rich-text-surface').analyze()).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test('image size controls fit their labels and change image presets in preview', async ({
  page,
}, testInfo) => {
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/iframe.html?id=빌더-서식-편집기--image-controls&viewMode=story');
    const image = page.locator('.bn-editor img');
    for (const [label, preset] of [
      ['33%', '2'],
      ['50%', '1'],
      ['100%', '3'],
      ['원본', null],
    ] as const) {
      await image.click();
      const menu = page.locator('.shnea-blocknote-image-menu');
      await expect(menu).toBeVisible();
      await expect
        .poll(async () => {
          const bounds = await menu.boundingBox();
          return !!bounds && bounds.x >= 0 && bounds.x + bounds.width <= width;
        })
        .toBe(true);
      expect(
        await menu
          .locator('button')
          .evaluateAll((buttons) =>
            buttons.every(
              (button) =>
                button.scrollHeight <= button.clientHeight &&
                button.scrollWidth <= button.clientWidth,
            ),
          ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`image-controls-${width}-${preset ?? 'original'}.png`),
      });
      await menu.getByRole('button', { name: label, exact: true }).click();
      if (preset)
        await expect(page.locator('.bn-block-content[data-content-type=image]')).toHaveAttribute(
          'data-preview-width',
          preset,
        );
      else
        await expect(
          page.locator('.bn-block-content[data-content-type=image]'),
        ).not.toHaveAttribute('data-preview-width');
    }
  }
});
