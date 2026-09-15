import { test, expect } from '@playwright/test';
import { createSpec, createNode } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';

test('table dimensions and responsive overrides survive edits, save and reload', async ({
  page,
}) => {
  const spec = createSpec(),
    column = createNode('container'),
    table = createNode('table');
  column.responsive.mobile = { gap: 31 };
  column.children.push(table);
  spec.root.children.push(column);
  await openSpec(page, spec, '행과 열 설정');
  await page.getByRole('button', { name: '화면에 맞춤' }).click();
  await page.getByTestId('node-table').click();
  await page.getByLabel('데이터 행 수 (헤더 제외)').fill('10');
  await page.getByLabel('열 수', { exact: true }).fill('5');
  await expect(page.locator('.artboard tbody tr')).toHaveCount(10);
  await expect(page.locator('.artboard thead th')).toHaveCount(5);
  await page.getByLabel('페이징 방식').selectOption('pagination');
  await page.getByLabel('페이지당 항목 수').fill('2');
  await expect(page.locator('.artboard tbody tr')).toHaveCount(2);
  await page.locator('[data-node-id="' + column.id + '"]').click({ position: { x: 4, y: 4 } });
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  const container = page.locator('[data-node-id="' + column.id + '"]');
  await expect(container).toHaveCSS('flex-direction', 'column');
  await expect(container).toHaveCSS('gap', '31px');
  await page.getByLabel('모바일에서 숨기기', { exact: true }).check();
  await page.getByLabel('모바일에서 숨기기', { exact: true }).uncheck();
  await expect(container).toHaveCSS('gap', '31px');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.locator('.save-status')).toContainText('저장됨');
  await page.reload();
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await expect(container).toHaveCSS('gap', '31px');
  await expect(container).toHaveCSS('flex-direction', 'column');
  await expect(page.locator('.artboard tbody tr')).toHaveCount(2);
});

test('time properties appear only for applicable inputs and calendar controls keep state across device changes', async ({
  page,
}) => {
  const spec = createSpec(),
    input = createNode('input');
  spec.root.children.push(input);
  await openSpec(page, spec, '시간 설정');
  await page.getByRole('button', { name: '화면에 맞춤' }).click();
  await page.getByTestId('node-input').click();
  await expect(page.getByRole('combobox', { name: '시간 사용', exact: true })).toHaveCount(0);
  for (const kind of ['date', 'datetime-local']) {
    await page.getByLabel('입력 종류').selectOption(kind);
    await expect(page.getByRole('combobox', { name: '시간 사용', exact: true })).toBeVisible();
  }
  await expect(
    page.getByRole('combobox', { name: '시간 사용', exact: true }).locator('option'),
  ).toHaveCount(2);
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  const trigger = page.getByTestId('node-input').getByRole('button');
  await trigger.click();
  await page.getByRole('dialog').getByLabel('시간 분', { exact: true }).selectOption('59');
  await page.getByRole('dialog').getByRole('button', { name: '적용', exact: true }).click();
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await expect(trigger).toContainText('00:59');
  await expect(trigger).not.toContainText('.999');
  await expect(page.getByTestId('node-input').locator('input[type="hidden"]')).toHaveValue(
    /T00:59:59.999$/,
  );
});
