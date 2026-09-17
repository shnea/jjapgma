import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWebhookReply, WebhookResponseError } from '../../apps/api/dist/ai/webhook-response.js';

test('webhook distinguishes an empty answer from a missing field and explicit workflow errors', async () => {
  for (const [body, code] of [
    [{ reply: '' }, 'empty_reply'],
    [{ reply: ' \n ' }, 'empty_reply'],
    [{ output: '' }, 'missing_reply'],
    [{ reply: { text: 'wrong contract' } }, 'missing_reply'],
    [{ reply: '', error: 'upstream failed' }, 'workflow_error'],
    [{ choices: [{ message: { content: '' }, finish_reason: 'error' }] }, 'workflow_error'],
    [{ choices: [{ message: { content: 'partial' }, error: { code: 502 } }] }, 'workflow_error'],
    [{ choices: { some: 'not callable' } }, 'missing_reply'],
  ]) {
    await assert.rejects(
      readWebhookReply(Response.json(body)),
      (error) => error instanceof WebhookResponseError && error.code === code,
    );
  }
  await assert.rejects(readWebhookReply(Response.json({ reply: '' }, { status: 503 })), {
    code: 'http',
  });
  await assert.rejects(readWebhookReply(Response.json({ reply: '' }), 'image-id'), {
    code: 'image_not_processed',
  });
  await assert.rejects(
    readWebhookReply(Response.json({ reply: '', imageFileId: 'image-id' }), 'image-id'),
    { code: 'empty_reply' },
  );
  assert.equal(
    await readWebhookReply(
      Response.json({ choices: [{ message: { content: ' 정상 답변 ' }, finish_reason: 'stop' }] }),
    ),
    '정상 답변',
  );
});
