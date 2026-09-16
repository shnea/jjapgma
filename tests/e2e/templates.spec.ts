import { test, expect } from '@playwright/test';
import { createTemplate, createNode, createSpec } from '../../packages/ui-spec/src/index';
import { openSpec } from './helpers';
test('chart data persists through inspector save and wizard stages survive reload', async ({
  page,
}) => {
  const spec = createTemplate('onboarding');
  const chart = createNode('chart');
  spec.root.children.unshift(chart);
  await openSpec(page, spec, '새 공식 컴포넌트');
  await page.locator(`[data-node-id="${chart.id}"]`).click();
  await page.getByLabel('차트 값 1', { exact: true }).fill('255000');
  await page.getByRole('button', { name: '차트 종류: 영역', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.locator('.chart-values dd').first()).toHaveText('255,000 건');
  await expect(page.locator('.chart-plot polyline')).toHaveCount(1);
  await expect(page.locator('.chart-area')).toHaveCount(1);
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  await page.getByLabel('워크스페이스 이름', { exact: true }).fill('저장 확인');
  await page.locator('.element-wizard').getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('radio', { name: '프로젝트 관리' })).toBeVisible();
  await page.locator('.element-wizard').getByRole('button', { name: '이전', exact: true }).click();
  await expect(page.getByLabel('워크스페이스 이름', { exact: true })).toHaveValue('저장 확인');
});

test('grid controls persist real cells, support undo and protect occupied cells', async ({
  page,
}) => {
  const { initial } = await openSpec(page, createSpec(), '그리드 편집');
  await page.locator('.palette').getByRole('button', { name: '그리드', exact: true }).click();
  const grid = page.locator('.artboard .render-grid');
  const cells = grid.locator(':scope > .render-container');
  await expect(cells).toHaveCount(4);
  await page.getByRole('button', { name: '그리드 열 늘리기' }).click();
  await expect(cells).toHaveCount(6);
  await page.getByRole('button', { name: '실행 취소', exact: true }).click();
  await expect(cells).toHaveCount(4);
  await page.getByRole('button', { name: '다시 실행', exact: true }).click();
  await expect(cells).toHaveCount(6);
  await cells.last().click();
  await page.locator('.palette').getByRole('button', { name: '입력창', exact: true }).click();
  await page.getByRole('button', { name: '레이어', exact: true }).click();
  await page.locator('.layer-row').filter({ hasText: '그리드' }).first().click();
  await page.getByRole('button', { name: '그리드 열 줄이기' }).click();
  await expect(page.getByRole('alert')).toContainText(
    '줄일 영역에 요소가 있거나 잠겨 있습니다. 내용을 옮기거나 비운 뒤 줄여 주세요.',
  );
  await expect(cells).toHaveCount(6);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.reload();
  await expect(cells).toHaveCount(6);
  const stored = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  expect(stored.spec.root.children[0].style.gridColumns).toBe(3);
  expect(stored.spec.root.children[0].children[5].children[0].type).toBe('input');
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  await expect(page.locator('.grid-edit-controls')).toHaveCount(0);
});

test('inserting a main template clears page edge padding in one undoable change', async ({
  page,
}) => {
  const spec = createSpec();
  spec.root.style.paddingLeft = 55;
  spec.root.responsive.mobile = { paddingRight: 45 };
  const { initial } = await openSpec(page, spec, '메인 가장자리');
  await page.getByRole('button', { name: '템플릿', exact: true }).click();
  await page.getByRole('button', { name: '워크스페이스 메인 미리보기' }).click();
  await page.getByRole('button', { name: '화면에 추가', exact: true }).click();
  const root = page.locator(`.artboard [data-node-id="${spec.root.id}"]`);
  await expect(root).toHaveCSS('padding-left', '0px');
  await page.getByRole('button', { name: '실행 취소', exact: true }).click();
  await expect(root).toHaveCSS('padding-left', '55px');
  await page.getByRole('button', { name: '다시 실행', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  const stored = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  expect(stored.spec.root.responsive.mobile.paddingRight).toBe(0);
});
