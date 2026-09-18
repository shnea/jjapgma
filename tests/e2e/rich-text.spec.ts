import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSpec, createNode } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';
import { installRichTextIntegration, checkRichTextIntegration } from './rich-text-runtime';

test('rich text saves content and tmp attachments, reloads, undoes and exports offline', async ({
  page,
  browser,
}, testInfo) => {
  const spec = createSpec(),
    node = createNode('richText');
  node.props.richTextMode = 'viewer';
  spec.root.children.push(node);
  const { initial } = await openSpec(page, spec, '서식 본문 저장');
  const rendered = page.locator(`[data-node-id="${node.id}"]`).first();
  await rendered.click();
  await page.getByRole('button', { name: '본문 편집', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '본문 편집', exact: true });
  await dialog.locator('[contenteditable=true]').fill('저장하고 다시 읽는 서식 문서');
  const uploaded = page.waitForResponse(
    (r) => r.url().includes('/api/files/upload') && r.request().method() === 'POST',
  );
  await dialog.locator('[contenteditable=true]').press('End');
  await dialog.locator('[contenteditable=true]').press('Enter');
  await dialog.locator('[contenteditable=true]').pressSequentially('/image');
  await page.screenshot({ path: testInfo.outputPath('slash-menu-in-dialog.png') });
  await dialog.getByRole('option', { name: /image/i }).click();
  await dialog.getByText('Add image', { exact: true }).click();
  await expect(dialog.getByRole('tab', { name: 'Upload', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('upload-panel-in-dialog.png') });
  await dialog.locator('input[type=file]').setInputFiles({
    name: '본문이미지.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  const response = await uploaded;
  expect(response.status()).toBe(201);
  const uploadedFile = await response.json();
  expect(
    (await fetch(`http://file-service:8080/files/download/${uploadedFile.fileId}`)).headers.get(
      'X-Fixture-Category',
    ),
  ).toBe('tmp');
  await expect(dialog.locator('.bn-editor img')).toBeVisible();
  await dialog.getByRole('button', { name: '본문 적용' }).click();
  await expect(rendered).toContainText('저장하고 다시 읽는 서식 문서');
  await page.getByRole('button', { name: '실행 취소', exact: true }).click();
  await expect(rendered).not.toContainText('저장하고 다시 읽는 서식 문서');
  await page.getByRole('button', { name: '다시 실행', exact: true }).click();
  await expect(rendered).toContainText('저장하고 다시 읽는 서식 문서');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect
    .poll(async () => {
      const saved = await (await page.request.get(`/api/pages/${initial.id}`)).json();
      return saved.spec.root.children[0].props.documentJson;
    })
    .toContain('jjapgma-file:');
  await page.reload();
  await expect(rendered).toContainText('저장하고 다시 읽는 서식 문서');
  await expect
    .poll(() => rendered.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1);
  await page.screenshot({ path: testInfo.outputPath('rich-text-canvas.png'), fullPage: true });
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'HTML 내보내기', exact: true }).click();
  const zip = await readFile((await (await downloaded).path())!);
  const folder = testInfo.outputPath('document-export');
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
  const context = await browser.newContext({ offline: true });
  try {
    const exported = await context.newPage();
    const errors: string[] = [];
    exported.on('pageerror', (e) => errors.push(e.message));
    await exported.goto(pathToFileURL(resolve(folder, 'index.html')).href);
    await expect(exported.getByText('저장하고 다시 읽는 서식 문서', { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        exported.locator('.bn-editor img').evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBe(1);
    await exported.screenshot({
      path: testInfo.outputPath('rich-text-export.png'),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    const htmlPath = resolve(folder, 'index.html');
    await writeFile(
      htmlPath,
      (await readFile(htmlPath, 'utf8')).replace(
        '"richTextMode":"viewer"',
        '"richTextMode":"editor"',
      ),
    );
    await installRichTextIntegration(context);
    await exported.reload();
    await checkRichTextIntegration(exported);
  } finally {
    await context.close();
  }
});
