import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { TextDecoder } from 'node:util';
export type UploadFile = { buffer: Buffer; originalname: string; mimetype: string; size: number };
const extensions: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'text/plain': ['txt'],
  'text/csv': ['csv'],
  'application/json': ['json'],
};
export function validateUpload(file: UploadFile | undefined, maxBytes: number) {
  if (!file || !file.size || !file.buffer)
    throw new BadRequestException('업로드할 파일을 선택하세요.');
  if (file.size > maxBytes) throw new PayloadTooLargeException('파일 크기 제한을 초과했습니다.');
  let originalname = file.originalname;
  // Multipart headers may arrive as latin1 even when the browser sent UTF-8.
  if ([...originalname].every((char) => char.charCodeAt(0) <= 255)) {
    try {
      originalname = new TextDecoder('utf-8', { fatal: true }).decode(
        Buffer.from(originalname, 'latin1'),
      );
    } catch {
      /* Keep a genuine latin1 filename. */
    }
  }
  const name = originalname
    .normalize('NFC')
    .replace(/[\\/]|\p{Cc}/gu, '_')
    .slice(0, 200);
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const bytes = file.buffer;
  let valid = extensions[file.mimetype]?.includes(extension) ?? false;
  if (file.mimetype === 'image/png')
    valid &&= bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  else if (file.mimetype === 'image/jpeg')
    valid &&= bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  else if (file.mimetype === 'image/gif')
    valid &&= /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString());
  else if (file.mimetype === 'image/webp')
    valid &&=
      bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  else if (file.mimetype === 'application/pdf')
    valid &&= bytes.subarray(0, 5).toString() === '%PDF-';
  else if (valid) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      valid &&= !text.includes('\0');
      if (file.mimetype === 'application/json') JSON.parse(text);
    } catch {
      valid = false;
    }
  }
  if (!valid)
    throw new BadRequestException(
      'PNG, JPG, GIF, WebP, PDF, TXT, CSV, JSON 형식의 올바른 파일을 선택하세요.',
    );
  return { name, mimeType: file.mimetype };
}
