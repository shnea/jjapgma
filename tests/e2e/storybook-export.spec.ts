import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile, symlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createSpec, createNode, componentTypes, pageTemplates } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';

test('Storybook ZIP builds all project pages, component and template stories with local images and real interactions', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(180000);
  const spec = createSpec();
  const heading = createNode('heading');
  heading.props.text = '저장된 제목';
  heading.style.css = { borderBottom: '3px solid rgb(40, 80, 160)', width: 'calc(100% - 16px)' };
  heading.responsive.mobile = { css: { borderBottomWidth: 5 } };
  spec.root.children.push(heading);
  const { initial, headers } = await openSpec(page, spec, 'Storybook " </script> 페이지');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=',
    'base64',
  );
  const upload = await page.request.post(`/api/files/upload?projectId=${initial.project_id}`, {
    headers,
    multipart: { file: { name: '프로젝트 이미지.png', mimeType: 'image/png', buffer: png } },
  });
  expect(upload.ok()).toBe(true);
  const reference = await upload.json();
  const image = createNode('image');
  image.props.attachment = reference;
  spec.root.children.push(image);
  const second = await page.request.post(`/api/projects/${initial.project_id}/pages`, {
    headers,
    data: { name: '두 번째 페이지' },
  });
  expect(second.ok()).toBe(true);
  const secondPage = await second.json();
  expect(
    (
      await page.request.put(`/api/pages/${secondPage.id}`, {
        headers,
        data: { name: secondPage.name, spec, baseRevision: 1 },
      })
    ).ok(),
  ).toBe(true);
  const personal = await page.request.post('/api/templates', {
    headers,
    data: { name: '개인 이미지 템플릿', sourcePageId: secondPage.id, spec },
  });
  expect(personal.ok()).toBe(true);
  await page.locator(`[data-node-id="${heading.id}"]`).click();
  await page.getByLabel('내용', { exact: true }).fill('저장 전 제목도 포함');
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '스토리북 내보내기', exact: true }).click();
  const zip = await readFile((await (await downloaded).path())!);
  const folder = testInfo.outputPath('storybook-package');
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
  const manifest = JSON.parse(await readFile(resolve(folder, 'manifest.json'), 'utf8'));
  expect(manifest.pages).toBe(2);
  expect(manifest.components).toBe(componentTypes.length);
  expect(manifest.officialTemplates).toBe(pageTemplates.length);
  expect(manifest.personalTemplates).toBe(1);
  const currentData = JSON.parse(
    await readFile(resolve(folder, `src/data/page-${initial.id}.json`), 'utf8'),
  );
  expect(currentData.spec.root.children[0].props.text).toBe('저장 전 제목도 포함');
  const secondData = JSON.parse(
    await readFile(resolve(folder, `src/data/page-${secondPage.id}.json`), 'utf8'),
  );
  expect(await readFile(resolve(folder, 'public', secondData.assets[image.id].src))).toEqual(png);
  // Use the pinned dependencies already installed in the isolated test image.
  await symlink(resolve('node_modules'), resolve(folder, 'node_modules'), 'dir');
  try {
    const result = await promisify(execFile)('npm', ['run', 'build-storybook'], {
      cwd: folder,
      timeout: 90000,
      maxBuffer: 4 * 1024 * 1024,
    });
    await writeFile(testInfo.outputPath('build.log'), result.stdout + result.stderr);
  } catch (error) {
    await writeFile(testInfo.outputPath('build.log'), String(error));
    throw error;
  }
  const builtIndex = JSON.parse(
    await readFile(resolve(folder, 'storybook-static/index.json'), 'utf8'),
  );
  expect(Object.keys(builtIndex.entries)).toHaveLength(manifest.stories.length * 3 + 1);
  const server = spawn(process.execPath, [
    resolve('node_modules/http-server/bin/http-server'),
    resolve(folder, 'storybook-static'),
    '-p',
    '6107',
    '--silent',
  ]);
  const context = await browser.newContext();
  const exported = await context.newPage();
  const errors: string[] = [];
  const external: string[] = [];
  exported.on('pageerror', (error) => errors.push(error.message));
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  const story = async (id: string) =>
    exported.goto(`http://127.0.0.1:6107/iframe.html?id=${id}&viewMode=story`);
  try {
    await expect
      .poll(async () => {
        try {
          return (await fetch('http://127.0.0.1:6107/index.json')).status;
        } catch {
          return 0;
        }
      })
      .toBe(200);
    await story(`page-${initial.id}--desktop`);
    await expect(exported.getByRole('heading', { name: '저장 전 제목도 포함' })).toBeVisible();
    const cssNode = exported.locator(`[data-node-id="${heading.id}"]`);
    await expect(cssNode).toHaveCSS('border-bottom-width', '3px');
    await story(`page-${initial.id}--mobile`);
    await expect(cssNode).toHaveCSS('border-bottom-width', '5px');
    await expect(cssNode).toHaveCSS('border-bottom-color', 'rgb(40, 80, 160)');
    await story(`page-${secondPage.id}--desktop`);
    await expect
      .poll(() =>
        exported
          .locator('img')
          .first()
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBe(1);
    for (const entry of manifest.stories) {
      await story(`${entry.id}--desktop`);
      await expect(exported.locator('#storybook-root .render-node').first()).toBeVisible();
    }
    await story('component-input--desktop');
    await exported.locator('input').first().fill('독립 실행 입력');
    await expect(exported.locator('input').first()).toHaveValue('독립 실행 입력');
    await story('component-dialog--desktop');
    await exported.getByRole('button', { name: '다이얼로그 열기' }).click();
    await expect(exported.getByRole('dialog')).toBeVisible();
    await story('template-main--mobile');
    await expect(exported.locator('#storybook-root > div')).toHaveCSS('width', '375px');
    await exported.screenshot({ path: testInfo.outputPath('main-mobile.png'), fullPage: true });
    await story('export-images--all');
    await expect(exported.getByRole('img', { name: '프로젝트 이미지.png' }).first()).toBeVisible();
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  } finally {
    await context.close();
    server.kill();
  }
});

test('Storybook renderer failure is shown without downloading a partial archive', async ({
  page,
}) => {
  await openSpec(page, createSpec(), 'Storybook 실패');
  await page.route('**/export/storybook/renderer.js', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  await page.getByRole('button', { name: '스토리북 내보내기', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storybook 렌더러를 불러오지 못했습니다.');
  expect(downloads).toEqual([]);
});
