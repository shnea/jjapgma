import type { UiNode, UiSpec } from '@jjapgma/ui-spec';
import { createZip } from './zip';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToJson(pageName: string, spec: UiSpec) {
  const json = JSON.stringify(spec, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${pageName.trim() || 'page'}.json`);
}

function renderNodeToHtml(node: UiNode): string {
  const styleStr = Object.entries(node.style || {})
    .filter(([k, v]) => v !== undefined && k !== 'hidden')
    .map(([k, v]) => {
      const kebab = k.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebab}:${typeof v === 'number' ? `${v}px` : v}`;
    })
    .join(';');

  const styleAttr = styleStr ? ` style="${styleStr}"` : '';
  const text = node.props.text || '';

  switch (node.type) {
    case 'container':
    case 'card':
      return `<div class="jjapgma-${node.type}"${styleAttr}>\n${node.children.map(renderNodeToHtml).join('\n')}\n</div>`;
    case 'grid':
      return `<div class="jjapgma-grid"${styleAttr}>\n${node.children.map(renderNodeToHtml).join('\n')}\n</div>`;
    case 'heading': {
      const tag = node.props.titleLevel || 'h2';
      return `<${tag}${styleAttr}>${text}</${tag}>`;
    }
    case 'text':
      return `<p${styleAttr}>${text}</p>`;
    case 'button':
      return `<button type="button" class="element-button btn-${node.props.variant || 'default'}"${styleAttr}>${text}</button>`;
    case 'link':
      return `<a href="${node.props.href || '#'}"${styleAttr}>${text}</a>`;
    case 'image':
      return `<img src="${node.props.src || 'https://via.placeholder.com/400x240?text=Image'}" alt="${text}"${styleAttr} />`;
    case 'divider':
      return `<hr${styleAttr} />`;
    case 'spacer':
      return `<div class="element-spacer"${styleAttr}></div>`;
    case 'input':
      return `<div class="element-field element-label-${node.props.labelPosition || 'top'}"${styleAttr}><span class="element-field-label">${text}</span><input type="${node.props.controlType || 'text'}" placeholder="${node.props.placeholder || ''}" /></div>`;
    case 'textarea':
      return `<div class="element-field element-label-${node.props.labelPosition || 'top'}"${styleAttr}><span class="element-field-label">${text}</span><textarea placeholder="${node.props.placeholder || ''}"></textarea></div>`;
    case 'select': {
      const options = (node.props.items || '').split('\n').filter(Boolean);
      return `<div class="element-field element-label-${node.props.labelPosition || 'top'}"${styleAttr}><span class="element-field-label">${text}</span><select ${node.props.multiple ? 'multiple' : ''}>${options.map((o) => `<option>${o}</option>`).join('')}</select></div>`;
    }
    case 'dateRange':
      return `<div class="element-field element-label-${node.props.labelPosition || 'top'}"${styleAttr}><span class="element-field-label">${text}</span><input type="text" value="2026-09-01 ~ 2026-09-15" readonly /></div>`;
    case 'checkbox':
      return `<div class="element-field element-label-${node.props.labelPosition || 'top'}"${styleAttr}><span class="element-field-label">${text}</span><input type="checkbox" /></div>`;
    case 'switch':
      return `<div class="element-field element-label-${node.props.labelPosition || 'top'}"${styleAttr}><span class="element-field-label">${text}</span><input type="checkbox" role="switch" /></div>`;
    case 'badge':
    case 'chip':
      return `<span class="element-badge shape-${node.props.shape || 'rounded'}"${styleAttr}>${text}</span>`;
    case 'alert':
      return `<div class="element-alert state-${node.props.stateType || 'info'}"${styleAttr}><strong>${text}</strong></div>`;
    case 'progress':
      return `<div class="render-progress"${styleAttr}><progress value="${node.props.value ?? 60}" max="100"></progress></div>`;
    case 'skeleton':
      return `<div class="element-skeleton skeleton-shimmer"${styleAttr}><div class="skeleton-lines"><i></i><i></i><i></i></div></div>`;
    case 'modal':
      return `<div class="render-modal-inner"${styleAttr}><div class="modal-header-bar"><strong>${text || '모달'}</strong></div><div class="modal-content-area">${node.children.map(renderNodeToHtml).join('\n')}</div></div>`;
    case 'dialog':
      return `<div class="render-dialog-inner"${styleAttr}><div class="dialog-header-bar"><strong>${text || '다이얼로그'}</strong></div><div class="dialog-content-area">${node.children.map(renderNodeToHtml).join('\n')}</div><div class="dialog-footer-bar"><button type="button" class="dialog-btn secondary">취소</button><button type="button" class="dialog-btn primary">확인</button></div></div>`;
    case 'table': {
      const [header = '', ...rows] = (node.props.items || '').split('\n').filter(Boolean);
      return `<div class="element-table-scroll"${styleAttr}><table class="table"><thead><tr>${header.split('|').map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.split('|').map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    case 'list': {
      const items = (node.props.items || '').split('\n').filter(Boolean);
      return `<ul class="element-list"${styleAttr}>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    }
    default:
      return `<div class="element-${node.type}"${styleAttr}>${text}\n${node.children.map(renderNodeToHtml).join('\n')}</div>`;
  }
}

