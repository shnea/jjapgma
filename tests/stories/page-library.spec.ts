import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createTemplate } from '@jjapgma/ui-spec';
test('input row actions center on the control across labels, heights, editor mode and mobile layout', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = entries.find(
    (item) => item.title === '프로젝트/페이지 라이브러리' && item.name === 'Input Action Alignment',
  )!.id;
  await page.goto(`/iframe.html?id=${story}&viewMode=story`);
  const input = page.locator('.input-actions-story input[type="search"]');
  const button = page.locator('.input-actions-story .element-button');
  async function centered() {
    await expect
      .poll(async () => {
        const a = (await input.boundingBox())!,
          b = (await button.boundingBox())!;
        return Math.abs(a.y + a.height / 2 - b.y - b.height / 2);
      })
      .toBeLessThan(1);
    const a = (await input.boundingBox())!,
      b = (await button.boundingBox())!;
    expect(b.y).toBeGreaterThan(a.y);
    expect(b.y + b.height).toBeLessThan(a.y + a.height);
  }
  await centered();
  await page.getByLabel('큰 입력칸', { exact: true }).check();
  await centered();
  for (const position of ['left', 'right', 'top']) {
    await page.getByLabel('라벨 위치', { exact: true }).selectOption(position);
    await centered();
  }
  await page.getByLabel('라벨 표시', { exact: true }).uncheck();
  await centered();
  await page.getByLabel('미리보기 모드', { exact: true }).uncheck();
  await centered();
  await page.getByLabel('모바일 배치', { exact: true }).check();
  await expect(page.locator('.input-actions-story .render-button')).toHaveCSS(
    'margin-bottom',
    '0px',
  );
  const a = (await input.boundingBox())!,
    b = (await button.boundingBox())!;
  expect(b.y).toBeGreaterThan(a.y + a.height);
  await page.getByLabel('모바일 배치', { exact: true }).uncheck();
  await centered();
  await page.getByLabel('큰 입력칸', { exact: true }).uncheck();
  await page.getByLabel('라벨 표시', { exact: true }).check();
  await centered();
  await page.screenshot({ path: 'test-results/input-action-alignment.png', fullPage: true });
});
test('template sidebar previews, empty and failed personal lists, readonly state and keyboard resizing', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = (name: string) =>
    entries.find((item) => item.title === '프로젝트/페이지 라이브러리' && item.name === name)!.id;
  await page.route('**/api/templates', (route) => route.fulfill({ json: [] }));
  await page.goto(`/iframe.html?id=${story('Template Panel')}&viewMode=story`);
  await page.getByRole('button', { name: '요금·결제', exact: true }).click();
  await expect(page.getByRole('button', { name: '요금제 비교 미리보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '랜딩 페이지 미리보기' })).toHaveCount(0);
  await page.getByRole('button', { name: '전체', exact: true }).click();
  await page.getByRole('button', { name: '랜딩 페이지 미리보기' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include('.page-library-dialog').analyze()).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '랜딩 페이지 미리보기' })).toBeFocused();
  await page.getByRole('button', { name: '내 템플릿', exact: true }).click();
  await expect(page.getByText(/저장한 템플릿이 없습니다/)).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.template-panel').analyze()).violations).toEqual(
    [],
  );
  await page.unroute('**/api/templates');
  await page.route('**/api/templates', (route) =>
    route.fulfill({ status: 503, json: { message: '목록을 불러올 수 없습니다.' } }),
  );
  await page.getByRole('button', { name: '공식 템플릿', exact: true }).click();
  await page.getByRole('button', { name: '내 템플릿', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('목록을 불러올 수 없습니다.');
  await expect(page.getByRole('button', { name: '다시 불러오기' })).toBeVisible();
  const separator = page.getByRole('separator');
  await separator.focus();
  await page.keyboard.press('Home');
  await expect(separator).toHaveAttribute('aria-valuenow', '300');
  await page.goto(`/iframe.html?id=${story('Read Only Template Panel')}&viewMode=story`);
  await page.getByRole('button', { name: '랜딩 페이지 미리보기' }).click();
  await expect(page.getByRole('button', { name: '화면에 추가' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '내 템플릿', exact: true }).click();
  await expect(page.getByRole('button', { name: '현재 화면 저장' })).toBeDisabled();
});
test('page creation and deleted page dialogs expose templates, version preview and keyboard focus', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = (name: string) =>
    entries.find((item) => item.title === '프로젝트/페이지 라이브러리' && item.name === name)!.id;
  await page.goto(`/iframe.html?id=${story('Create Dialog')}&viewMode=story`);
  const trigger = page.getByRole('button', { name: '새 페이지', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('새 페이지', { exact: true })).toBeFocused();
  await dialog.getByRole('radio', { name: /로그인 화면/ }).check();
  expect(
    (await new AxeBuilder({ page }).include('.page-library-dialog').analyze()).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  const spec = createTemplate('dashboard');
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const body = url.includes('deleted-pages')
      ? [{ id: 'deleted', name: '이전 대시보드', revision: 2, deleted_at: '2026-09-16T00:00:00Z' }]
      : url.endsWith('/revisions')
        ? [{ revision: 2, name: '이전 대시보드', created_at: '2026-09-15T00:00:00Z' }]
        : { name: '이전 대시보드', spec };
    await route.fulfill({ json: body });
  });
  await page.goto(`/iframe.html?id=${story('Deleted Pages')}&viewMode=story`);
  await page.getByRole('button', { name: '삭제된 페이지', exact: true }).click();
  await expect(page.getByLabel('복원할 버전')).toHaveValue('2');
  await expect(page.getByRole('button', { name: '선택한 버전으로 복원' })).toBeEnabled();
  expect(
    (await new AxeBuilder({ page }).include('.page-library-dialog').analyze()).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: '선택한 버전으로 복원' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('theme presets update actual renderer defaults and disabled settings prevent edits', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = (name: string) =>
    entries.find((item) => item.title === '프로젝트/페이지 라이브러리' && item.name === name)!.id;
  await page.goto(`/iframe.html?id=${story('Page Theme')}&viewMode=story`);
  await page.getByLabel('테마 프리셋').selectOption('ocean');
  await expect(page.getByRole('button', { name: '지금 시작하기' })).toHaveCSS(
    'background-color',
    'rgb(36, 88, 166)',
  );
  expect(
    (await new AxeBuilder({ page }).include('.page-theme-editor').analyze()).violations,
  ).toEqual([]);
  await page.goto(`/iframe.html?id=${story('Read Only Theme')}&viewMode=story`);
  await expect(page.getByLabel('테마 프리셋')).toBeDisabled();
});
