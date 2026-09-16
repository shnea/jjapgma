import {
  componentTypes,
  registry,
  createNode,
  createSpec,
  createGrid,
  createTemplate,
  pageTemplates,
  validateSpec,
  type UiSpec,
  type UiNode,
} from '@jjapgma/ui-spec';
import versions from '../../../../../../package.json';
import { api, type Project } from '../../../lib/api';
import type { Page, PageSummary } from '../types';
import type { ExportAssets } from './ExportAssets';
import { createZip } from './zip';

type Entry = { id: string; title: string; spec: UiSpec; scope?: string; assets: ExportAssets };
type FileReference = { fileId: string; name: string; mimeType: string };
const json = (value: unknown) => JSON.stringify(value, null, 2);
const label = (name: string) => name.replace(/[/\\]/g, ' · ');

function componentSpec(type: (typeof componentTypes)[number]) {
  const spec = createSpec();
  const node = type === 'grid' ? createGrid() : createNode(type);
  node.id = `component-${type}`;
  if (registry[type].children && !node.children.length) {
    const count = ['carousel', 'wizard'].includes(type) ? 3 : 1;
    for (let index = 0; index < count; index++) {
      const child = createNode('container');
      const text = createNode('text');
      text.props.text = `${registry[type].name} 내용 ${index + 1}`;
      child.children.push(text);
      node.children.push(child);
    }
  }
  if (['modal', 'dialog', 'nonModal', 'drawer'].includes(type)) {
    const open = createNode('button');
    open.props.text = `${registry[type].name} 열기`;
    open.props.overlayAction = { targetId: node.id, type: 'open' };
    spec.root.children.push(open);
  }
  spec.root.children.push(node);
  return validateSpec(spec);
}

