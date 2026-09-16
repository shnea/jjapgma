import { test, expect } from '@playwright/test';
import { createTemplate, createNode } from '../../packages/ui-spec/src/index';
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
  await page.getByRole('button', { name: '차트 종류: 꺾은선' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.locator('.chart-values dd').first()).toHaveText('255,000 건');
  await expect(page.locator('.chart-plot polyline')).toHaveCount(1);
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  await page.getByLabel('워크스페이스 이름', { exact: true }).fill('저장 확인');
  await page.locator('.element-wizard').getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('radio', { name: '프로젝트 관리' })).toBeVisible();
  await page.locator('.element-wizard').getByRole('button', { name: '이전', exact: true }).click();
  await expect(page.getByLabel('워크스페이스 이름', { exact: true })).toHaveValue('저장 확인');
});
