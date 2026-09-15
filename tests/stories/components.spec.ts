import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { componentTypes } from '@jjapgma/ui-spec';

test('file UI explains missing configuration, safe upload failure and pending preview', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const find = (name: string) =>
    entries.find((e) => e.title === '빌더/첨부파일' && e.name === name)!.id;
  let enabled = false;
  await page.route('**/api/files/config', (route) =>
    route.fulfill({ json: { enabled, maxBytes: 10485760 } }),
  );
  await page.goto(`/iframe.html?id=${find('Upload')}&viewMode=story`);
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  await expect(page.getByText('파일 업로드 연결 설정이 필요합니다.')).toBeVisible();
  enabled = true;
  await page.reload();
  await page.route('**/api/files/upload?*', (route) =>
    route.fulfill({ status: 503, json: { message: '파일 서비스 인증 설정을 확인해야 합니다.' } }),
  );
  await expect(page.locator('input[type="file"]')).toBeEnabled();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('test') });
  await expect(page.getByRole('alert')).toContainText('파일 서비스 인증 설정');
  await page.route('**/api/projects/*/files/14/preview', (route) =>
    route.fulfill({ json: { ready: false, previewUrl: 'https://file.shnea.kr/files/preview/14' } }),
  );
  await page.goto(`/iframe.html?id=${find('Preview')}&viewMode=story`);
  await expect(page.getByText('미리보기 준비 중…')).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '미리보기 다시 확인' })).toBeVisible();
});

test('catalog renders every registered element and preview controls work', async ({ page }) => {
  const index = await (await page.request.get('/index.json')).json();
  const entry = (Object.values(index.entries) as { id: string; title: string }[]).find(
    (e) => e.title === '빌더/요소 카탈로그',
  )!;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
  await expect(page.locator('[data-catalog-type]')).toHaveCount(componentTypes.length);
  const tabs = page.locator('[data-catalog-type="tabs"]');
  await tabs.getByRole('tab').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
  const toggle = page.locator('[data-catalog-type="switch"]').getByRole('switch');
  await toggle.check();
  await expect(toggle).toBeChecked();
  const accordion = page.locator('[data-catalog-type="accordion"]');
  await accordion.locator('summary').first().click();
  await expect(accordion.locator('details').first()).toHaveAttribute('open', '');
  await expect(page.getByRole('table')).toBeVisible();
  expect(errors).toEqual([]);
});
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
