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
      if (['pricing', 'checkout', 'dashboard', 'onboarding', 'settings'].includes(template.id))
        await page.screenshot({
          path: info.outputPath(`${template.id}-${device}.png`),
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
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
