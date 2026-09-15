import { test, expect } from '@playwright/test';
import { createSpec, createNode } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';

test('unselected input, selected label and palette drag into root padding at reduced zoom', async ({
  page,
}) => {
  const spec = createSpec(),
    input = createNode('input'),
    radio = createNode('radio');
  spec.root.children.push(input, radio);
  await openSpec(page, spec, '루트 드롭 회귀');
  await page.getByRole('button', { name: '화면에 맞춤' }).click();
  const root = page.locator('.artboard > [data-node-id]'),
    source = page.getByTestId('node-input');
  await expect(root).toHaveAttribute('draggable', 'false');
  const target = page.getByTestId('node-radio');
  const bounds = (await target.boundingBox())!;
  await source.dragTo(target, { targetPosition: { x: 10, y: bounds.height - 1 } });
  await expect(root.locator(':scope > [data-node-id]').last()).toHaveAttribute(
    'data-node-id',
    input.id,
  );
  await source.click();
  await source.locator('.node-label').dragTo(root, { targetPosition: { x: 3, y: 3 } });
  await expect(page.locator('.error-banner')).toHaveCount(0);
  const before = await root.locator(':scope > [data-node-id]').count();
  await page
    .getByRole('button', { name: '제목', exact: true })
    .dragTo(root, { targetPosition: { x: 3, y: 3 } });
  await expect(root.locator(':scope > [data-node-id]')).toHaveCount(before + 1);
});
test('canvas moves existing elements, persists order, respects locks and adjusts width', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '개발용 워크스페이스 열기' }).click();
  await expect(page.getByRole('heading', { name: /내 프로젝트/ })).toBeVisible();
  const identity = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': identity.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: '캔버스 이동' } })
  ).json();
  const initial = await (
    await page.request.post(`/api/projects/${project.id}/pages`, {
      headers,
      data: { name: '드래그 검증' },
    })
  ).json();
  const spec = createSpec(),
    heading = createNode('heading'),
    text = createNode('text'),
    card = createNode('card');
  spec.root.children.push(heading, text, card);
  expect(
    (
      await page.request.put(`/api/pages/${initial.id}`, {
        headers,
        data: { name: initial.name, spec, baseRevision: 1 },
      })
    ).ok(),
  ).toBe(true);
  await page.goto(`/projects/${project.id}`);
  await expect(page.getByLabel('캔버스 너비')).toHaveValue('1440');
  await expect(page.getByLabel('확대 비율')).toHaveValue('100');
  await page.getByLabel('캔버스 너비').fill('1920');
  await expect(page.locator('.artboard')).toHaveCSS('width', '1920px');
  await page.getByLabel('캔버스 너비').fill('1440');
  await page.getByRole('button', { name: '화면에 맞춤' }).click();
  const first = page.getByTestId('node-heading'),
    second = page.getByTestId('node-text'),
    box = page.getByTestId('node-card');
  await expect(first).toHaveAttribute('draggable', 'true');
  const bounds = (await second.boundingBox())!;
  await first.dragTo(second, { targetPosition: { x: 40, y: bounds.height - 2 } });
  await expect(page.locator('.artboard > [data-node-id] > [data-node-id]').first()).toHaveAttribute(
    'data-node-id',
    text.id,
  );
  await first.dragTo(box);
  await expect(box.getByTestId('node-heading')).toHaveCount(1);
  await page.getByRole('button', { name: '실행 취소', exact: true }).click();
  await expect(box.getByTestId('node-heading')).toHaveCount(0);
  await page.getByRole('button', { name: '다시 실행', exact: true }).click();
  await expect(box.getByTestId('node-heading')).toHaveCount(1);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.locator('.save-status')).toContainText('저장됨', { timeout: 15000 });
  await page.reload();
  await page.getByRole('button', { name: '화면에 맞춤' }).click();
  await expect(box.getByTestId('node-heading')).toHaveCount(1);
  await box.click({ position: { x: 8, y: 8 } });
  await page.getByLabel('잠금', { exact: true }).check();
  await expect(first).toHaveAttribute('draggable', 'false');
  await expect(box).toHaveAttribute('draggable', 'false');
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  await expect(second).toHaveAttribute('draggable', 'false');
  await page.screenshot({ path: 'test-results/canvas-expanded.png', fullPage: true });
});
