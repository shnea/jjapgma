import { validateSpec, type UiSpec, type UiNode, type TableData } from '@jjapgma/ui-spec';
import { api } from '../../../lib/api';
import type { ExportAssets } from './ExportAssets';
import { createZip } from './zip';
import richTextGuide from '../../../../../../docs/RICH_TEXT_RUNTIME.md?raw';

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export async function createHtmlArchive(pageName: string, input: UiSpec, projectId: string) {
  const spec = validateSpec(input);
  const files: Record<string, string | Uint8Array> = {};
  const assets: ExportAssets = {};
  const richFiles = new Map<string, string>();
  let richBytes = 0;
  await Promise.all(
    ['runtime.js', 'styles.css'].map(async (filename) => {
      const response = await fetch('/export/' + filename, { cache: 'no-cache' });
      const expected = filename.endsWith('.js') ? /javascript/ : /text\/css/;
      if (!response.ok || !expected.test(response.headers.get('content-type') ?? ''))
        throw new Error('내보내기 파일을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.');
      files[filename] = await response.text();
    }),
  );
  const queue: UiNode[] = [spec.root];
  while (queue.length) {
    const node = queue.pop()!;
    queue.push(...node.children);
    for (const file of node.props.richTextFiles ?? []) {
      const key = `${node.id}:file:${file.fileId}`;
      const existing = richFiles.get(file.fileId);
      if (existing) {
        assets[key] = { src: existing, download: existing };
        continue;
      }
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(file.fileId)}/content`,
        { signal: AbortSignal.timeout(20000) },
      );
      if (!response.ok)
        throw new Error(
          `${file.name}: 본문 첨부파일을 내보낼 수 없습니다. 만료 여부와 권한을 확인하세요.`,
        );
      const extension =
        file.name
          .split('.')
          .pop()
          ?.replace(/[^a-z0-9]/gi, '') || 'bin';
      const filename = `assets/rich-${node.id}-${file.fileId}.${extension}`;
      const bytes = new Uint8Array(await response.arrayBuffer());
      richBytes += bytes.length;
      if (richBytes > 250 * 1024 * 1024)
        throw new Error('본문 첨부파일 합계가 250 MB를 초과했습니다. 파일 크기를 줄여 주세요.');
      files[filename] = bytes;
      richFiles.set(file.fileId, filename);
      assets[key] = { src: filename, download: filename };
    }
    if (node.type === 'table' && node.props.table) {
      const table: TableData = node.props.table;
      for (const column of table.columns.filter((column) => column.type === 'image')) {
        for (const row of table.rows) {
          const src: string | undefined = row.cells[column.id];
          if (!src || !/^\/(?!\/)[^\\\s]*$/.test(src)) continue;
          const response: Response = await fetch(src);
          if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
            throw new Error(`${node.name}의 ${column.title} 이미지를 내보낼 수 없습니다.`);
          const extension: string = response.headers
            .get('content-type')!
            .split('/')[1]
            .split(/[;+]/)[0]
            .replace(/[^a-z0-9]/gi, '');
          const filename = `assets/table-${Object.keys(assets).length}.${extension}`;
          files[filename] = new Uint8Array(await response.arrayBuffer());
          assets[`${node.id}:${row.id}:${column.id}`] = { src: filename };
        }
      }
    }
    if (node.props.attachment) {
      const file = node.props.attachment;
      const result = await api<{ ready: boolean; previewUrl: string }>(
        `/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(file.fileId)}/preview`,
      );
      if (!result.ready)
        throw new Error(file.name + ' 미리보기가 준비 중입니다. 잠시 후 다시 내보내세요.');
      const url = new URL(result.previewUrl);
      if (!['http:', 'https:'].includes(url.protocol))
        throw new Error('첨부파일 주소가 올바르지 않습니다.');
      assets[node.id] = {
        src: url.href,
        download: url.href.replace('/files/preview/', '/files/download/'),
      };
    } else if (node.type === 'image' && node.props.src) {
      const response = await fetch(node.props.src);
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
        throw new Error(node.name + ' 이미지를 내보낼 수 없습니다. 이미지 경로를 확인하세요.');
      const ext = response.headers
        .get('content-type')!
        .split('/')[1]
        .split(/[;+]/)[0]
        .replace(/[^a-z0-9]/gi, '');
      const filename = `assets/${node.id}.${ext}`;
      files[filename] = new Uint8Array(await response.arrayBuffer());
      assets[node.id] = { src: filename };
    }
  }
  const data = JSON.stringify({ spec, assets }).replace(/</g, '\\u003c');
  files['index.html'] = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(pageName)}</title><link rel="stylesheet" href="./styles.css"></head>
<body><div id="root"></div><noscript>이 화면을 사용하려면 JavaScript를 활성화하세요.</noscript>
<script id="jjapgma-spec" type="application/json">${data}</script><script defer src="./runtime.js"></script></body></html>`;
  files['spec.json'] = JSON.stringify(spec, null, 2);
  files['README.txt'] =
    '압축을 풀고 index.html을 여세요. index.html, styles.css, runtime.js, assets 폴더를 함께 보관하세요.\n' +
    '편집기와 같은 렌더러로 폼, 달력, 탭, 페이지 탐색, 사용자 CSS, 반응형 설정을 실행합니다.\n' +
    '모바일: 768px 미만 / 태블릿: 768–1023px / 데스크톱: 1024px 이상.\n' +
    '첨부파일은 기존 공개 외부 서비스 주소를 참조하므로 인터넷과 유효한 파일이 필요합니다.\n' +
    '서식 편집기의 업로드 첨부는 assets에 포함합니다. 직접 입력한 외부 URL은 원래 주소를 유지합니다.\n' +
    '업로드, 로그인, DB 저장, API 연동은 별도 서버 연결이 필요합니다. 입력 값은 페이지를 닫으면 초기화됩니다.\n';
  files['README.txt'] +=
    '서식 편집기의 실제 서비스 연결과 default 업로드 정책은 RICH_TEXT.md를 참고하세요.\n';
  files['RICH_TEXT.md'] = richTextGuide;
  return createZip(files);
}
