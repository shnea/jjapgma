import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function open(page: Page) {
  const index = await (await page.request.get('/index.json')).json();
  const story = (Object.values(index.entries) as { id: string; title: string }[]).find(
    (s) => s.title === '빌더/폼 행 정렬',
  )!;
  await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
}
async function geometry(page: Page) {
  return page.locator('.form-row-story').evaluate((canvas) =>
    ['form-input', 'form-date', 'form-range', 'form-action'].map((id) => {
      const node = canvas.querySelector(`[data-node-id="${id}"]`)!;
      const control = node.querySelector('[data-field-control],.element-button')!;
      const box = control.getBoundingClientRect();
      return { x: box.x, y: box.y, height: box.height, center: box.y + box.height / 2 };
    }),
  );
}
async function centered(page: Page) {
  await expect
    .poll(async () => {
      const boxes = await geometry(page);
      return Math.max(...boxes.map((b) => b.center)) - Math.min(...boxes.map((b) => b.center));
    })
    .toBeLessThan(1);
}
test('input, calendar and range share a 44px control and align actions independently of labels, help and parent alignment', async ({
  page,
}) => {
  await open(page);
  await centered(page);
  const boxes = await geometry(page);
  expect(boxes.slice(0, 3).map((b) => b.height)).toEqual([44, 44, 44]);
  expect(boxes[3].height).toBe(38);
  for (const align of ['flex-start', 'center', 'flex-end', 'stretch']) {
    await page.getByLabel('기존 세로 정렬').selectOption(align);
    await centered(page);
  }
  for (const position of ['left', 'right', 'top']) {
    await page.getByLabel('라벨 위치').selectOption(position);
    await centered(page);
  }
  await page.getByLabel('설명 문구').check();
  await centered(page);
  await page.getByLabel('큰 글자').check();
  await centered(page);
  const large = await geometry(page);
  expect(large[0].height).toBeGreaterThan(44);
  expect(large[1].height).toBe(large[0].height);
  expect(large[2].height).toBe(large[0].height);
  await page.getByLabel('라벨 숨김').check();
  await centered(page);
  await page.getByLabel('큰 글자').uncheck();
  await page.getByLabel('라벨 숨김').uncheck();
  await page.getByLabel('설명 문구').uncheck();
  expect((await new AxeBuilder({ page }).include('.form-row-story').analyze()).violations).toEqual(
    [],
  );
  await page.screenshot({ path: 'test-results/form-row-alignment.png', fullPage: true });
});
test('automatic offsets handle wrap and zoom, clear on mobile/manual mode and preserve authored margins', async ({
  page,
}) => {
  await open(page);
  await page.getByLabel('축소 캔버스').check();
  await centered(page);
  await page.getByLabel('미리보기', { exact: true }).uncheck();
  await centered(page);
  await page.getByLabel('축소 캔버스').uncheck();
  await page.getByLabel('줄바꿈', { exact: true }).check();
  await expect
    .poll(async () => {
      const boxes = await geometry(page);
      return Math.abs(boxes[2].center - boxes[3].center);
    })
    .toBeLessThan(1);
  const wrapped = await geometry(page);
  expect(wrapped[2].y).toBeGreaterThan(wrapped[0].y + wrapped[0].height);
  await page.getByLabel('모바일', { exact: true }).check();
  await expect(page.locator('[data-node-id=form-action]')).toHaveCSS('margin-top', '0px');
  const mobile = await geometry(page);
  expect(mobile[3].y).toBeGreaterThan(mobile[2].y + mobile[2].height);
  expect(Math.abs(mobile[3].x - mobile[2].x)).toBeLessThan(1);
  await page.getByLabel('모바일', { exact: true }).uncheck();
  await page.getByLabel('줄바꿈', { exact: true }).uncheck();
  await centered(page);
  await page.getByLabel('일반 배치', { exact: true }).check();
  await expect(page.locator('[data-node-id=form-action]')).toHaveCSS('margin-top', '0px');
  await page.getByLabel('일반 배치', { exact: true }).uncheck();
  await centered(page);
  await page.getByLabel('직접 여백', { exact: true }).check();
  await expect(page.locator('[data-node-id=form-action]')).toHaveCSS('margin-top', '35px');
  await page.getByLabel('직접 여백', { exact: true }).uncheck();
  await centered(page);
});