const commonCssBundle = `
* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif; }
body { background: #f8faf6; color: #1f2937; padding: 32px 16px; line-height: 1.5; }
.jjapgma-container { display: flex; flex-direction: column; width: 100%; }
.jjapgma-card { background: #ffffff; border: 1px solid #e2e8dc; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.jjapgma-grid { display: grid; gap: 16px; }
.element-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 38px; height: 38px; padding: 0 16px; border-radius: 6px; font-weight: 550; font-size: 14px; cursor: pointer; border: 1px solid transparent; background: #466e2c; color: white; transition: background 0.15s; }
.element-button:hover { background: #395c23; }
.element-field { display: flex; width: 100%; gap: 10px; margin-bottom: 12px; }
.element-label-top { flex-direction: column; align-items: stretch; gap: 6px; }
.element-label-left { flex-direction: row; align-items: center; gap: 10px; }
.element-label-right { flex-direction: row; align-items: center; gap: 10px; }
.element-field-label { font-size: 13px; font-weight: 550; color: #374151; white-space: nowrap; }
.element-label-left input, .element-label-left select, .element-label-left textarea,
.element-label-right input, .element-label-right select, .element-label-right textarea { flex: 1; min-width: 0; width: 100%; }
input, textarea, select { padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; background: #ffffff; }
input:focus, textarea:focus, select:focus { border-color: #466e2c; }
.element-table-scroll { overflow: auto; width: 100%; }
.table { width: 100%; border-collapse: collapse; margin-top: 8px; text-align: left; }
.table th, .table td { border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px; }
.table th { background: #f0f3ec; font-weight: 600; color: #374151; }
.element-list { list-style: none; padding: 0; margin: 0; }
.element-list li { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; }
.element-spacer { min-height: 24px; width: 100%; }
.element-badge { display: inline-block; padding: 4px 10px; background: #eaf3db; color: #354f21; border-radius: 6px; font-size: 12px; font-weight: 600; }
.element-badge.shape-pill { border-radius: 99px; }
.element-alert { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border: 1px solid #c3d8ac; background: #eff7e6; border-radius: 8px; color: #2b451a; font-size: 14px; }
.render-modal-inner, .render-dialog-inner { background: #ffffff; border-radius: 10px; max-width: 520px; box-shadow: 0 16px 36px rgba(0,0,0,0.16); border: 1px solid #e2e8dc; margin: 16px auto; overflow: hidden; }
.modal-header-bar, .dialog-header-bar { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #eaecf0; background: #fafbf9; font-weight: 600; }
.modal-content-area, .dialog-content-area { padding: 20px; }
.dialog-footer-bar { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px; border-top: 1px solid #eaecf0; background: #fafbf9; }
.dialog-btn { padding: 8px 16px; font-size: 13px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; font-weight: 550; }
.dialog-btn.secondary { border-color: #d0d5dd; background: #ffffff; color: #344054; }
.dialog-btn.primary { background: #466e2c; color: #ffffff; }
@keyframes skeleton-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.skeleton-shimmer { background: linear-gradient(90deg, #ecefe7 25%, #f7f9f4 50%, #ecefe7 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.6s ease-in-out infinite; }
.skeleton-lines { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.skeleton-lines i { display: block; height: 16px; border-radius: 4px; background: rgba(0,0,0,0.06); }
.skeleton-lines i:first-child { width: 85%; }
.skeleton-lines i:nth-child(2) { width: 100%; }
.skeleton-lines i:last-child { width: 65%; }
`;

