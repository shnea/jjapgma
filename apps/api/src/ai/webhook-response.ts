type FailureCode =
  'http' | 'empty' | 'too_large' | 'invalid_json' | 'missing_reply' | 'image_not_processed';

export class WebhookResponseError extends Error {
  constructor(
    readonly code: FailureCode,
    readonly status: number,
  ) {
    const message =
      code === 'image_not_processed'
        ? 'n8n의 이미지 전달 설정이 필요합니다. 참고 이미지 다운로드와 AI Agent의 이미지 전달 옵션을 연결해 주세요.'
        : code === 'http'
          ? status === 401 || status === 403
            ? `n8n 인증이 거절되었습니다(HTTP ${status}). Webhook 인증 설정을 확인해 주세요.`
            : `n8n이 오류를 반환했습니다(HTTP ${status}). n8n Executions에서 실패한 노드를 확인해 주세요.`
          : code === 'too_large'
            ? 'AI 응답이 허용 크기를 초과했습니다. 요청 범위를 줄여 주세요.'
            : code === 'missing_reply'
              ? 'n8n 응답에 답변(reply)이 없습니다. Respond to Webhook의 응답 설정을 확인해 주세요.'
              : code === 'empty'
                ? 'n8n이 빈 응답을 반환했습니다. Respond to Webhook의 연결과 응답 설정을 확인해 주세요.'
                : 'n8n 응답이 JSON 형식이 아닙니다. Respond to Webhook의 응답 형식을 JSON으로 설정해 주세요.';
    super(message);
  }
}

export async function readWebhookReply(
  response: Response,
  imageFileId?: string,
  reportUsage?: (usage: unknown) => Promise<void>,
): Promise<string> {
  if (!response.ok) {
    await response.body?.cancel();
    throw new WebhookResponseError('http', response.status);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new WebhookResponseError('empty', response.status);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 256000) {
        await reader.cancel();
        throw new WebhookResponseError('too_large', response.status);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = Buffer.concat(chunks).toString('utf8');
  if (!body.trim()) throw new WebhookResponseError('empty', response.status);
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new WebhookResponseError('invalid_json', response.status);
  }
  const reply = data?.reply ?? data?.choices?.[0]?.message?.content;
  if (data?.usage !== undefined && reportUsage) await reportUsage(data.usage);
  if (imageFileId && data?.imageFileId !== imageFileId)
    throw new WebhookResponseError('image_not_processed', response.status);
  if (typeof reply !== 'string' || !reply.trim())
    throw new WebhookResponseError('missing_reply', response.status);
  if (reply.trim().length > 30000) throw new WebhookResponseError('too_large', response.status);
  return reply.trim();
}