export async function createStorybookArchive(
  current: Pick<Page, 'id' | 'project_id' | 'name' | 'spec'>,
) {
  const projectId = encodeURIComponent(current.project_id);
  const project = await api<Project>(`/projects/${projectId}`);
  const pages = await api<PageSummary[]>(`/projects/${projectId}/pages`);
  if (!pages.some((page) => page.id === current.id))
    throw new Error('현재 페이지가 삭제되었습니다. 프로젝트를 다시 불러오세요.');
  const entries: Entry[] = [];
  const pacedApi = async <T>(path: string) => {
    await new Promise((resolve) => setTimeout(resolve, 60));
    return api<T>(path);
  };
  for (const page of pages) {
    const value = page.id === current.id ? current : await pacedApi<Page>(`/pages/${page.id}`);
    entries.push({
      id: `page-${page.id}`,
      title: `프로젝트/${label(project.name)}/${label(value.name)} (${page.id.slice(0, 8)})`,
      spec: validateSpec(value.spec),
      scope: `projects/${projectId}`,
      assets: {},
    });
  }
  for (const type of componentTypes)
    entries.push({
      id: `component-${type.toLowerCase()}`,
      title: `컴포넌트/${registry[type].category}/${registry[type].name} (${type})`,
      spec: componentSpec(type),
      assets: {},
    });
  for (const template of pageTemplates)
    entries.push({
      id: `template-${template.id}`,
      title: `공식 템플릿/${template.category}/${template.name}`,
      spec: createTemplate(template.id),
      assets: {},
    });
  const personal = await api<{ id: string; name: string }[]>('/templates');
  for (const item of personal) {
    const template = await pacedApi<{ spec: UiSpec }>(`/templates/${item.id}`);
    entries.push({
      id: `personal-${item.id}`,
      title: `개인 템플릿/${label(item.name)} (${item.id.slice(0, 8)})`,
      spec: validateSpec(template.spec),
      scope: `templates/${item.id}`,
      assets: {},
    });
  }

  const files: Record<string, string | Uint8Array> = {};
  for (const filename of ['renderer.js', 'styles.css']) {
    const response = await fetch(`/export/storybook/${filename}`, { cache: 'no-cache' });
    if (
      !response.ok ||
      !(filename.endsWith('.js') ? /javascript/ : /text\/css/).test(
        response.headers.get('content-type') ?? '',
      )
    )
      throw new Error('Storybook 렌더러를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.');
    files[`renderer/${filename}`] = await response.text();
  }
  const downloaded = new Map<string, string>();
  const imageList: { name: string; src: string }[] = [];
  let totalBytes = 0;
  async function asset(url: string, name: string, expectedMime?: string) {
    if (downloaded.has(url)) return downloaded.get(url)!;
    const resolved = new URL(url, location.origin);
    if (!['http:', 'https:'].includes(resolved.protocol) || resolved.username || resolved.password)
      throw new Error(`${name}: 내보낼 수 없는 이미지 주소입니다.`);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const response = await fetch(resolved.href, {
      credentials: resolved.origin === location.origin ? 'same-origin' : 'omit',
      signal: AbortSignal.timeout(20000),
    });
    const mime = expectedMime ?? response.headers.get('content-type')?.split(';')[0] ?? '';
    if (!response.ok || (!expectedMime && !mime.startsWith('image/')))
      throw new Error(
        `${name}: 파일을 가져오지 못했습니다. 접근 권한 또는 외부 이미지의 CORS 설정을 확인하세요.`,
      );
    const reader = response.body?.getReader();
    if (!reader) throw new Error(`${name}: 파일 본문이 없습니다.`);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        totalBytes += value.length;
        if (totalBytes > 250 * 1024 * 1024)
          throw new Error('내보낼 파일 합계가 250 MB를 초과했습니다. 이미지 크기를 줄여 주세요.');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const extension =
      (
        {
          'image/svg+xml': 'svg',
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'application/pdf': 'pdf',
          'text/plain': 'txt',
          'text/csv': 'csv',
          'application/json': 'json',
        } as Record<string, string>
      )[mime] ?? 'bin';
    const path = `assets/file-${downloaded.size + 1}.${extension}`;
    files[`public/${path}`] = bytes;
    downloaded.set(url, `./${path}`);
    if (mime.startsWith('image/')) imageList.push({ name, src: `./${path}` });
    return `./${path}`;
  }
  const projectFiles = await api<FileReference[]>(`/projects/${projectId}/files`);
  for (const file of projectFiles.filter((file) => file.mimeType.startsWith('image/')))
    await asset(
      `/api/projects/${projectId}/files/${encodeURIComponent(file.fileId)}/content`,
      file.name,
      file.mimeType,
    );
  for (const entry of entries) {
    const queue: UiNode[] = [entry.spec.root];
    while (queue.length) {
      const node = queue.pop()!;
      queue.push(...node.children);
      if (node.props.attachment) {
        const file = node.props.attachment;
        if (!entry.scope) throw new Error(`${file.name}: 파일의 소속을 확인할 수 없습니다.`);
        const src = await asset(
          `/api/${entry.scope}/files/${encodeURIComponent(file.fileId)}/content`,
          file.name,
          file.mimeType,
        );
        entry.assets[node.id] = { src, download: src };
      } else if (node.type === 'image' && node.props.src) {
        entry.assets[node.id] = { src: await asset(node.props.src, node.name) };
      }
      if (node.props.table)
        for (const column of node.props.table.columns.filter((column) => column.type === 'image')) {
          for (const row of node.props.table.rows) {
            const source = row.cells[column.id];
            if (source)
              entry.assets[`${node.id}:${row.id}:${column.id}`] = {
                src: await asset(source, column.title),
              };
          }
        }
    }
    files[`src/data/${entry.id}.json`] = json({ spec: entry.spec, assets: entry.assets });
    files[`src/${entry.id}.stories.jsx`] = `import { Screen } from '../renderer/renderer.js';
import data from './data/${entry.id}.json';
export default { id: ${json(entry.id)}, title: ${json(entry.title)}, component: Screen,
  parameters: { layout: 'fullscreen' }, args: { ...data, device: 'desktop' },
  argTypes: { device: { control: 'select', options: ['desktop', 'tablet', 'mobile'] }, spec: { control: 'object' }, assets: { control: false } } };
export const Desktop = {};
export const Tablet = { args: { device: 'tablet' } };
export const Mobile = { args: { device: 'mobile' } };
`;
  }
  files['src/images.json'] = json(imageList);
  files['src/images.stories.jsx'] = `import React from 'react';
import images from './images.json';
function Images() { return <main style={{padding:24}}><h1>프로젝트와 템플릿 이미지</h1><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:24}}>{images.map((image) => <figure key={image.src}><img src={image.src} alt={image.name} style={{width:'100%',height:160,objectFit:'contain'}}/><figcaption>{image.name}</figcaption><a href={image.src} download>이미지 다운로드</a></figure>)}</div></main>; }
export default { id: 'export-images', title: '이미지/전체 이미지', component: Images };
export const All = {};
`;
  files['.storybook/main.js'] =
    `export default { stories: ['../src/**/*.stories.jsx'], framework: '@storybook/react-vite', addons: [], staticDirs: ['../public'], core: { disableTelemetry: true } };`;
  files['.storybook/preview.js'] = `import '../renderer/styles.css';
export default { parameters: { layout: 'fullscreen', options: { storySort: { order: ['프로젝트', '컴포넌트', '공식 템플릿', '개인 템플릿', '이미지'] } } } };`;
  files['package.json'] = json({
    name: 'jjapgma-storybook-export',
    private: true,
    version: '1.0.0',
    type: 'module',
    engines: versions.engines,
    scripts: { storybook: 'storybook dev -p 6006', 'build-storybook': 'storybook build' },
    dependencies: {
      react: versions.dependencies.react,
      'react-dom': versions.dependencies['react-dom'],
    },
    devDependencies: {
      storybook: versions.devDependencies.storybook,
      '@storybook/react-vite': versions.devDependencies['@storybook/react-vite'],
      vite: versions.devDependencies.vite,
    },
  });
  files['manifest.json'] = json({
    project: { id: current.project_id, name: project.name },
    pages: pages.length,
    components: componentTypes.length,
    officialTemplates: pageTemplates.length,
    personalTemplates: personal.length,
    images: imageList.length,
    stories: entries.map(({ id, title }) => ({ id, title })),
  });
  files['README.md'] =
    `# 짭그마 Storybook\n\nNode.js 24에서 npm install 후 npm run storybook을 실행하고 http://localhost:6006 을 여세요. npm run build-storybook으로 정적 사이트를 만듭니다.\n\n프로젝트 ${pages.length}개 페이지, 전체 ${componentTypes.length}종 컴포넌트, 공식 ${pageTemplates.length}개와 개인 ${personal.length}개 템플릿, 이미지 ${imageList.length}개를 포함합니다. 현재 페이지는 내보내기를 누른 시점의 미저장 편집도 포함하며 나머지는 저장된 화면입니다.\n\n각 화면에는 Desktop/Tablet/Mobile Story가 있고 Controls의 spec을 수정해 배치를 시험할 수 있습니다. src/data는 편집 가능한 명세, renderer는 편집기와 동일한 실제 렌더러와 CSS, public/assets는 복사한 파일입니다. 이미지 목록에서 원본을 내려받을 수 있습니다. 실행 시 짭그마 로그인이나 파일 서비스 연결이 필요하지 않습니다.\n\n입력·메뉴·캐러셀·차트 등 미리보기 동작을 제공합니다. 로그인·결제·AI·업로드·DB 저장 등 업무 API는 자동 연결되지 않습니다. 별도 API를 연결해야 합니다.\n`;
  return createZip(files);
}
