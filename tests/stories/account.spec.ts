import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('profile supports nickname reset and distinguishes unknown usage from zero', async ({
  page,
}, info) => {
  const index = await (await page.request.get('/index.json')).json();
  const entry = (
    Object.values(index.entries) as { id: string; title: string; name: string }[]
  ).find((v) => v.title === '계정/프로필과 사용량' && v.name === 'Profile')!;
  await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
  await page.getByLabel('닉네임', { exact: true }).fill('화면 디자이너');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('닉네임을 저장했습니다.');
  await expect(page.locator('.account-identity strong')).toHaveText('화면 디자이너');
  await page.getByRole('button', { name: '기본 이름 사용' }).click();
  await expect(page.locator('.account-identity strong')).toHaveText('designer');
  await expect(page.locator('tbody tr').last()).toContainText('미집계');
  await expect(page.locator('tbody tr').last().locator('td').last()).toHaveText('—');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath('account-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('account-mobile.png'), fullPage: true });
});
