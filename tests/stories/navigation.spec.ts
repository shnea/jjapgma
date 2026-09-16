import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('project selector, page settings focus and shared notification read states are accessible', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = (title: string, name: string) =>
    entries.find((item) => item.title === title && item.name === name)!.id;
  await page.goto(`/iframe.html?id=${story('프로젝트/프로젝트 전환', 'Default')}&viewMode=story`);
  await page.getByLabel('프로젝트 전환').selectOption('shared');
  await expect(page.getByLabel('프로젝트 전환')).toHaveValue('shared');
  await page.goto(`/iframe.html?id=${story('프로젝트/페이지 수정', 'Editable')}&viewMode=story`);
  const trigger = page.getByRole('button', { name: '페이지 수정', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '페이지 수정' });
  await expect(dialog.getByLabel('페이지 이름')).toBeFocused();
  await dialog.getByLabel('페이지 이름').fill('수정된 페이지');
  expect(
    (await new AxeBuilder({ page }).include('.page-settings-dialog').analyze()).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByLabel('페이지 이름').fill('수정된 페이지');
  await dialog.getByRole('button', { name: '이름 저장' }).click();
  await expect(page.getByText('수정된 페이지', { exact: true })).toBeVisible();
  await page.goto(`/iframe.html?id=${story('프로젝트/공유 알림', 'Unread')}&viewMode=story`);
  await expect(page.locator('button.unread')).toHaveCount(1);
  await page.getByRole('button', { name: '모두 읽음' }).click();
  await expect(page.locator('button.unread')).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).include('.notification-panel').analyze()).violations,
  ).toEqual([]);
});
