import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWebhookReply, WebhookResponseError } from '../../apps/api/dist/ai/webhook-response.js';

test('AI webhook accepts reply and legacy completion, distinguishes missing or malformed responses', async () => {
  assert.equal(await readWebhookReply(Response.json({ reply: ' 답변 ' })), '답변');
  assert.equal(
    await readWebhookReply(Response.json({ choices: [{ message: { content: '이전 형식' } }] })),
    '이전 형식',
  );
  for (const [body, code] of [
    ['', 'empty'],
    ['   ', 'empty'],
    ['<html>proxy error</html>', 'invalid_json'],
    ['null', 'missing_reply'],
    ['{}', 'missing_reply'],
    ['{"message":"Workflow got started"}', 'missing_reply'],
    ['{"output":"Agent output not mapped to reply"}', 'missing_reply'],
    ['{"reply":{}}', 'missing_reply'],
    ['{"reply":" "}', 'empty_reply'],
  ]) {
    await assert.rejects(
      () => readWebhookReply(new Response(body)),
      (error) => {
        assert.ok(error instanceof WebhookResponseError);
        assert.equal(error.code, code);
        assert.equal(error.status, 200);
        return true;
      },
    );
  }
});

test('AI webhook reports HTTP failures without exposing upstream secrets and cancels oversized streams', async () => {
  for (const status of [401, 403, 404, 429, 500, 502, 503, 504]) {
    await assert.rejects(
      () => readWebhookReply(new Response('secret-upstream-body', { status })),
      (error) => {
        assert.equal(error.code, 'http');
        assert.ok(error.message.includes(`HTTP ${status}`));
        assert.ok(!error.message.includes('secret-upstream-body'));
        return true;
      },
    );
  }
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(256001));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(() => readWebhookReply(new Response(stream)), { code: 'too_large' });
  assert.equal(cancelled, true);
  await assert.rejects(() => readWebhookReply(Response.json({ reply: 'x'.repeat(30001) })), {
    code: 'too_large',
  });
});

test('image requests require an acknowledgement for the exact reference image', async () => {
  for (const imageFileId of [undefined, 'other-file']) {
    await assert.rejects(
      () => readWebhookReply(Response.json({ reply: '그렸습니다', imageFileId }), '123'),
      { code: 'image_not_processed' },
    );
  }
  assert.equal(
    await readWebhookReply(
      Response.json({ reply: '이미지를 참고했습니다', imageFileId: '123' }),
      '123',
    ),
    '이미지를 참고했습니다',
  );
});
