import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function story(page: Page, title: string, name: string) {
  const index = await (await page.request.get('/index.json')).json();
  const entry = (
    Object.values(index.entries) as { id: string; title: string; name: string }[]
  ).find((s) => s.title === title && s.name === name)!;
  await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
}

test('chat renders Markdown and timestamps, aligns bubbles and keeps the composer outside scrolling', async ({
  page,
}) => {
  await story(page, '요소/채팅', 'Long Conversation');
  await expect(page.locator('.chat-markdown table').first()).toBeVisible();
  await expect(page.locator('.chat-markdown pre code').first()).toHaveText('const ready = true;\n');
  await expect(page.locator('.chat-message time').first()).toHaveText('오후 2:30');
  await expect(page.locator('.chat-message-user').first()).toHaveCSS('align-items', 'flex-end');
  await expect(page.locator('.chat-message-assistant').first()).toHaveCSS(
    'align-items',
    'flex-start',
  );
  const before = await page.locator('.chat-composer').boundingBox();
  await page.locator('.element-chat-transcript').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await page.locator('.chat-composer').boundingBox()).toEqual(before);
  expect(
    await page.locator('.element-chat').evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).include('.element-chat').analyze()).violations).toEqual(
    [],
  );
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/chat-template-mobile.png' });
});

test('chat keyboard preserves composition and multiline input, then sends with Enter', async ({
  page,
}) => {
  await story(page, '요소/채팅', 'Default');
  const input = page.getByRole('textbox', { name: '메시지', exact: true });
  await input.fill('첫 줄');
  await input.press('Shift+Enter');
  await page.keyboard.insertText('둘');
  await expect(input).toHaveValue('첫 줄\n둘');
  await input.dispatchEvent('compositionstart');
  await input.press('Enter');
  await expect(page.locator('.chat-message-user')).toHaveCount(1);
  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(page.locator('.chat-message-user')).toHaveCount(2);
  await expect(input).toHaveValue('');
  await expect(page.getByRole('status')).toContainText('미리보기 메시지');
});

test('AI chat uploads a reference, renders safe Markdown, sends on Enter and shows waiting status', async ({
  page,
}) => {
  const markdown =
    '# 제안\n\n**강조**와 ~~삭제~~\n\n- [x] 준비\n\n| 이름 | 값 |\n| --- | --- |\n| 항목 | 1 |\n\n```js\nconst html = "<script>";\n```\n\n<script>window.pwned=true</script>\n\n[위험](javascript:alert(1))';
  const runs = Array.from({ length: 8 }, (_, i) => ({
    id: `${i}`,
    thread_id: 't',
    page_id: 'page',
    prompt: `질문 ${i}`,
    reply: markdown,
    status: 'completed',
    created_at: '2026-09-16T04:00:00Z',
    completed_at: '2026-09-16T04:00:05Z',
  }));
  let sent: Record<string, unknown> | undefined;
  await page.route('**/api/projects/demo/proposals', (r) => r.fulfill({ json: [] }));
  await page.route('**/api/projects/demo/chat', async (route) => {
    if (route.request().method() === 'POST') {
      sent = route.request().postDataJSON();
      runs.push({
        id: 'new',
        thread_id: 't',
        page_id: 'page',
        prompt: String(sent!.message),
        reply: '',
        status: 'running',
        created_at: new Date().toISOString(),
        completed_at: '',
      });
      await route.fulfill({ json: { threadId: 't', runId: 'new' } });
    } else
      await route.fulfill({ json: { enabled: true, threads: [{ id: 't', title: '대화' }], runs } });
  });
  await page.route('**/api/files/upload?projectId=demo', (r) =>
    r.fulfill({ json: { fileId: 'image-1', name: 'reference.png', mimeType: 'image/png' } }),
  );
  await page.route('**/api/projects/demo/files/image-1/preview', (r) =>
    r.fulfill({ json: { ready: false } }),
  );
  await story(page, '빌더/AI 채팅', 'Default');
  await expect(page.locator('.chat-markdown table')).toHaveCount(8);
  expect(await page.locator('.ai-messages script').count()).toBe(0);
  expect(await page.locator('.ai-messages a[href^="javascript:"]').count()).toBe(0);
  const composer = await page.locator('.chat-composer').boundingBox();
  await page.locator('.ai-transcript').evaluate((el) => {
    el.scrollTop = 0;
  });
  expect(await page.locator('.chat-composer').boundingBox()).toEqual(composer);
  await page.getByLabel('참고 이미지 파일').setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 10;
        return canvas.toDataURL('image/png').split(',')[1];
      }),
      'base64',
    ),
  });
  await expect(page.getByRole('button', { name: '첨부 이미지 제거' })).toBeVisible();
  await page.getByLabel('AI에게 요청').fill('이 이미지처럼 그려줘');
  await page.getByLabel('AI에게 요청').press('Enter');
  await expect.poll(() => sent?.imageFileId).toBe('image-1');
  await expect(page.getByRole('log', { name: 'AI 대화 메시지' }).getByRole('status')).toContainText('답변을 준비');
  await expect(page.getByRole('button', { name: '보내기', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'test-results/ai-chat-waiting.png' });
});

