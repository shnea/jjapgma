import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function open(page: import('@playwright/test').Page, name = 'Workspace') {
  const index = await (await page.request.get('/index.json')).json();
  const story = (
    Object.values(index.entries) as { id: string; title: string; name: string }[]
  ).find((s) => s.title === '빌더/메인 레이아웃' && s.name === name)!;
  await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
}
test('main layout collapses both sides, hides completely, searches nested menus and keeps fixed panels open', async ({
  page,
}, info) => {
  await open(page);
  const panel = page.locator('.side-panel');
  await expect(panel).toHaveCSS('width', '240px');
  await page.getByRole('button', { name: '사이드 패널 접기' }).click();
  await expect(panel).toHaveCSS('width', '64px');
  await expect(page.getByRole('button', { name: '홈', exact: true })).toHaveAttribute(
    'title',
    '홈',
  );
  await page.getByRole('button', { name: '사이드 패널 펼치기' }).click();
  await page.getByRole('searchbox', { name: '메뉴 검색' }).fill('최근');
  await expect(page.getByRole('button', { name: '최근 프로젝트', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '홈', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '검색어 지우기' }).click();
  await page.getByLabel('완전히 접기').check();
  await page.getByRole('button', { name: '사이드 패널 접기' }).click();
  await expect(panel).toHaveCSS('width', '0px');
  await page.getByRole('button', { name: '사이드 패널 펼치기' }).click();
  await page.getByLabel('오른쪽 패널').check();
  expect((await panel.boundingBox())!.x).toBeGreaterThan(
    (await page.locator('[data-testid="node-searchBox"]').boundingBox())!.x,
  );
  await page.getByLabel('항상 펼침').check();
  await expect(page.getByRole('button', { name: '사이드 패널 접기' })).toHaveCount(0);
  await page.getByLabel('항상 펼침').uncheck();
  await page.getByLabel('오른쪽 패널').uncheck();
  expect((await page.locator('[data-page-root]').boundingBox())!.height).toBeGreaterThanOrEqual(
    648,
  );
  const main = page.locator('[data-page-root] > .render-container').last();
  const beforeHeight = (await main.boundingBox())!.height;
  await page.getByLabel('긴 메뉴', { exact: true }).check();
  expect((await main.boundingBox())!.height).toBeCloseTo(beforeHeight, 0);
  expect(
    await page.locator('.side-panel-inner').evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  await page.getByRole('button', { name: '추가 메뉴 39', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: '추가 메뉴 39', exact: true })).toBeVisible();
  await page.getByLabel('긴 메뉴', { exact: true }).uncheck();
  await page.screenshot({ path: info.outputPath('main-desktop.png'), fullPage: true });
  const a11y = await new AxeBuilder({ page }).include('.main-story-viewport').analyze();
  expect(a11y.violations).toEqual([]);
});

test('mobile drawer overlays the visible scope, blocks background and closes on menu selection and Escape', async ({
  page,
}, info) => {
  await open(page);
  await page.getByRole('button', { name: '모바일 보기' }).click();
  await expect(page.locator('.side-panel')).toHaveCount(0);
  const trigger = page.getByRole('button', { name: '메뉴 열기', exact: true });
  await page.screenshot({ path: info.outputPath('mobile-header.png'), fullPage: true });
  const header = page.locator('[data-page-root] > .render-container').first();
  await expect(header.getByRole('button', { name: '메뉴 열기', exact: true })).toBeVisible();
  await page.getByLabel('모바일 패널 숨김').check();
  await trigger.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('모바일 패널 숨김').uncheck();
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: '메뉴 사이드바' });
  await expect(drawer).toBeVisible();
  const viewport = await page.locator('.main-story-viewport').boundingBox();
  const bounds = await drawer.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(viewport!.x);
  expect(bounds!.width).toBeLessThan(viewport!.width);
  await expect(page.getByLabel('본문 입력')).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.locator(':focus')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('main-mobile.png'), fullPage: true });
  await drawer.getByRole('button', { name: '홈', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await page.getByLabel('오른쪽 패널').check();
  await trigger.click();
  await expect(page.locator('.scoped-drawer')).toHaveClass(/drawer-right/);
  await drawer.getByRole('button', { name: '서랍 닫기' }).click();
  await page.getByRole('button', { name: '검색창 열기' }).click();
  await expect(page.getByRole('searchbox', { name: '메뉴 검색' })).toBeFocused();
});

