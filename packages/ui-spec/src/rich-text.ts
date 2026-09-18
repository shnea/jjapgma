import { z } from 'zod';

export const richTextMaxBytes = 128 * 1024;
export const attachmentSchema = z
  .object({
    fileId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
    name: z.string().min(1).max(200),
    mimeType: z.string().min(1).max(100),
  })
  .strict();
export const richTextFileUrl = (id: string) => `jjapgma-file:${id}`;
export const richTextFileId = (url: string) =>
  /^jjapgma-file:([a-zA-Z0-9_-]{1,128})$/.exec(url)?.[1];

const blockTypes = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem',
  'quote',
  'codeBlock',
  'divider',
  'table',
  'image',
  'file',
  'audio',
  'video',
]);
const mediaTypes = new Set(['image', 'file', 'audio', 'video']);
const safeUrl = (url: string) =>
  url === '' ||
  !!richTextFileId(url) ||
  /^(https?:\/\/[^\s\\]+|mailto:[^\s\\]+|#[\w-]*)$/.test(url);

// Validate the JSON before passing it to the external document parser, including nested tables.
export function parseRichText(value: string): Record<string, unknown>[] {
  if (!value) return [];
  if (new TextEncoder().encode(value).length > richTextMaxBytes)
    throw new Error('본문은 UTF-8 기준 128 KB 이하여야 합니다.');
  const blocks: unknown = JSON.parse(value);
  if (!Array.isArray(blocks)) throw new Error('본문은 BlockNote 문서 배열이어야 합니다.');
  let count = 0;
  const ids = new Set<string>();
  function visit(value: unknown, depth: number) {
    if (depth > 30 || ++count > 12000) throw new Error('본문의 중첩 또는 항목 수가 너무 많습니다.');
    if (Array.isArray(value)) {
      value.forEach((v) => visit(v, depth + 1));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('지원하지 않는 본문 속성입니다.');
      if ((key === 'url' || key === 'href') && (typeof child !== 'string' || !safeUrl(child)))
        throw new Error('링크는 http(s), mailto, 문서 앵커 또는 등록한 첨부파일을 사용하세요.');
      visit(child, depth + 1);
    }
  }
  function block(value: unknown): void {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('본문 블록이 올바르지 않습니다.');
    const b = value as Record<string, unknown>;
    if (b.id !== undefined) {
      if (typeof b.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(b.id) || ids.has(b.id))
        throw new Error('본문 블록 ID가 올바르지 않거나 중복되었습니다.');
      ids.add(b.id);
    }
    if (typeof b.type !== 'string' || !blockTypes.has(b.type))
      throw new Error('지원하지 않는 본문 블록입니다.');
    if (
      b.props !== undefined &&
      (!b.props || typeof b.props !== 'object' || Array.isArray(b.props))
    )
      throw new Error('본문 속성이 올바르지 않습니다.');
    for (const [key, prop] of Object.entries(b.props ?? {})) {
      const expected = ['checked', 'showPreview', 'isToggleable'].includes(key)
        ? 'boolean'
        : ['level', 'previewWidth', 'start'].includes(key)
          ? 'number'
          : 'string';
      if (typeof prop !== expected) throw new Error('본문 속성 값이 올바르지 않습니다.');
    }
    if (b.children !== undefined) {
      if (!Array.isArray(b.children)) throw new Error('하위 본문 블록이 올바르지 않습니다.');
      b.children.forEach(block);
    }
    if (mediaTypes.has(b.type) || b.type === 'divider') return;
    if (b.type === 'table') {
      const table = b.content as { type?: string; rows?: { cells: unknown[] }[] } | undefined;
      if (
        table?.type !== 'tableContent' ||
        !Array.isArray(table.rows) ||
        !table.rows.length ||
        table.rows.length > 200
      )
        throw new Error('본문 표 구조가 올바르지 않습니다.');
      for (const row of table.rows) {
        if (!row || !Array.isArray(row.cells) || !row.cells.length || row.cells.length > 24)
          throw new Error('본문 표는 최대 24열입니다.');
        for (const cell of row.cells)
          inline(Array.isArray(cell) ? cell : (cell as { content?: unknown })?.content);
      }
    } else if (b.content !== undefined) inline(b.content);
  }
  function inline(value: unknown): void {
    if (typeof value === 'string') return;
    if (!Array.isArray(value)) throw new Error('본문 텍스트 구조가 올바르지 않습니다.');
    for (const item of value) {
      if (item?.type === 'text' && typeof item.text === 'string') {
        if (
          item.styles !== undefined &&
          (!item.styles || typeof item.styles !== 'object' || Array.isArray(item.styles))
        )
          throw new Error('텍스트 서식이 올바르지 않습니다.');
        for (const [key, style] of Object.entries(item.styles ?? {})) {
          if (
            ['bold', 'italic', 'underline', 'strike', 'code'].includes(key)
              ? typeof style !== 'boolean'
              : !['textColor', 'backgroundColor', 'fontFamily', 'fontSize'].includes(key) ||
                typeof style !== 'string'
          )
            throw new Error('지원하지 않는 텍스트 서식입니다.');
        }
      } else if (item?.type === 'link' && typeof item.href === 'string') inline(item.content);
      else throw new Error('지원하지 않는 본문 인라인 요소입니다.');
    }
  }
  visit(blocks, 0);
  blocks.forEach(block);
  return blocks as Record<string, unknown>[];
}

export const richTextSchema = z
  .string()
  .max(richTextMaxBytes)
  .superRefine((value, ctx) => {
    try {
      parseRichText(value);
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : '본문 JSON을 확인하세요.',
      });
    }
  });

export function mapRichTextUrls(value: string, replace: (url: string) => string): string {
  if (!value) return '';
  return JSON.stringify(JSON.parse(value), (key, value) =>
    (key === 'url' || key === 'href') && typeof value === 'string' ? replace(value) : value,
  );
}

export function richTextFileIds(value: string): Set<string> {
  const ids = new Set<string>();
  mapRichTextUrls(value, (url) => {
    const id = richTextFileId(url);
    if (id) ids.add(id);
    return url;
  });
  return ids;
}

export function normalizeRichText(value: string): string {
  const blocks = parseRichText(value);
  if (
    !blocks.length ||
    blocks.every(
      (b) =>
        b.type === 'paragraph' &&
        (!b.children || (b.children as unknown[]).length === 0) &&
        (!b.content ||
          (Array.isArray(b.content) && b.content.every((c) => c.type === 'text' && c.text === ''))),
    )
  )
    return '';
  return JSON.stringify(blocks);
}

export const richTextExample = JSON.stringify([
  { type: 'heading', props: { level: 2 }, content: '아이디어를 문서로 정리하세요' },
  {
    type: 'paragraph',
    content: '텍스트를 선택해 서식을 바꾸고, /를 입력해 제목·목록·표·이미지를 추가하세요.',
  },
  { type: 'checkListItem', props: { checked: false }, content: '핵심 내용을 간결하게 작성하기' },
  { type: 'checkListItem', props: { checked: false }, content: '검토할 내용과 다음 단계 정리하기' },
]);
