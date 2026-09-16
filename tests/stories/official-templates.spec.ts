import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pageTemplates } from '../../packages/ui-spec/src/index';
async function story(page: import('@playwright/test').Page, name: string) {
  const index = await (await page.request.get('/index.json')).json();
  const entry = (
    Object.values(index.entries) as { id: string; title: string; name: string }[]
  ).find((v) => v.title === '템플릿/공식 화면' && v.name === name)!;
  await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
}
test('all official templates render within desktop and mobile canvases', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await story(page, 'Gallery');
  for (const device of ['desktop', 'mobile']) {
    await page.setViewportSize({ width: device === 'mobile' ? 390 : 1280, height: 900 });
    await page.getByLabel('화면 크기').selectOption(device);
    for (const template of pageTemplates) {
      await page.getByLabel('화면 선택').selectOption(template.id);
      await expect(page.locator('.official-template-preview > .render-node')).toBeVisible();
      const dimensions = await page
        .locator('.official-template-preview')
        .evaluate((el) => ({ scroll: el.scrollWidth, width: el.clientWidth }));
      expect(dimensions.scroll, `${template.id} ${device}`).toBeLessThanOrEqual(
        dimensions.width + 1,
      );
      const overflowingCards = await page.locator('.official-template-preview').evaluate((root) =>
        Array.from(root.querySelectorAll('.render-card')).flatMap((card) => {
          const bounds = card.getBoundingClientRect();
          if (!bounds.height) return [];
          return Array.from(card.querySelectorAll(':scope > .render-node')).flatMap((child) => {
            const area = child.getBoundingClientRect();
            return area.height && area.bottom > bounds.bottom + 1
              ? [child.textContent?.slice(0, 60)]
              : [];
          });
        }),
      );
      expect(overflowingCards, `${template.id} ${device} card contents`).toEqual([]);
      if (
        [
          'pricing',
          'checkout',
          'dashboard',
          'analytics',
          'form',
          'main',
          'onboarding',
          'settings',
        ].includes(template.id)
      )
        await page.screenshot({
          path: info.outputPath(`${template.id}-${device}.png`),
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});
test('content detail image stays inside its frame above the article in editor and preview', async ({
  page,
}, info) => {
  await story(page, 'Gallery');
  await page.getByLabel('화면 선택').selectOption('content-detail');
  for (const device of ['desktop', 'mobile']) {
    await page.getByLabel('화면 크기').selectOption(device);
    for (const editing of [false, true]) {
      await page.getByLabel('편집 모드').setChecked(editing);
      const frame = page.locator('.official-template-preview .render-image');
      const picture = frame.locator('img');
      await expect(picture).toBeVisible();
      await expect
        .poll(() =>
          picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
        )
        .toBe(true);
      const frameBox = (await frame.boundingBox())!;
      const imageBox = (await picture.boundingBox())!;
      const textBox = (await page
        .getByText('아이디어를 화면으로 옮기는 방법', { exact: true })
        .boundingBox())!;
      expect(
        Math.abs(imageBox.height - frameBox.height),
        `${device} editing=${editing}`,
      ).toBeLessThanOrEqual(1);
      expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(textBox.y);
      await page.screenshot({
        path: info.outputPath(`content-detail-${device}-${editing ? 'editor' : 'preview'}.png`),
        fullPage: true,
      });
    }
  }
});

test('wizard preserves inputs between steps and table search filters actual rows', async ({
  page,
}) => {
  await story(page, 'Gallery');
  await page.getByLabel('화면 선택').selectOption('onboarding');
  await page.getByLabel('워크스페이스 이름', { exact: true }).fill('우리 팀');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('radio', { name: '디자인 협업' }).check();
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await expect(page.getByLabel('워크스페이스 이름', { exact: true })).toHaveValue('우리 팀');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('radio', { name: '디자인 협업' })).toBeChecked();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '완료', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('입력 단계를 모두 확인');
  await page.getByRole('button', { name: '입력 다시 확인' }).click();
  expect(
    (await new AxeBuilder({ page }).include('.official-template-preview').analyze()).violations,
  ).toEqual([]);
  await page.getByLabel('화면 선택').selectOption('management');
  await page.getByRole('searchbox', { name: '항목 검색' }).fill('모바일');
  await expect(page.locator('.configured-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.configured-table tbody')).toContainText('모바일 화면');
});
test('chart inspector changes variants and data, handles zero and empty datasets', async ({
  page,
}) => {
  await story(page, 'Charts');
  await page.getByLabel('차트 값 1', { exact: true }).fill('1200');
  await expect(page.locator('.chart-values dd').first()).toHaveText('1,200 건');
  await page.getByRole('button', { name: '차트 종류: 꺾은선' }).click();
  await expect(page.locator('.chart-plot polyline')).toHaveCount(1);
  await page.getByRole('button', { name: '차트 종류: 영역', exact: true }).click();
  await expect(page.locator('.chart-area')).toHaveCount(1);
  await page.getByRole('button', { name: '차트 종류: 가로 막대', exact: true }).click();
  await expect(page.locator('.chart-plot rect')).toHaveCount(6);
  await page.getByRole('button', { name: '차트 종류: 도넛' }).click();
  for (let i = 1; i <= 6; i++) await page.getByLabel(`차트 값 ${i}`, { exact: true }).fill('0');
  await expect(page.locator('.chart-total')).toHaveText('0');
  expect(await page.locator('.element-chart').innerHTML()).not.toMatch(/NaN|Infinity/);
  expect((await new AxeBuilder({ page }).include('.element-chart').analyze()).violations).toEqual(
    [],
  );
  for (let i = 0; i < 6; i++)
    await page.getByRole('button', { name: '차트 항목 1 삭제', exact: true }).click();
  await expect(page.getByText('표시할 데이터가 없습니다.')).toBeVisible();
});

test('main touches page edges and form uses two desktop columns and one mobile column', async ({
  page,
}) => {
  await story(page, 'Gallery');
  await page.getByLabel('화면 선택').selectOption('main');
  for (const device of ['desktop', 'tablet', 'mobile']) {
    await page.getByLabel('화면 크기').selectOption(device);
    const geometry = await page
      .locator('.official-template-preview > .render-node')
      .evaluate((root) => {
        const frame = root.getBoundingClientRect();
        const header = root.firstElementChild!.getBoundingClientRect();
        const css = getComputedStyle(root);
        return {
          x: header.x - frame.x,
          y: header.y - frame.y,
          padding: [css.paddingTop, css.paddingRight, css.paddingBottom, css.paddingLeft],
        };
      });
    expect(geometry).toEqual({ x: 0, y: 0, padding: ['0px', '0px', '0px', '0px'] });
  }
  await page.getByLabel('화면 선택').selectOption('form');
  for (const device of ['desktop', 'mobile']) {
    await page.getByLabel('화면 크기').selectOption(device);
    const name = (await page.getByLabel('이름', { exact: true }).boundingBox())!;
    const email = (await page.getByLabel('이메일', { exact: true }).boundingBox())!;
    if (device === 'desktop') {
      expect(Math.abs(name.y - email.y)).toBeLessThan(1);
      expect(email.x).toBeGreaterThan(name.x + name.width);
      expect(
        (await page.locator('.official-template-preview .render-card').boundingBox())!.width,
      ).toBeGreaterThan(800);
    } else expect(email.y).toBeGreaterThan(name.y + name.height);
  }
});

test('grid canvas controls grow and shrink real bordered cells and disappear in preview', async ({
  page,
}) => {
  await story(page, 'Grid');
  const cells = page.locator('.render-grid > .render-container');
  await expect(cells).toHaveCount(4);
  await expect(cells.first()).toHaveCSS('border-top-width', '1px');
  await page.getByRole('button', { name: '그리드 열 늘리기' }).click();
  await expect(cells).toHaveCount(6);
  await page.getByRole('button', { name: '그리드 행 늘리기' }).click();
  await expect(cells).toHaveCount(9);
  await page.getByRole('button', { name: '그리드 열 줄이기' }).click();
  await expect(cells).toHaveCount(6);
  await page.getByRole('button', { name: '그리드 행 줄이기' }).click();
  await expect(cells).toHaveCount(4);
  expect(
    (await new AxeBuilder({ page }).include('.grid-edit-controls').analyze()).violations,
  ).toEqual([]);
  await page.getByLabel('그리드 미리보기').check();
  await expect(page.getByRole('group', { name: '그리드 영역 조절' })).toHaveCount(0);
  await expect(cells).toHaveCount(4);
});
