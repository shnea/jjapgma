import { BadGatewayException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';
import type { UploadFile } from './file-policy.js';
export const fileIdSchema = z
  .union([z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/), z.number().int().positive()])
  .transform(String);
export class FileClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly request: typeof fetch = fetch,
  ) {}
  private async call(path: string, options: RequestInit = {}) {
    let response: Response;
    try {
      response = await this.request(`${this.baseUrl}${path}`, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new BadGatewayException('파일 서비스에 연결하지 못했습니다. 잠시 후 다시 시도하세요.');
    }
    if (!response.ok) {
      console.warn(JSON.stringify({ event: 'file_service_failed', status: response.status }));
      await response.body?.cancel();
      const messages: Record<number, string> = {
        401: '파일 서비스 인증 설정을 확인해야 합니다.',
        413: '파일 크기 제한을 초과했습니다.',
        507: '파일 서비스의 저장 공간이 부족합니다.',
      };
      throw new HttpException(
        messages[response.status] ?? '파일 서비스 요청을 처리하지 못했습니다.',
        response.status === 401
          ? 503
          : [413, 507].includes(response.status)
            ? response.status
            : 502,
      );
    }
    return response;
  }
  async upload(file: UploadFile, name: string, category?: 'month') {
    if (!this.token) throw new ServiceUnavailableException('파일 업로드 연결 설정이 필요합니다.');
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), name);
    if (category) form.set('category', category);
    const response = await this.call('/files/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    // The guide does not specify a multipart envelope. Accept explicit fileId metadata only;
    // unknown provider responses fail closed until the actual contract is confirmed.
    const payload = await response.json().catch(() => null);
    const metadata = z.object({ fileId: fileIdSchema });
    const parsed = z
      .union([
        metadata,
        z.object({ files: z.tuple([metadata]) }).transform((value) => value.files[0]),
      ])
      .safeParse(payload);
    if (!parsed.success)
      throw new BadGatewayException(
        '파일 서비스 응답 형식을 확인해야 합니다. 같은 파일을 바로 재업로드하지 마세요.',
      );
    return parsed.data.fileId;
  }
  async preview(fileId: string) {
    const response = await this.call(`/files/preview/${encodeURIComponent(fileId)}`);
    await response.body?.cancel();
    return {
      ready: response.status !== 202,
      previewUrl: `${this.baseUrl}/files/preview/${encodeURIComponent(fileId)}`,
    };
  }
  downloadUrl(fileId: string) {
    return `${this.baseUrl}/files/download/${encodeURIComponent(fileId)}`;
  }
  async content(fileId: string, maxBytes: number) {
    const response = await this.call(`/files/download/${encodeURIComponent(fileId)}`);
    const reader = response.body?.getReader();
    if (!reader) throw new BadGatewayException('파일 본문이 없습니다.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maxBytes) throw new HttpException('내보낼 파일 크기 제한을 초과했습니다.', 413);
        chunks.push(value);
      }
      return Buffer.concat(chunks);
    } finally {
      await reader.cancel();
    }
  }
}
