import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTemplate, createNode } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';

test('main layout inspector persists settings and exported HTML keeps menu search, drawers and carousel offline', async ({
  page,
  browser,
}, info) => {
  const spec = createTemplate('main');
  const panel = spec.root.children[1].children[0];
  const carousel = createNode('carousel');
  carousel.props.carouselAutoplay = true;
  carousel.props.carouselInterval = 2000;
  carousel.children = ['첫 번째 소식', '두 번째 소식'].map((text) => {
    const card = createNode('card');
    const heading = createNode('heading');
    heading.props.text = text;
    card.children = [heading];
    return card;
  });
  spec.root.children[1].children[1].children.push(carousel);
  const { initial } = await openSpec(page, spec, '메인 화면 검증');
  await page.locator(`[data-node-id="${panel.id}"]`).click({ position: { x: 8, y: 8 } });
  const save = page.waitForResponse(
    (r) => r.url().endsWith(`/api/pages/${initial.id}`) && r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: '패널 위치: 오른쪽', exact: true }).click();
  await page.getByRole('button', { name: '레이어', exact: true }).click();
  await page
    .locator('.layer-row')
    .filter({ hasText: /캐러셀/ })
    .last()
    .click();
  await page
    .getByRole('button', { name: '캐러셀 조작 방식: 이미지 위 화살표', exact: true })
    .click();
  await page.getByRole('button', { name: '슬라이드 크기: 높이 고정', exact: true }).click();
  await page.getByLabel('슬라이드 높이', { exact: true }).fill('260');
  await page.getByRole('button', { name: '슬라이드 2 · 카드', exact: true }).click();
  await expect(page.locator('.carousel-slide:visible')).toHaveAttribute('aria-label', '2 / 2');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  expect((await save).ok()).toBe(true);
  await page.reload();
  await expect(page.locator('.side-panel')).toHaveAttribute('data-side', 'right');
  const stored = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  expect(stored.spec.root.children[1].children[0].props.panelSide).toBe('right');
  expect(stored.spec.root.children[1].children[1].children.at(-1).props.carouselVariant).toBe(
    'arrows',
  );
  expect(stored.spec.root.children[1].children[1].children.at(-1).props.carouselHeight).toBe(260);
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'HTML 내보내기', exact: true }).click();
  const download = await pending;
  const zip = await readFile((await download.path())!);
  const folder = info.outputPath('main-export');
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    const size = zip.readUInt32LE(offset + 18),
      length = zip.readUInt16LE(offset + 26),
      extra = zip.readUInt16LE(offset + 28);
    const name = zip.subarray(offset + 30, offset + 30 + length).toString('utf8');
    const target = resolve(folder, name);
    expect(target.startsWith(folder + '/')).toBe(true);
    const start = offset + 30 + length + extra;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, zip.subarray(start, start + size));
    offset = start + size;
  }
  const offline = await browser.newContext({
    offline: true,
    viewport: { width: 1200, height: 800 },
  });
  try {
    const exported = await offline.newPage();
    await exported.clock.install();
    const errors: string[] = [];
    exported.on('pageerror', (e) => errors.push(e.message));
    await exported.goto(pathToFileURL(resolve(folder, 'index.html')).href);
    await expect(exported.locator('[data-page-root]')).toHaveCSS('min-height', '800px');
    await expect(exported.getByRole('heading', { name: '첫 번째 소식' })).toBeVisible();
    await exported.clock.fastForward(2100);
    await expect(exported.getByRole('heading', { name: '두 번째 소식' })).toBeVisible();
    await exported.getByRole('button', { name: '자동 재생 멈춤' }).click();
    await exported.clock.fastForward(4100);
    await expect(exported.getByRole('heading', { name: '두 번째 소식' })).toBeVisible();
    await exported.getByRole('button', { name: '1번 슬라이드', exact: true }).click();
    await exported.getByRole('searchbox', { name: '메뉴 검색' }).fill('프로젝트');
    await expect(exported.getByRole('button', { name: '홈', exact: true })).toHaveCount(0);
    await expect(exported.getByRole('button', { name: '프로젝트', exact: true })).toBeVisible();
    await exported.getByRole('button', { name: '검색어 지우기' }).click();
    await exported.getByRole('button', { name: '사이드 패널 접기' }).click();
    await expect(exported.locator('.side-panel')).toHaveCSS('width', '64px');
    await exported.getByRole('button', { name: '다음 슬라이드' }).click();
    await expect(exported.getByRole('heading', { name: '두 번째 소식' })).toBeVisible();
    await exported.setViewportSize({ width: 390, height: 800 });
    await expect(exported.locator('[data-page-root]')).toHaveCSS('min-height', '800px');
    await exported.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    await expect(exported.getByRole('dialog', { name: '메뉴 사이드바' })).toBeVisible();
    await expect(exported.locator('.scoped-drawer')).toHaveClass(/drawer-right/);
    await exported.keyboard.press('Escape');
    await expect(exported.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await offline.close();
  }
});

test('theme-connected colors and independent scrolling save and follow a changed page theme', async ({
  page,
}) => {
  const spec = createTemplate('main');
  const header = spec.root.children[0];
  const { initial } = await openSpec(page, spec, '색상과 스크롤 저장');
  await page.locator(`[data-node-id="${header.id}"]`).click({ position: { x: 2, y: 2 } });
  await page.getByLabel('배경색 연결', { exact: true }).selectOption('theme:surface');
  await page.getByRole('button', { name: '가로 스크롤: 숨김', exact: true }).click();
  await page.getByRole('button', { name: '세로 스크롤: 자동', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('저장됨', { exact: true })).toBeVisible();
  await page.reload();
  const saved = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  expect(saved.spec.root.children[0].style).toMatchObject({
    background: 'theme:surface',
    overflowX: 'hidden',
    overflowY: 'auto',
  });
  await page.getByLabel('테마 프리셋').selectOption('violet');
  await expect(page.locator(`[data-node-id="${header.id}"]`)).toHaveCSS(
    'background-color',
    'rgb(247, 242, 252)',
  );
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('저장됨', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(`[data-node-id="${header.id}"]`)).toHaveCSS(
    'background-color',
    'rgb(247, 242, 252)',
  );
});
