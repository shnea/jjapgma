import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('shared dialog manages focus, busy dismissal and scrolling on small screens', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = (name: string) =>
    entries.find((item) => item.title === '공통/Dialog' && item.name === name)!.id;
  await page.goto(`/iframe.html?id=${story('Default')}&viewMode=story`);
  const trigger = page.getByRole('button', { name: '대화상자 열기' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '프로젝트 설정' });
  await expect(dialog.getByLabel('프로젝트 이름')).toBeFocused();
  await dialog.getByRole('button', { name: '완료' }).focus();
  await page.keyboard.press('Tab');
  await expect(trigger).not.toBeFocused();
  // Native Chromium dialogs can visit browser chrome before cycling back to the dialog.
  if (!(await page.evaluate(() => document.hasFocus()))) await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '닫기' })).toBeFocused();
  await trigger.focus();
  await expect(dialog.getByRole('button', { name: '닫기' })).toBeFocused();
  expect((await new AxeBuilder({ page }).include('.app-dialog').analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await page.goto(`/iframe.html?id=${story('Busy')}&viewMode=story`);
  await trigger.click();
  await expect(dialog.getByRole('button', { name: '닫기' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();

  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto(`/iframe.html?id=${story('Long Content')}&viewMode=story`);
  await trigger.click();
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.height).toBeLessThanOrEqual(448);
  await dialog.getByRole('button', { name: '완료' }).scrollIntoViewIfNeeded();
  await dialog.getByRole('button', { name: '완료' }).click();
  await expect(trigger).toBeFocused();
});
