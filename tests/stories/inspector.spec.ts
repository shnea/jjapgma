import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function open(page: Page, name: string) {
  const index = await (await page.request.get('/index.json')).json();
  const entry = (
    Object.values(index.entries) as { id: string; title: string; name: string }[]
  ).find((e) => e.title === '빌더/속성 편집' && e.name === name)!;
  await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
}
test('additional CSS renders, edits and inherits across breakpoints', async ({ page }) => {
  await open(page, 'Custom Css');
  const node = page.locator('.inspector-story-canvas .render-button');
  await expect(node).toHaveCSS('border-bottom-width', '3px');
  await expect(node).toHaveCSS('border-bottom-color', 'rgb(220, 40, 40)');
  await page.getByText('고급 스타일', { exact: true }).click();
  await page.getByLabel('CSS letter-spacing', { exact: true }).fill('4px');
  await expect(node).toHaveCSS('letter-spacing', '4px');
  await page.getByLabel('화면 크기').selectOption('mobile');
  await expect(node).toHaveCSS('border-bottom-width', '3px');
  await expect(node).toHaveCSS('border-bottom-color', 'rgb(40, 80, 220)');
  await expect(node).toHaveCSS('letter-spacing', '4px');
  await page.getByLabel('화면 크기').selectOption('desktop');
  await expect(node).toHaveCSS('border-bottom-color', 'rgb(220, 40, 40)');
});

test('visual controls edit actual icons, sizes and spacing; containers have no grid settings', async ({
  page,
}) => {
  await open(page, 'Button Properties');
  await page.getByRole('button', { name: '수정 아이콘', exact: true }).click();
  await expect(page.locator('.inspector-story-canvas .lucide-pencil')).toBeVisible();
  const search = page.getByRole('searchbox', { name: '아이콘 검색' });
  for (const [query, label, icon] of [
    ['공유', '공유', 'share-2'],
    ['내보내기', '내보내기', 'download'],
    ['user-plus', '사용자 초대', 'user-plus'],
    ['잠금 해제', '잠금 해제', 'lock-open'],
  ]) {
    await search.fill(query);
    await page.getByRole('button', { name: `${label} 아이콘`, exact: true }).click();
    await expect(page.locator(`.inspector-story-canvas .lucide-${icon}`)).toBeVisible();
  }
  await search.fill('');
  await page.getByRole('button', { name: '아이콘 위치: 글자 뒤' }).click();
  await expect(page.locator('.inspector-story-canvas .element-button')).toHaveCSS(
    'flex-direction',
    'row-reverse',
  );
  await page.getByLabel('글자 크기 (px)', { exact: true }).fill('22');
  await expect(page.locator('.inspector-story-canvas .element-button')).toHaveCSS(
    'font-size',
    '22px',
  );
  await page.getByText('테두리·그림자·투명도', { exact: true }).click();
  await page.getByLabel('테두리 (px)', { exact: true }).fill('3');
  await expect(page.locator('.inspector-story-canvas .element-button')).toHaveCSS(
    'border-left-width',
    '3px',
  );
  await expect(page.locator('.inspector-story-canvas .element-button')).toHaveCSS(
    'border-left-style',
    'solid',
  );
  await page.getByRole('button', { name: '글자 굵기: 굵게' }).click();
  await expect(page.locator('.inspector-story-canvas .element-button')).toHaveCSS(
    'font-weight',
    '600',
  );
  await page.getByRole('button', { name: '이 요소의 가로 위치: 오른쪽' }).click();
  await expect(page.locator('.inspector-story-canvas .render-button')).toHaveCSS(
    'align-self',
    'flex-end',
  );
  expect((await new AxeBuilder({ page }).include('.inspector').analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/inspector-button.png', fullPage: true });
  await open(page, 'Container Properties');
  await expect(page.getByLabel('그리드 열 수')).toHaveCount(0);
  await page.getByLabel('화면 크기').selectOption('mobile');
  const input = (await page.locator('.inspector-story-canvas input[type=search]').boundingBox())!;
  const button = (await page.locator('.inspector-story-canvas .element-button').boundingBox())!;
  expect(Math.abs(input.x - button.x)).toBeLessThan(1);
  expect(button.y).toBeGreaterThan(input.y + input.height);
  await open(page, 'Grid Properties');
  await page.getByLabel('그리드 열 수').fill('3');
  await expect(page.getByLabel('배치 방향', { exact: true })).toHaveCount(0);
  await expect(page.locator('.inspector-story-canvas .render-grid')).toHaveCSS(
    'grid-template-columns',
    /px .*px .*px/,
  );
});
test('table preview supports paging, independent cell checkboxes, search and mobile columns', async ({
  page,
}) => {
  await open(page, 'Table Properties');
  const canvas = page.locator('.inspector-story-canvas');
  await expect(canvas.locator('thead th')).toHaveCount(6);
  await canvas.getByLabel('현재 페이지 전체 선택').check();
  await expect(canvas.getByRole('status')).toContainText('2개 선택');
  await canvas.getByLabel('확인 2행 값').check();
  await canvas.getByRole('button', { name: '다음 페이지' }).click();
  await expect(canvas.locator('tbody tr').first()).toContainText('3');
  await expect(canvas.getByRole('status')).toContainText('2개 선택');
  await canvas.getByLabel('표 검색').fill('다온');
  await expect(canvas.locator('tbody tr')).toHaveCount(1);
  await canvas.getByLabel('표 검색').fill('');
  await page.getByLabel('화면 크기').selectOption('mobile');
  await expect(canvas.locator('thead th')).toHaveCount(5);
  await expect(canvas).not.toContainText('garam@example.com');
  await page.getByRole('button', { name: '표 설정: 표시·동작' }).click();
  await page.getByRole('button', { name: '모바일 표: 행을 카드로' }).click();
  await expect(canvas.locator('.table-cards article')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/inspector-table-mobile.png', fullPage: true });
  await open(page, 'Read Only Table');
  await expect(page.getByRole('button', { name: '셀 데이터 편집' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '열 추가', exact: true })).toBeDisabled();
});
test('input helper text, errors and clear control stay labelled and usable', async ({ page }) => {
  await open(page, 'Input Properties');
  const canvas = page.locator('.inspector-story-canvas');
  const input = canvas.locator('input');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.fill('1234');
  await canvas.getByRole('button', { name: /지우기/ }).click();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).include('.inspector-story-canvas').analyze()).violations,
  ).toEqual([]);
});
