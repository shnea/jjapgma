import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createSpec,
  createNode,
  createTemplate,
  themePresets,
  convertTable,
} from '@jjapgma/ui-spec';
import { openSpec } from './helpers';
import { mobileLayoutFixture } from '../../apps/web/src/features/editor/mobile-layout.fixture';

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
  image.style.height = '180px';
  table.props.items =
    '이름|상태\n' + Array.from({ length: 12 }, (_, n) => '사용자' + (n + 1) + '|활성').join('\n');
  table.props.paginationMode = 'pagination';
  table.props.pageSize = 2;
  table.props.columnCount = 3;
  table.props.table = convertTable(table.props);
  table.props.table.striped = true;
  table.props.table.firstColumn = 'number-select';
  table.props.table.columns[1].type = 'badge';
  table.props.table.columns[1].hidden = { mobile: true };
  table.props.table.columns[2].title = '사진';
  table.props.table.columns[2].type = 'image';
  table.props.table.rows[0].cells['col-2'] = image.props.src!;
  radio.props.labelPosition = 'right';
  text.props.text = '</script><img src=x onerror="window.injected=true">';
  text.props.customCss = 'letter-spacing: 3px; border: 2px solid rgb(255, 0, 0)';
  text.style.css = {
    borderBottomWidth: 5,
    borderBottomColor: 'rgb(0, 80, 160)',
    width: 'calc(100% - 16px)',
  };
  text.responsive.mobile = { css: { borderBottomWidth: 7 } };
  spec.root.responsive.mobile = { gap: 37 };
  spec.root.children.push(tabs, date, table, radio, image, text);
  spec.theme = structuredClone(themePresets[1].theme);
  spec.theme.font = 'serif';
  const themedButton = createNode('button');
  themedButton.props.text = '테마 버튼';
  spec.root.children.push(themedButton);
  const formRow = createNode('container'),
    formInput = createNode('input'),
    formDate = createNode('input'),
    formRange = createNode('dateRange'),
    formButton = createNode('button');
  formRow.style = { direction: 'row', gap: 12, padding: 12 };
  formRow.responsive.mobile = { direction: 'column' };
  formDate.props.controlType = 'date';
  formDate.props.text = '조회일';
  formRange.props.text = '조회 범위';
  formButton.props.text = '조회';
  formRow.children = [formInput, formDate, formRange, formButton];
  spec.root.children.push(formRow);
  const floating = createNode('nonModal'),
    openFloating = createNode('button');
  floating.props = { text: '내보낸 창', isOpen: false };
  openFloating.props = {
    text: '내보낸 창 열기',
    overlayAction: { type: 'open', targetId: floating.id },
  };
  floating.children = [createNode('input')];
  spec.root.children.push(openFloating, floating);
  const chat = createNode('chat');
  spec.root.children.push(chat);
  spec.root.children.push(
    createNode('chart'),
    createTemplate('onboarding').root.children.find((n) => n.type === 'wizard')!,
  );
  spec.root.children.push(...mobileLayoutFixture().root.children);
  await openSpec(page, spec, '내보내기 <&>');
  await page.reload();
  await expect(page.locator(`[data-node-id="${text.id}"]`).first()).toHaveCSS(
    'border-bottom-width',
    '5px',
  );
  const downloadAnchors: string[] = [];
  await page.exposeFunction('captureDownload', (name: string) => downloadAnchors.push(name));
  await page.evaluate(() =>
    document.addEventListener('click', (event) => {
      if (event.target instanceof HTMLAnchorElement && event.target.download)
        (window as unknown as { captureDownload: (name: string) => void }).captureDownload(
          event.target.download,
        );
    }),
  );
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'HTML 내보내기', exact: true }).click();
  const download = await pending;
  expect(
    download.suggestedFilename(),
    JSON.stringify({
      anchors: downloadAnchors,
      url: download.url(),
      failure: await download.failure(),
    }),
  ).toMatch(/-html\.zip$/);
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
  await exported.getByRole('button', { name: '내보낸 창 열기' }).click();
  const floatingWindow = exported.getByRole('dialog', { name: '내보낸 창', exact: true });
  await expect(floatingWindow).toBeVisible();
  const floatingBounds = await floatingWindow.boundingBox();
  expect(Math.abs(floatingBounds!.y + floatingBounds!.height / 2 - 450)).toBeLessThan(2);
  await floatingWindow.getByRole('button', { name: '닫기' }).click();
  await expect(floatingWindow).toHaveCount(0);
  await expect(exported).toHaveTitle('내보내기 <&>');
  await expect(exported.locator('.element-chart')).toBeVisible();
  await expect(exported.locator('.chart-values dd').first()).toHaveText('18 건');
  await exported.getByLabel('워크스페이스 이름', { exact: true }).fill('오프라인 팀');
  await exported
    .locator('.element-wizard')
    .getByRole('button', { name: '다음', exact: true })
    .click();
  await exported
    .locator('.element-wizard')
    .getByRole('button', { name: '이전', exact: true })
    .click();
  await expect(exported.getByLabel('워크스페이스 이름', { exact: true })).toHaveValue(
    '오프라인 팀',
  );
  await expect(exported.locator('.element-chat .chat-markdown strong')).toHaveText('어떤 화면');
  await exported
    .locator('.element-chat')
    .getByLabel('메시지', { exact: true })
    .fill('오프라인 전송');
  await exported.locator('.element-chat').getByLabel('메시지', { exact: true }).press('Enter');
  await expect(exported.locator('.element-chat .chat-message-user').last()).toContainText(
    '오프라인 전송',
  );
  const root = exported.locator('[data-node-id="' + spec.root.id + '"]');
  await expect
    .poll(() =>
      exported.locator(`[data-node-id="${formRow.id}"]`).evaluate((row) => {
        const centers = Array.from(
          row.querySelectorAll('[data-field-control],.element-button'),
        ).map((c) => {
          const b = c.getBoundingClientRect();
          return b.y + b.height / 2;
        });
        return Math.max(...centers) - Math.min(...centers);
      }),
    )
    .toBeLessThan(1);
  await expect(root).toHaveCSS('flex-direction', 'column');
  await expect(exported.getByRole('button', { name: '테마 버튼', exact: true })).toHaveCSS(
    'background-color',
    'rgb(36, 88, 166)',
  );
  await expect(exported.getByRole('button', { name: '테마 버튼', exact: true })).toHaveCSS(
    'font-family',
    /Georgia/,
  );
  await expect(exported.getByText(text.props.text, { exact: true })).toBeVisible();
  expect(await exported.evaluate(() => 'injected' in window)).toBe(false);
  await expect(exported.locator('[data-node-id="' + text.id + '"]')).toHaveCSS(
    'letter-spacing',
    '3px',
  );
  await expect(exported.locator(`[data-node-id="${image.id}"] img`)).toBeVisible();
  const cssNode = exported.locator(`[data-node-id="${text.id}"]`);
  await expect(cssNode).toHaveCSS('border-bottom-width', '5px');
  await expect(cssNode).toHaveCSS('border-bottom-color', 'rgb(0, 80, 160)');
  const imageFrame = (await exported.locator(`[data-node-id="${image.id}"]`).boundingBox())!;
  const imageContent = (await exported.locator(`[data-node-id="${image.id}"] img`).boundingBox())!;
  const nextText = (await exported.locator(`[data-node-id="${text.id}"]`).boundingBox())!;
  expect(imageContent.height).toBeCloseTo(imageFrame.height, 0);
  expect(imageContent.y + imageContent.height).toBeLessThanOrEqual(nextText.y);
  await expect(exported.locator('.configured-table thead th')).toHaveCount(4);
  await expect(exported.locator('.configured-table .table-badge')).toHaveCount(2);
  await expect(exported.locator('.configured-table .table-cell-image')).toBeVisible();
  expect(
    await exported
      .locator('.configured-table .table-cell-image')
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await exported.getByLabel('현재 페이지 전체 선택').check();
  await expect(exported.locator('.table-toolbar').getByRole('status')).toContainText('2개 선택');
  expect(
    await exported
      .locator(`[data-node-id="${image.id}"]`)
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
  await expect(exported.locator('[data-node-id="mobile-hero"]')).toHaveCSS(
    'flex-direction',
    'column',
  );
  const mobileGrid = exported.locator('[data-node-id="mobile-grid"]');
  const mobileCard = await mobileGrid.locator(':scope > .render-card').first().boundingBox();
  expect(mobileCard!.width).toBeGreaterThan((await mobileGrid.boundingBox())!.width - 2);
  await expect(cssNode).toHaveCSS('border-bottom-width', '7px');
  await expect(cssNode).toHaveCSS('border-bottom-color', 'rgb(0, 80, 160)');
  await expect(root).toHaveCSS('gap', '37px');
  await expect(exported.locator('.configured-table thead th')).toHaveCount(3);
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
