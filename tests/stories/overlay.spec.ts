import { test, expect } from '@playwright/test';
test('overlays center in the visible scope, support actions and restore focus', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const story = (Object.values(index.entries) as { id: string; title: string }[]).find(
    (s) => s.title === '빌더/모달과 다이얼로그',
  )!;
  await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
  await page.getByRole('button', { name: '전체 창 열기' }).click();
  const modal = page.getByRole('dialog', { name: '전체 화면 창' });
  await expect(modal).toBeVisible();
  const viewport = await page.locator('.overlay-story-viewport').boundingBox();
  let bounds = await modal.boundingBox();
  expect(
    Math.abs(bounds!.y + bounds!.height / 2 - (viewport!.y + viewport!.height / 2)),
  ).toBeLessThan(2);
  await page.locator('.overlay-story-viewport').evaluate((el) => {
    el.scrollTop = 700;
  });
  await expect
    .poll(async () => {
      bounds = await modal.boundingBox();
      return Math.abs(bounds!.y + bounds!.height / 2 - (viewport!.y + viewport!.height / 2));
    })
    .toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 창 열기' })).toBeFocused();
  await page.locator('.overlay-story-viewport').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.getByRole('button', { name: '영역 창 열기' }).click();
  const local = page.getByRole('dialog', { name: '영역 안의 창' });
  await expect(local).toBeVisible();
  await page.locator('.overlay-story-viewport').evaluate((el) => {
    el.scrollTop = 700;
  });
  await expect
    .poll(async () => {
      const scope = await page.locator('[data-node-id="local-container"]').boundingBox();
      const b = await local.boundingBox();
      const top = Math.max(viewport!.y, scope!.y),
        bottom = Math.min(viewport!.y + viewport!.height, scope!.y + scope!.height);
      return Math.abs(b!.y + b!.height / 2 - (top + bottom) / 2);
    })
    .toBeLessThan(2);
  await local.getByRole('button', { name: '작성 완료' }).click();
  await expect(local).toHaveCount(0);
  await page.getByLabel('짧은 페이지').check();
  await page.getByRole('button', { name: '전체 창 열기' }).click();
  await expect
    .poll(async () => {
      const b = await modal.boundingBox();
      return Math.abs(b!.y + b!.height / 2 - (viewport!.y + viewport!.height / 2));
    })
    .toBeLessThan(2);
});
test('dialog and non-modal allow background input and dragging, reopen centered; modal blocks both', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const story = (Object.values(index.entries) as { id: string; title: string }[]).find(
    (s) => s.title === '빌더/모달과 다이얼로그',
  )!;
  await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
  for (const kind of ['dialog', 'nonModal']) {
    await page.getByLabel('영역 창 종류').selectOption(kind);
    await page.getByRole('button', { name: '영역 창 열기' }).click();
    const dialog = page.getByRole('dialog', { name: '영역 안의 창' }),
      header = dialog.locator('.modal-header-bar');
    const before = await dialog.boundingBox(),
      box = await header.boundingBox();
    await page.mouse.move(box!.x + 50, box!.y + 15);
    await page.mouse.down();
    await page.mouse.move(box!.x + 105, box!.y + 55);
    await page.mouse.up();
    const after = await dialog.boundingBox();
    expect(after!.x - before!.x).toBeGreaterThan(30);
    await page.getByLabel('배경 입력', { exact: true }).fill(kind);
    await expect(page.getByLabel('배경 입력', { exact: true })).toHaveValue(kind);
    await dialog.getByRole('button', { name: '작성 완료' }).click();
    await page.getByRole('button', { name: '영역 창 열기' }).click();
    await expect
      .poll(async () => Math.abs((await dialog.boundingBox())!.x - before!.x))
      .toBeLessThan(2);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: '전체 창 열기' }).click();
  const modal = page.getByRole('dialog', { name: '전체 화면 창' }),
    before = await modal.boundingBox(),
    header = await modal.locator('.modal-header-bar').boundingBox();
  await page.mouse.move(header!.x + 50, header!.y + 15);
  await page.mouse.down();
  await page.mouse.move(header!.x + 100, header!.y + 55);
  await page.mouse.up();
  expect((await modal.boundingBox())!.x).toBe(before!.x);
  const field = page.getByLabel('배경 입력', { exact: true }),
    fieldBox = await field.boundingBox();
  await page.mouse.click(fieldBox!.x + 10, fieldBox!.y + 10);
  await expect(field).not.toBeFocused();
  await field.evaluate((el) => (el as HTMLElement).focus());
  await expect(field).not.toBeFocused();
});
test('overlay form rows align on opening and long content scrolls inside the visible window', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const story = (Object.values(index.entries) as { id: string; title: string }[]).find(
    (s) => s.title === '빌더/모달과 다이얼로그',
  )!;
  await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
  await page.getByRole('button', { name: '영역 창 열기' }).click();
  const dialog = page.getByRole('dialog', { name: '영역 안의 창' });
  await expect
    .poll(async () => {
      const input = await dialog.getByLabel('이름', { exact: true }).boundingBox(),
        button = await dialog.getByRole('button', { name: '작성 완료' }).boundingBox();
      return Math.abs(input!.y + input!.height / 2 - button!.y - button!.height / 2);
    })
    .toBeLessThan(2);
  await page.keyboard.press('Escape');
  await page.getByLabel('긴 내용').check();
  await page.getByRole('button', { name: '영역 창 열기' }).click();
  const box = await dialog.boundingBox(),
    viewport = await page.locator('.overlay-story-viewport').boundingBox();
  expect(box!.height).toBeLessThan(viewport!.height);
  const content = dialog.locator('.scoped-overlay-content');
  await expect(content).toHaveCSS('padding-left', '24px');
  await page.mouse.move(5, 5);
  await expect(dialog.getByRole('button', { name: '닫기' })).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  expect(await content.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await dialog.getByRole('button', { name: '작성 완료' }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('button', { name: '닫기' })).toBeInViewport();
  await page.screenshot({ path: 'test-results/overlay-long-content.png' });
  await dialog.getByRole('button', { name: '작성 완료' }).click();
  await expect(dialog).toHaveCount(0);
});
