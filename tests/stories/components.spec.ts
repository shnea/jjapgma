import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('shared button states are keyboard reachable and loading prevents activation', async ({
  page,
}) => {
  // Read IDs from the generated Storybook index, so titles can remain Korean.
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const find = (title: string, name: string) =>
    entries.find((e) => e.title === title && e.name === name)!.id;
  await page.goto(`/iframe.html?id=${find('공통/버튼', 'Primary')}&viewMode=story`);
  const button = page.getByRole('button', { name: '변경 저장' });
  await expect(button).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  expect((await new AxeBuilder({ page }).include('#storybook-root').analyze()).violations).toEqual(
    [],
  );
  await page.goto(`/iframe.html?id=${find('공통/버튼', 'Loading')}&viewMode=story`);
  await expect(page.getByRole('button')).toBeDisabled();
});
test('renderer input supports typing, labels, disabled state and mobile visibility', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const find = (name: string) =>
    entries.find((e) => e.title === '빌더/화면 요소' && e.name === name)!.id;
  await page.goto(`/iframe.html?id=${find('Input')}&viewMode=story`);
  await page.getByLabel('이메일').fill('test@example.com');
  await expect(page.getByLabel('이메일')).toHaveValue('test@example.com');
  expect((await new AxeBuilder({ page }).include('#storybook-root').analyze()).violations).toEqual(
    [],
  );
  await page.goto(`/iframe.html?id=${find('Disabled')}&viewMode=story`);
  await expect(page.getByLabel('이메일')).toBeDisabled();
  await page.goto(`/iframe.html?id=${find('Mobile Hidden')}&viewMode=story`);
  await expect(page.getByLabel('이메일')).toBeHidden();
});