test('AI reference upload resizes large originals before multipart upload, preserves small images and rejects corrupt files', async ({
  page,
}) => {
  await page.route('**/api/projects/demo/chat', (r) =>
    r.fulfill({ json: { enabled: true, threads: [], runs: [] } }),
  );
  await page.route('**/api/projects/demo/proposals', (r) => r.fulfill({ json: [] }));
  await page.route('**/api/projects/demo/files/*/preview', (r) =>
    r.fulfill({ json: { ready: false } }),
  );
  const uploads: { name: string; type: string; bytes: Buffer }[] = [];
  await page.route('**/api/files/upload?projectId=demo', async (route) => {
    const body = route.request().postDataBuffer()!;
    const form = await new Response(new Uint8Array(body), {
      headers: { 'Content-Type': route.request().headers()['content-type'] },
    }).formData();
    const file = form.get('file') as File;
    uploads.push({
      name: file.name,
      type: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    await route.fulfill({
      json: { fileId: String(uploads.length), name: file.name, mimeType: file.type },
    });
  });
  await story(page, '빌더/AI 채팅', 'Default');
  const original = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = 1400;
      const context = canvas.getContext('2d')!;
      const data = context.createImageData(canvas.width, canvas.height);
      let seed = 42;
      for (let i = 0; i < data.data.length; i += 4) {
        for (let channel = 0; channel < 3; channel++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          data.data[i + channel] = seed >>> 24;
        }
        data.data[i + 3] = 255;
      }
      context.putImageData(data, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
  expect(original.length).toBeGreaterThan(5 * 1024 * 1024);
  const input = page.getByLabel('참고 이미지 파일');
  await input.setInputFiles({ name: '큰 화면.png', mimeType: 'image/png', buffer: original });
  await expect.poll(() => uploads.length).toBe(1);
  expect(uploads[0].name).toBe('큰 화면.jpg');
  expect(uploads[0].type).toBe('image/jpeg');
  expect(uploads[0].bytes.length).toBeLessThanOrEqual(200 * 1024);
  const dimensions = await page.evaluate(
    async (bytes) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }),
      );
      const result = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return result;
    },
    [...uploads[0].bytes],
  );
  expect(dimensions.width).toBeLessThanOrEqual(1024);
  expect(Math.abs(dimensions.width / dimensions.height - 1800 / 1400)).toBeLessThan(0.003);
  await expect(page.locator('.ai-image-summary')).toContainText('→');
  await page.screenshot({ path: 'test-results/ai-image-compressed.png' });
  const small = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 80;
      return canvas.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
  await input.setInputFiles({ name: 'small.png', mimeType: 'image/png', buffer: small });
  await expect.poll(() => uploads.length).toBe(2);
  expect(uploads[1].type).toBe('image/png');
  expect(uploads[1].bytes.equals(small)).toBe(true);
  await expect(page.locator('.ai-image-summary')).toContainText('원본 유지');
  await input.setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('invalid image'),
  });
  await expect(page.getByRole('alert')).toContainText('이미지를 읽지 못했습니다');
  expect(uploads).toHaveLength(2);
  await expect(page.locator('.ai-attached')).toContainText('small.png');
  await input.setInputFiles({
    name: 'huge.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole('alert')).toContainText('20 MB 이하');
  expect(uploads).toHaveLength(2);
  await page.getByRole('button', { name: '첨부 이미지 제거' }).click();
  await expect(page.locator('.ai-image-summary')).toHaveCount(0);
});

test('AI reference conversion fills transparent backgrounds and uses a still GIF image', async ({
  page,
}) => {
  await page.route('**/api/projects/demo/chat', (r) =>
    r.fulfill({ json: { enabled: true, threads: [], runs: [] } }),
  );
  await page.route('**/api/projects/demo/proposals', (r) => r.fulfill({ json: [] }));
  await page.route('**/api/projects/demo/files/*/preview', (r) =>
    r.fulfill({ json: { ready: false } }),
  );
  const uploads: Buffer[] = [];
  await page.route('**/api/files/upload?projectId=demo', async (route) => {
    const form = await new Response(new Uint8Array(route.request().postDataBuffer()!), {
      headers: { 'Content-Type': route.request().headers()['content-type'] },
    }).formData();
    const file = form.get('file') as File;
    expect(file.type).toBe('image/jpeg');
    uploads.push(Buffer.from(await file.arrayBuffer()));
    await route.fulfill({
      json: { fileId: String(uploads.length), name: file.name, mimeType: file.type },
    });
  });
  await story(page, '빌더/AI 채팅', 'Default');
  const transparent = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 800;
      return canvas.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
  await page
    .getByLabel('참고 이미지 파일')
    .setInputFiles({ name: 'transparent.png', mimeType: 'image/png', buffer: transparent });
  await expect.poll(() => uploads.length).toBe(1);
  const pixel = await page.evaluate(
    async (bytes) => {
      const image = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      image.close();
      return [...ctx.getImageData(0, 0, 1, 1).data];
    },
    [...uploads[0]],
  );
  expect(pixel).toEqual([255, 255, 255, 255]);
  await page
    .getByLabel('참고 이미지 파일')
    .setInputFiles({
      name: 'animation.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
    });
  await expect.poll(() => uploads.length).toBe(2);
  await expect(page.locator('.ai-image-summary')).toContainText('GIF 첫 프레임');
});