test('carousel preserves slide inputs and keeps one visible slide while editing', async ({
  page,
}) => {
  await open(page);
  await page.getByLabel('슬라이드 1 입력', { exact: true }).fill('유지할 값');
  await page.getByRole('button', { name: '다음 슬라이드' }).click();
  await expect(page.getByLabel('슬라이드 1 입력', { exact: true })).toBeHidden();
  await expect(page.getByLabel('슬라이드 2 입력', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1번 슬라이드', exact: true }).click();
  await expect(page.getByLabel('슬라이드 1 입력', { exact: true })).toHaveValue('유지할 값');
  await page.getByRole('button', { name: '이전 슬라이드' }).click();
  await expect(page.getByLabel('슬라이드 3 입력', { exact: true })).toBeVisible();
  await page.getByLabel('미리보기', { exact: true }).uncheck();
  await expect(page.locator('.carousel-slide:visible')).toHaveCount(1);
  const before = await page.locator('.carousel-viewport').boundingBox();
  await page.getByRole('button', { name: '1번 슬라이드', exact: true }).click();
  const after = await page.locator('.carousel-viewport').boundingBox();
  expect(after!.width).toBeCloseTo(before!.width, 0);
  expect(after!.height).toBeCloseTo(before!.height, 0);
  await page.getByLabel('미리보기', { exact: true }).check();
  await page.getByLabel('슬라이드 1 입력', { exact: true }).fill('입력 유지');
  await expect(page.locator('.carousel-slide:visible')).toHaveAttribute('aria-label', '1 / 3');
});

test('three-level menus open the active path, search descendants and show a rail flyout', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: '프로젝트', exact: true }).click();
  await page.getByRole('button', { name: '최근 프로젝트', exact: true }).click();
  await page.getByRole('button', { name: '디자인 프로젝트', exact: true }).click();
  await expect(page.getByRole('button', { name: '디자인 프로젝트', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('button', { name: '사이드 패널 접기' }).click();
  await page.getByRole('button', { name: '프로젝트', exact: true }).click();
  const flyout = page.locator('.menu-flyout');
  await expect(flyout).toBeVisible();
  await expect(flyout.getByRole('button', { name: '디자인 프로젝트', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(flyout).toHaveCount(0);
  await page.getByRole('button', { name: '사이드 패널 펼치기' }).click();
  await page.getByRole('searchbox', { name: '메뉴 검색' }).fill('디자인');
  await expect(page.getByRole('button', { name: '디자인 프로젝트', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '보관함', exact: true })).toHaveCount(0);
  await page.getByLabel('속성 편집').check();
  await page.getByLabel('편집 대상').selectOption('menu');
  await page
    .locator('summary')
    .filter({ hasText: /^프로젝트$/ })
    .click();
  await page
    .locator('summary')
    .filter({ hasText: /^최근 프로젝트$/ })
    .click();
  await page
    .locator('summary')
    .filter({ hasText: /^디자인 프로젝트$/ })
    .click();
  const leaf = page
    .locator('details.menu-item-editor')
    .filter({ has: page.locator('summary').filter({ hasText: /^디자인 프로젝트$/ }) })
    .last();
  await expect(leaf.getByRole('button', { name: '하위 메뉴 추가' })).toHaveCount(0);
  await leaf.getByLabel('상위 메뉴 변경').selectOption('__root');
  await expect(
    page
      .locator('.inspector > fieldset > fieldset > section > .menu-item-editor > summary')
      .filter({ hasText: '디자인 프로젝트' }),
  ).toHaveCount(1);
});

test('carousel variants keep one stable slide in edit/preview and the inspector manages images', async ({
  page,
}, info) => {
  await open(page, 'Carousel Images');
  const carousel = page.locator('.carousel');
  const viewport = page.locator('.carousel-viewport');
  const bounds = await viewport.boundingBox();
  await expect(page.locator('.carousel-slide:visible')).toHaveCount(1);
  await page.getByRole('button', { name: '슬라이드 2 · 이미지 2', exact: true }).click();
  await expect(page.locator('.carousel-slide:visible')).toHaveAttribute('aria-label', '2 / 3');
  expect((await viewport.boundingBox())!.height).toBeCloseTo(bounds!.height, 0);
  await page
    .getByRole('button', { name: '캐러셀 조작 방식: 이미지 위 화살표', exact: true })
    .click();
  await expect(viewport.getByRole('button', { name: '다음 슬라이드' })).toBeVisible();
  await page.getByLabel('미리보기', { exact: true }).check();
  expect((await viewport.boundingBox())!.height).toBeCloseTo(bounds!.height, 0);
  await carousel.getByRole('button', { name: '다음 슬라이드' }).click();
  await page.getByRole('button', { name: '캐러셀 조작 방식: 좌우 영역 클릭', exact: true }).click();
  await expect(carousel.getByRole('button', { name: '다음 슬라이드' })).toHaveCount(0);
  await viewport.click({ position: { x: 600, y: 80 } });
  await expect(page.locator('.carousel-slide:visible')).toHaveAttribute('aria-label', '1 / 3');
  await viewport.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.carousel-slide:visible')).toHaveAttribute('aria-label', '3 / 3');
  await page.getByRole('button', { name: '슬라이드 크기: 높이 고정', exact: true }).click();
  await page.getByLabel('슬라이드 높이', { exact: true }).fill('240');
  await expect(viewport).toHaveCSS('height', '240px');
  await page.getByRole('button', { name: '이미지 맞춤: 전체 이미지', exact: true }).click();
  await expect(page.locator('.carousel-slide:visible img')).toHaveCSS('object-fit', 'contain');
  await page.getByLabel('미리보기', { exact: true }).uncheck();
  await page.getByRole('button', { name: '이미지 슬라이드 추가', exact: true }).click();
  await expect(page.locator('.carousel-slide:visible')).toHaveAttribute('aria-label', '4 / 4');
  await page.getByLabel('슬라이드 4 이미지 URL').fill('/placeholder.svg');
  await page.getByLabel('슬라이드 4 이미지 URL').blur();
  await expect(page.locator('.carousel-slide:visible img')).toHaveAttribute(
    'src',
    '/placeholder.svg',
  );
  await page.getByRole('button', { name: '슬라이드 4 앞으로', exact: true }).click();
  await expect(page.locator('.carousel-slide:visible')).toHaveAttribute('aria-label', '3 / 4');
  await page.getByRole('button', { name: '슬라이드 3 삭제', exact: true }).click();
  await expect(page.locator('.carousel-slide:visible')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('carousel-editor.png'), fullPage: true });
});

test('standalone drawer opens from a normal component action and closes on backdrop', async ({
  page,
}) => {
  await open(page, 'Drawer');
  await page.getByRole('button', { name: '필터 열기' }).click();
  await expect(page.getByRole('dialog', { name: '필터 서랍' })).toBeVisible();
  const overlay = await page.locator('.scoped-drawer').boundingBox();
  await page.mouse.click(overlay!.x + overlay!.width - 8, overlay!.y + 40);
  await expect(page.getByRole('dialog', { name: '필터 서랍' })).toHaveCount(0);
});

test('a side panel composed inside a normal container remains visible without a template', async ({
  page,
}) => {
  await open(page, 'Panel Only');
  await expect(page.getByRole('button', { name: '독립 메뉴', exact: true })).toBeVisible();
  expect((await page.locator('.side-panel').boundingBox())!.height).toBeGreaterThan(40);
});

test('theme roles reach main items, rail flyouts and drawer chrome; scaled drawers stay in bounds', async ({
  page,
}, info) => {
  await open(page);
  await page.getByRole('button', { name: '어두운 테마' }).click();
  await expect(page.locator('[data-page-root] > .render-container').first()).toHaveCSS(
    'background-color',
    'rgb(31, 41, 55)',
  );
  const toggle = page.getByRole('button', { name: '사이드 패널 접기' });
  await expect(toggle).toHaveCSS('border-right-width', '1px');
  await expect(toggle).toHaveCSS('border-right-color', 'rgb(100, 116, 139)');
  await expect(toggle).toHaveCSS('border-left-width', '0px');
  await toggle.click();
  await page.getByRole('button', { name: '프로젝트', exact: true }).click();
  await expect(page.locator('.menu-flyout')).toHaveCSS('background-color', 'rgb(31, 41, 55)');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '모바일 보기' }).click();
  await page.getByLabel('긴 메뉴', { exact: true }).check();
  for (const zoom of ['0.5', '1', '1.5']) {
    await page.getByLabel('배율', { exact: true }).selectOption(zoom);
    await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: '메뉴 사이드바' });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveCSS('background-color', 'rgb(31, 41, 55)');
    const area = (await page.locator('.scoped-drawer').boundingBox())!;
    const bounds = (await drawer.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(area.y - 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(area.y + area.height + 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(area.x + area.width + 1);
    await drawer
      .getByRole('button', { name: '추가 메뉴 39', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(drawer.getByRole('button', { name: '추가 메뉴 39', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.screenshot({ path: info.outputPath('themed-mobile.png'), fullPage: true });
});

test('sidebar and body scroll independently with separate horizontal and vertical controls', async ({
  page,
}) => {
  await open(page, 'Independent Scroll');
  const body = page
    .locator('[data-page-root] > .render-container')
    .last()
    .locator(':scope > .render-container');
  await expect(body).toHaveCSS('overflow-x', 'auto');
  await expect(body).toHaveCSS('overflow-y', 'auto');
  await body.evaluate((el) => {
    el.scrollTop = 150;
    el.scrollLeft = 180;
  });
  expect(await body.evaluate((el) => el.scrollTop)).toBe(150);
  expect(await body.evaluate((el) => el.scrollLeft)).toBe(180);
  expect(await page.locator('.side-panel-inner').evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByRole('button', { name: '가로 스크롤: 숨김', exact: true }).click();
  await expect(body).toHaveCSS('overflow-x', 'hidden');
  await expect(body).toHaveCSS('overflow-y', 'auto');
  await page.getByRole('button', { name: '세로 스크롤: 항상', exact: true }).click();
  await expect(body).toHaveCSS('overflow-y', 'scroll');
});
