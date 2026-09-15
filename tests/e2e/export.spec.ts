import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSpec, createNode } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';

test('downloaded ZIP runs renderer styles and interactions offline from index.html', async ({
  page,
  browser,
}, testInfo) => {
  const spec = createSpec(),
    tabs = createNode('tabs'),
    date = createNode('dateRange'),
    table = createNode('table'),
    radio = createNode('radio'),
    image = createNode('image'),
    text = createNode('text');
  date.props.includeTime = true;
  table.props.items =
    '이름|상태\n' + Array.from({ length: 12 }, (_, n) => '사용자' + (n + 1) + '|활성').join('\n');
  table.props.paginationMode = 'pagination';
  table.props.pageSize = 2;
  table.props.columnCount = 3;
  radio.props.labelPosition = 'right';
  text.props.text = '</script><img src=x onerror="window.injected=true">';
  text.props.customCss = 'letter-spacing: 3px; border: 2px solid rgb(255, 0, 0)';
  spec.root.responsive.mobile = { gap: 37 };
  spec.root.children.push(tabs, date, table, radio, image, text);
  await openSpec(page, spec, '내보내기 <&>');
  const downloadAnchors: string[] = [];
  await page.exposeFunction('captureDownload', (name: string) => downloadAnchors.push(name));
  await page.evaluate(() => document.addEventListener('click', event => {
    if (event.target instanceof HTMLAnchorElement && event.target.download)
      (window as unknown as { captureDownload: (name: string) => void }).captureDownload(event.target.download);
  }));
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'HTML 내보내기', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename(), JSON.stringify({ anchors: downloadAnchors, url: download.url(), failure: await download.failure() })).toMatch(/-html\.zip$/);
  const zip = await readFile((await download.path())!);
  const folder = testInfo.outputPath('exported');
  const names: string[] = [];
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    expect(zip.readUInt16LE(offset + 8)).toBe(0);
    const size = zip.readUInt32LE(offset + 18),
      nameLength = zip.readUInt16LE(offset + 26),
      extra = zip.readUInt16LE(offset + 28),
      name = zip.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const target = resolve(folder, name);
    expect(target.startsWith(folder + '/')).toBe(true);
    const start = offset + 30 + nameLength + extra;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, zip.subarray(start, start + size));
    names.push(name);
    offset = start + size;
  }
  expect(names).toEqual(
    expect.arrayContaining(['index.html', 'runtime.js', 'styles.css', 'spec.json']),
  );
  expect(names.some((name) => name.startsWith('assets/'))).toBe(true);
  const offline = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    offline: true,
  });
  const exported = await offline.newPage();
  const errors: string[] = [];
  exported.on('pageerror', (e) => errors.push(e.message));
  await exported.goto(pathToFileURL(resolve(folder, 'index.html')).href);
  await expect(exported).toHaveTitle('내보내기 <&>');
  const root = exported.locator('[data-node-id="' + spec.root.id + '"]');
  await expect(root).toHaveCSS('flex-direction', 'column');
  await expect(exported.getByText(text.props.text, { exact: true })).toBeVisible();
  expect(await exported.evaluate(() => 'injected' in window)).toBe(false);
  await expect(exported.locator('[data-node-id="' + text.id + '"]')).toHaveCSS(
    'letter-spacing',
    '3px',
  );
  await expect(exported.getByTestId('node-image').locator('img')).toBeVisible();
  expect(
    await exported
      .getByTestId('node-image')
      .locator('img')
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await exported.getByRole('tab').nth(1).click();
  await expect(exported.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
  await exported.getByRole('radio').nth(1).check();
  await expect(exported.getByRole('radio').nth(1)).toBeChecked();
  await exported.getByRole('button', { name: '다음 페이지' }).click();
  await expect(exported.locator('tbody tr').first()).toContainText('사용자3');
  await exported.getByRole('button', { name: '기간', exact: true }).click();
  await exported.getByRole('dialog').getByLabel('시작 시간 분', { exact: true }).selectOption('59');
  await expect(exported.getByRole('dialog').locator('.picker-summary')).toHaveCount(0);
  await exported.getByRole('dialog').getByRole('button', { name: '적용', exact: true }).click();
  await expect(
    exported.getByTestId('node-dateRange').locator('input[type="hidden"]').first(),
  ).toHaveValue(/T00:59:59.999$/);
  await expect(exported.getByRole('button', { name: '기간', exact: true })).not.toContainText(
    '.999',
  );
  await exported.setViewportSize({ width: 375, height: 812 });
  await expect(root).toHaveCSS('gap', '37px');
  await expect(root).toHaveCSS('flex-direction', 'column');
  expect(await exported.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    375,
  );
  await expect(exported.getByRole('radio').nth(1)).toBeChecked();
  await exported.screenshot({ path: 'test-results/export-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  await offline.close();
});

test('export failure reports a missing runtime instead of downloading a broken page', async ({
  page,
}) => {
  await openSpec(page, createSpec(), '내보내기 실패 처리');
  await page.route('**/export/runtime.js', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  await page.getByRole('button', { name: 'HTML 내보내기', exact: true }).click();
  await expect(
    page.getByText('내보내기 파일을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.'),
  ).toBeVisible();
});
