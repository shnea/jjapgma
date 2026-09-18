import { expect, type BrowserContext, type Page } from '@playwright/test';

export async function installRichTextIntegration(context: BrowserContext) {
  await context.addInitScript(() => {
    const state = window as unknown as {
      richTextChanges: string[];
      jjapgmaRichText: {
        onChange: (id: string, value: string) => void;
        uploadFile: (id: string, body: FormData) => Promise<string>;
      };
    };
    state.richTextChanges = [];
    state.jjapgmaRichText = {
      onChange: (id, value) => state.richTextChanges.push(`${id}:${value}`),
      async uploadFile(id, body) {
        const response = await fetch('https://consumer.test/upload', { method: 'POST', body });
        if (!response.ok) throw new Error('Consumer upload failed');
        return (await response.json()).previewUrl;
      },
    };
  });
}

export async function checkRichTextIntegration(page: Page) {
  const requests: string[] = [];
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=';
  await page.route('https://consumer.test/**', (route) => {
    if (route.request().method() === 'POST') {
      requests.push(route.request().postDataBuffer()!.toString());
      return route.fulfill({ json: { previewUrl: 'https://consumer.test/image.png' } });
    }
    return route.fulfill({ contentType: 'image/png', body: Buffer.from(png, 'base64') });
  });
  const editor = page.locator('[contenteditable=true]').first();
  await editor.fill('실제 서비스에서 작성한 본문');
  await expect(page.getByText('입력 체험 · 변경 내용은 저장되지 않습니다')).toHaveCount(0);
  await editor.evaluate((element, data) => {
    const clipboard = new DataTransfer();
    clipboard.items.add(
      new File([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], 'runtime.png', {
        type: 'image/png',
      }),
    );
    element.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }),
    );
  }, png);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toContain('name="file"');
  expect(requests[0]).not.toContain('name="category"');
  await expect(page.locator('.bn-editor img[src="https://consumer.test/image.png"]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { richTextChanges: string[] }).richTextChanges.join('\n'),
      ),
    )
    .toContain('https://consumer.test/image.png');
  // A rejected consumer upload is visible, without persisting a Base64 fallback.
  await page.route('https://consumer.test/upload', (route) => route.fulfill({ status: 503 }));
  await editor.evaluate((element, data) => {
    const clipboard = new DataTransfer();
    clipboard.items.add(
      new File([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], 'failure.png', {
        type: 'image/png',
      }),
    );
    element.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }),
    );
  }, png);
  await expect(page.getByRole('alert')).toContainText('파일을 첨부하지 못했습니다.');
  expect(
    await page.evaluate(() =>
      (window as unknown as { richTextChanges: string[] }).richTextChanges.join('\n'),
    ),
  ).not.toContain('data:image');
}