export function exportToHtml(pageName: string, spec: UiSpec) {
  const content = renderNodeToHtml(spec.root);
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageName.trim() || '짭그마 화면 내보내기'}</title>
  <style>
${commonCssBundle}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, `${pageName.trim() || 'page'}.html`);
}

export function exportToStorybook(pageName: string, spec: UiSpec) {
  const safeName = (pageName.replace(/[^a-zA-Z0-9]/g, '') || 'Page') + 'View';
  const title = pageName.trim() || 'Untitled Page';

  const packageJson = JSON.stringify(
    {
      name: 'jjapgma-storybook-export',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        storybook: 'storybook dev -p 6006',
        'build-storybook': 'storybook build',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^0.473.0',
      },
      devDependencies: {
        '@storybook/react': '^8.4.7',
        '@storybook/react-vite': '^8.4.7',
        '@vitejs/plugin-react': '^4.3.4',
        storybook: '^8.4.7',
        typescript: '^5.7.3',
        vite: '^6.0.7',
      },
    },
    null,
    2,
  );

  const mainTs = `import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};
export default config;
`;

  const previewTs = `import type { Preview } from '@storybook/react';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};
export default preview;
`;

  const componentCode = `// Generated by Jjapgma UI Builder
import React from 'react';

export const specData = ${JSON.stringify(spec, null, 2)};

export function ${safeName}() {
  return (
    <div className="jjapgma-container" style={{ padding: 32, minHeight: '100vh', background: '#f8faf6' }}>
      <header style={{ marginBottom: 24, borderBottom: '1px solid #e2e8dc', paddingBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#24452d' }}>${title}</h1>
        <p style={{ color: '#667085', fontSize: 13, marginTop: 4 }}>Storybook Standalone Package (Port 6006)</p>
      </header>
      <div className="jjapgma-card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>스펙 요약</h3>
        <p style={{ fontSize: 14, color: '#475467' }}>
          루트 요소: <strong>{specData.root.type}</strong> ({specData.root.children.length}개 하위 요소)
        </p>
      </div>
      <div className="jjapgma-card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>UI Spec 원본 데이터</h3>
        <pre style={{ background: '#f2f4ef', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
          <code>{JSON.stringify(specData, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
`;

  const storyCode = `import type { Meta, StoryObj } from '@storybook/react';
import { ${safeName} } from './${safeName}';

const meta: Meta<typeof ${safeName}> = {
  title: 'Pages/${title}',
  component: ${safeName},
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ${safeName}>;

export const Default: Story = {};
`;

  const readmeMd = `# ${title} - Storybook 독립 실행 패키지

짭그마(Jjapgma) UI 빌더에서 생성된 Storybook 독립 프로젝트입니다.

## 실행 방법

\`\`\`bash
# 1. 의존성 설치
npm install

# 2. 스토리북 실행 (기본 포트: 6006)
npm run storybook
\`\`\`

웹 브라우저에서 [http://localhost:6006](http://localhost:6006) 으로 접속하여 확인하세요.
`;

  const zipData = createZip({
    'package.json': packageJson,
    '.storybook/main.ts': mainTs,
    '.storybook/preview.ts': previewTs,
    'src/styles.css': commonCssBundle,
    [`src/${safeName}.tsx`]: componentCode,
    [`src/${safeName}.stories.tsx`]: storyCode,
    'README.md': readmeMd,
  });

  const blob = new Blob([zipData], { type: 'application/zip' });
  downloadBlob(blob, `${pageName.trim() || 'storybook-project'}.zip`);
}
