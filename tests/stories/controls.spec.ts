import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  const index = await (await page.request.get('/index.json')).json();
  const entry = (Object.values(index.entries) as { id: string; title: string }[]).find(
    (e) => e.title === '빌더/컨트롤 회귀',
  )!;
  await page.clock.setFixedTime(new Date('2028-02-15T12:00:00'));
  await page.goto('/iframe.html?id=' + entry.id + '&viewMode=story');
});

test('calendar uses element time setting, hour/minute selection, hidden precision, today and cancel', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: '기간', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('combobox')).toHaveCount(0);
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  await expect(dialog.getByText('2028년 2월', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '2028-02-29', exact: true })).toBeVisible();
  const day = (await dialog
    .getByRole('button', { name: '2028-02-29', exact: true })
    .boundingBox())!;
  expect(day.width).toBeLessThan(45);
  expect(day.height).toBeLessThan(40);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: '시간 사용', exact: true }).selectOption('true');
  await trigger.click();
  await expect(dialog.getByRole('combobox')).toHaveCount(4);
  await expect(dialog.getByLabel('시작 시간 초', { exact: true })).toHaveCount(0);
  await expect(dialog.locator('.picker-summary')).toHaveCount(0);
  await dialog.getByRole('button', { name: '2028-02-29', exact: true }).click();
  await dialog.getByRole('button', { name: '다음 달' }).click();
  await dialog.getByRole('button', { name: '2028-03-02', exact: true }).click();
  await dialog.getByLabel('시작 시간 분', { exact: true }).selectOption('59');
  await dialog.getByLabel('종료 시간 분', { exact: true }).selectOption('30');
  await dialog.getByRole('button', { name: '적용', exact: true }).click();
  await expect(trigger).toHaveText('2028-02-29 00:59 ~ 2028-03-02 23:30');
  const value = page.locator('[data-node-id="date-example"] input[type="hidden"]');
  await expect(value.first()).toHaveValue('2028-02-29T00:59:59.999');
  await expect(value.last()).toHaveValue('2028-03-02T23:30:00.000');
  await trigger.click();
  await dialog.getByLabel('시작 시간 분', { exact: true }).selectOption('00');
  await dialog.getByRole('button', { name: '취소', exact: true }).click();
  await expect(value.first()).toHaveValue('2028-02-29T00:59:59.999');
  await trigger.click();
  await expect(dialog.getByLabel('시작 시간 분', { exact: true })).toHaveValue('59');
  await dialog.getByRole('button', { name: '오늘', exact: true }).click();
  await expect(dialog.getByText('2028년 2월', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: '적용', exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveText('2028-02-15 00:59 ~ 2028-02-15 23:30');
  await page.getByRole('combobox', { name: '시간 사용', exact: true }).selectOption('false');
  await expect(trigger).toHaveText('2028-02-15 ~ 2028-02-15');
  await expect(value.first()).toHaveValue('2028-02-15T00:00:00.000');
  await expect(value.last()).toHaveValue('2028-02-15T23:59:59.999');
  await trigger.click();
  await expect(dialog.getByRole('combobox')).toHaveCount(0);
});

test('button defaults to content width, radio positions, skeleton geometry, stable arrows and narrow container pagination', async ({
  page,
}) => {
  const contentButton = page.getByTestId('node-button');
  const button = (await contentButton.locator('button').boundingBox())!;
  expect(button.width).toBeLessThan(480);
  expect(button.width).toBeGreaterThan(40);
  for (const position of ['top', 'left', 'right']) {
    const radio = page.locator('[data-node-id="radio-' + position + '"]');
    const label = (await radio.locator('.element-field-label').boundingBox())!;
    const control = (await radio.locator('.element-option-list').boundingBox())!;
    if (position === 'top') expect(label.y + label.height).toBeLessThanOrEqual(control.y);
    if (position === 'left') expect(label.x + label.width).toBeLessThanOrEqual(control.x);
    if (position === 'right') expect(control.x + control.width).toBeLessThanOrEqual(label.x);
    await radio.getByRole('radio').first().check();
    await expect(radio.getByRole('radio').first()).toBeChecked();
  }
  for (const shape of ['lines', 'circle', 'card']) {
    const skeleton = page.locator('[data-node-id="skeleton-' + shape + '"]');
    for (const line of await skeleton.locator('i').all()) {
      const box = (await line.boundingBox())!;
      expect(box.width).toBeGreaterThan(50);
      expect(box.height).toBeGreaterThanOrEqual(14);
      await expect(line).toHaveCSS('animation-name', 'skeleton-shimmer');
    }
  }
  const next = page.getByRole('button', { name: '다음 페이지' });
  const originalX = (await next.boundingBox())!.x;
  await page.getByLabel('페이지 수', { exact: true }).selectOption('100');
  await page.getByRole('button', { name: '끝으로' }).click();
  expect((await next.boundingBox())!.x).toBe(originalX);
  await expect(next).toBeDisabled();
  await page.getByLabel('미리보기 너비').selectOption('240');
  const nav = page.getByRole('navigation', { name: '페이지 탐색' });
  const box = (await nav.boundingBox())!;
  for (const button of await nav.getByRole('button').all()) {
    const b = (await button.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(box.x);
    expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 1);
  }
  await expect(nav.locator('.pagination-summary')).toBeVisible();
  await page.screenshot({ path: 'test-results/controls-narrow.png', fullPage: true });
});
