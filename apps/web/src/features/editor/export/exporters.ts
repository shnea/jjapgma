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
  const labelPos = node.props.labelPosition || (node.type === 'checkbox' ? 'right' : 'top');
  const isLabelRight = labelPos === 'right';

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
      return `<button type="button" class="element-button variant-${node.props.variant || 'default'}"${styleAttr}>${text}</button>`;
    case 'link':
      return `<a href="${node.props.href || '#'}"${styleAttr}>${text}</a>`;
    case 'image':
      return `<img src="${node.props.src || 'https://via.placeholder.com/400x240?text=Image'}" alt="${text}"${styleAttr} />`;
    case 'divider':
      return `<hr${styleAttr} />`;
    case 'spacer':
      return `<div class="element-spacer"${styleAttr}></div>`;
    case 'input': {
      const labelSpan = `<span class="element-field-label">${text}</span>`;
      const inputTag = `<input type="${node.props.controlType || 'text'}" placeholder="${node.props.placeholder || ''}" />`;
      return `<div class="element-field element-label-${labelPos}"${styleAttr}>${isLabelRight ? `${inputTag}${labelSpan}` : `${labelSpan}${inputTag}`}</div>`;
    }
    case 'textarea': {
      const labelSpan = `<span class="element-field-label">${text}</span>`;
      const textareaTag = `<textarea placeholder="${node.props.placeholder || ''}"></textarea>`;
      return `<div class="element-field element-label-${labelPos}"${styleAttr}>${isLabelRight ? `${textareaTag}${labelSpan}` : `${labelSpan}${textareaTag}`}</div>`;
    }
    case 'select': {
      const options = (node.props.items || '').split('\n').filter(Boolean);
      const labelSpan = `<span class="element-field-label">${text}</span>`;
      const selectTag = `<select ${node.props.multiple ? 'multiple' : ''}>${options.map((o) => `<option>${o}</option>`).join('')}</select>`;
      return `<div class="element-field element-label-${labelPos}"${styleAttr}>${isLabelRight ? `${selectTag}${labelSpan}` : `${labelSpan}${selectTag}`}</div>`;
    }
    case 'dateRange': {
      const labelSpan = `<span class="element-field-label">${text}</span>`;
      const dateControl = `<div class="element-date-range-single"><input type="text" value="2026-09-01 00:00:00.000 ~ 2026-09-15 23:59:59.999" readonly /></div>`;
      return `<div class="element-field element-label-${labelPos}"${styleAttr}>${isLabelRight ? `${dateControl}${labelSpan}` : `${labelSpan}${dateControl}`}</div>`;
    }
    case 'checkbox': {
      const labelSpan = `<span class="element-field-label">${text}</span>`;
      const checkControl = `<label class="element-checkbox-box"><input type="checkbox" /></label>`;
      return `<div class="element-field element-label-${labelPos}"${styleAttr}>${isLabelRight ? `${checkControl}${labelSpan}` : `${labelSpan}${checkControl}`}</div>`;
    }
    case 'switch': {
      const labelSpan = `<span class="element-field-label">${text}</span>`;
      const switchControl = `<label class="element-switch-track"><input type="checkbox" role="switch" /></label>`;
      return `<div class="element-field element-label-${labelPos}"${styleAttr}>${isLabelRight ? `${switchControl}${labelSpan}` : `${labelSpan}${switchControl}`}</div>`;
    }
    case 'radio': {
      const options = (node.props.items || '').split('\n').filter(Boolean);
      return `<fieldset class="element-options option-${node.props.optionDirection || 'column'}"${styleAttr}><legend>${text}</legend><div class="element-option-list">${options.map((o, idx) => `<label key="${idx}"><input type="radio" name="${node.id}" /> <span>${o}</span></label>`).join('')}</div></fieldset>`;
    }
    case 'badge':
    case 'chip':
      return `<span class="element-badge shape-${node.props.shape || 'rounded'}"${styleAttr}>${text}</span>`;
    case 'alert':
      return `<div class="element-alert state-${node.props.stateType || 'info'}"${styleAttr}><strong>${text}</strong></div>`;
    case 'progress': {
      if (node.props.shape === 'circle') {
        const val = node.props.value ?? 60;
        return `<div class="element-progress-circle"${styleAttr}><div class="progress-ring-container"><svg width="72" height="72"><circle class="progress-ring-bg" stroke-width="5" fill="transparent" r="28" cx="36" cy="36"></circle><circle class="progress-ring-indicator" stroke-width="5" stroke-dasharray="175.9" stroke-dashoffset="${175.9 * (1 - val / 100)}" stroke-linecap="round" fill="transparent" r="28" cx="36" cy="36"></circle></svg><span class="progress-ring-text">${val}%</span></div><span class="progress-label">${text || '진행률'}</span></div>`;
      }
      return `<div class="render-progress"${styleAttr}><progress value="${node.props.value ?? 60}" max="100"></progress></div>`;
    }
    case 'skeleton':
      return `<div class="element-skeleton"${styleAttr}><div class="skeleton-lines"><i style="width: 85%"></i><i style="width: 100%"></i><i style="width: 65%"></i></div></div>`;
    case 'modal':
      return `<div class="render-modal-inner"${styleAttr}><div class="modal-header-bar"><strong>${text || '모달'}</strong><span class="modal-close-btn">&times;</span></div><div class="modal-content-area">${node.children.map(renderNodeToHtml).join('\n')}</div></div>`;
    case 'dialog':
      return `<div class="render-dialog-inner"${styleAttr}><div class="dialog-header-bar"><strong>${text || '다이얼로그'}</strong><span class="modal-close-btn">&times;</span></div><div class="dialog-content-area">${node.children.map(renderNodeToHtml).join('\n')}</div><div class="dialog-footer-bar"><button type="button" class="dialog-btn secondary">취소</button><button type="button" class="dialog-btn primary">확인</button></div></div>`;
    case 'table': {
      const [header = '', ...rows] = (node.props.items || '').split('\n').filter(Boolean);
      return `<div class="element-table-scroll"${styleAttr}><table class="table"><thead><tr>${header.split('|').map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.split('|').map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="element-pagination"><button type="button" disabled>&laquo;</button><button type="button" disabled>&lsaquo;</button><button type="button" class="active">1</button><button type="button">2</button><span class="pagination-ellipsis">&hellip;</span><button type="button">&rsaquo;</button><button type="button">&raquo;</button></div></div>`;
    }
    case 'list': {
      const items = (node.props.items || '').split('\n').filter(Boolean);
      return `<ul class="element-list"${styleAttr}>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    }
    default:
      return `<div class="element-${node.type}"${styleAttr}>${text}\n${node.children.map(renderNodeToHtml).join('\n')}</div>`;
  }
}

export const commonCssBundle = `
* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif; }
body { background: #f8faf6; color: #1f2937; padding: 32px 20px; line-height: 1.5; }
.jjapgma-container { display: flex; flex-direction: column; width: 100%; }
.jjapgma-card { background: #ffffff; border: 1px solid #e2e8dc; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.jjapgma-grid { display: grid; gap: 16px; }

/* Buttons */
.element-button { display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; min-height: 38px !important; height: 38px !important; box-sizing: border-box !important; font-size: 14px !important; line-height: 1 !important; padding: 0 16px !important; border-radius: 6px; font-weight: 550; cursor: pointer; border: 1px solid transparent; background: #466e2c; color: white; transition: background 0.15s; }
.element-button:hover { background: #385a23; }
.element-button.variant-outline { background: transparent; border: 1px solid currentColor; color: #466e2c; }
.element-button.variant-ghost { background: transparent; border: none; color: #466e2c; }

/* Form Fields */
.element-field { display: flex !important; width: 100%; gap: 10px; margin-bottom: 12px; }
.element-label-top { flex-direction: column !important; align-items: stretch !important; gap: 6px; }
.element-label-left { flex-direction: row !important; align-items: center !important; gap: 10px; }
.element-label-right { flex-direction: row !important; align-items: center !important; gap: 10px; }
.element-field-label { font-size: 13px; font-weight: 550; color: #344054; white-space: nowrap; flex-shrink: 0; }
.element-label-left input, .element-label-left select, .element-label-left textarea,
.element-label-right input, .element-label-right select, .element-label-right textarea { flex: 1; min-width: 0; width: 100%; }
input, textarea, select { padding: 9px 12px; border: 1px solid #d0d5dd; border-radius: 6px; font-size: 14px; outline: none; background: #ffffff; color: #344054; }
input:focus, textarea:focus, select:focus { border-color: #466e2c; }

/* Switch */
.element-switch-track { display: inline-flex !important; align-items: center !important; cursor: pointer; user-select: none; margin: 0; flex-shrink: 0; }
.element-switch-track input[type="checkbox"] { position: relative; width: 44px; height: 24px; appearance: none; background: #cbcfca; border-radius: 99px; outline: none; cursor: pointer; transition: background-color 0.2s ease; margin: 0; flex-shrink: 0; }
.element-switch-track input[type="checkbox"]:checked { background: #466e2c; }
.element-switch-track input[type="checkbox"]::before { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; top: 3px; left: 3px; background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); transition: transform 0.2s ease; }
.element-switch-track input[type="checkbox"]:checked::before { transform: translateX(20px); }

/* Checkbox */
.element-checkbox-box { display: inline-flex !important; align-items: center !important; cursor: pointer; user-select: none; margin: 0; }
.element-checkbox-box input[type="checkbox"] { width: 18px; height: 18px; margin: 0; cursor: pointer; accent-color: #466e2c; flex-shrink: 0; }

/* Radio */
.element-options { border: none !important; padding: 0 !important; margin: 0 !important; width: 100%; }
.element-options legend { font-size: 14px; font-weight: 500; color: #344054; margin-bottom: 8px; padding: 0; display: block; }
.element-option-list { display: flex; width: 100%; }
.element-options.option-column .element-option-list { flex-direction: column; gap: 10px; }
.element-options.option-row .element-option-list { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 18px; }
.element-options label { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; color: #344054; cursor: pointer; user-select: none; }
.element-options input[type="radio"] { width: 18px; height: 18px; margin: 0; cursor: pointer; accent-color: #466e2c; flex-shrink: 0; }

/* Date Range */
.element-date-range-single { position: relative; display: flex; align-items: center; width: 100%; }
.element-date-range-single input { width: 100%; background: #ffffff; cursor: pointer; }

/* Table & Pagination */
.element-table-scroll { overflow: auto; width: 100%; }
.table { width: 100%; border-collapse: collapse; margin-top: 8px; text-align: left; }
.table th, .table td { border: 1px solid #e5e7eb; padding: 11px 14px; font-size: 13px; }
.table th { background: #f0f3ec; font-weight: 600; color: #344054; }
.element-pagination { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; user-select: none; }
.element-pagination button { min-width: 32px; height: 32px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #d0d5dd; background: #ffffff; color: #344054; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.15s; flex-shrink: 0; font-weight: 500; }
.element-pagination button:hover:not(:disabled) { background: #f2f4ef; border-color: #466e2c; color: #466e2c; }
.element-pagination button.active { background: #466e2c; color: #ffffff; border-color: #466e2c; font-weight: 600; }
.element-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-ellipsis { display: inline-flex; align-items: center; justify-content: center; padding: 0 4px; color: #98a2b3; font-size: 13px; user-select: none; }

/* List */
.element-list { list-style: none; padding: 0; margin: 0; }
.element-list li { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; }

/* Spacer */
.element-spacer { min-height: 24px; width: 100%; }

/* Badge */
.element-badge { display: inline-block; padding: 4px 10px; background: #eaf3db; color: #354f21; border-radius: 6px; font-size: 12px; font-weight: 600; }
.element-badge.shape-pill { border-radius: 99px; }

/* Alert */
.element-alert { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border: 1px solid #c3d8ac; background: #eff7e6; border-radius: 8px; color: #2b451a; font-size: 14px; }
.element-alert.state-warning { border-color: #fedf89; background: #fffaeb; color: #b54708; }
.element-alert.state-error { border-color: #fecdca; background: #fef3f2; color: #b42318; }
.element-alert.state-success { border-color: #a6f4c5; background: #edfcf2; color: #027a48; }

/* Progress */
.render-progress progress { display: block; width: 100%; height: 16px; margin-top: 12px; accent-color: #62823e; }
.element-progress-circle { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px; }
.progress-ring-container { position: relative; display: flex; align-items: center; justify-content: center; }
.progress-ring-container svg { transform: rotate(-90deg); }
.progress-ring-bg { stroke: #e6ebe0; }
.progress-ring-indicator { stroke: #567534; transition: stroke-dashoffset 0.35s ease; }
.progress-ring-text { position: absolute; font-size: 14px; font-weight: 600; color: #344054; }
.progress-label { margin-top: 8px; font-size: 13px; color: #667085; }

/* Modal & Dialog */
.render-modal-inner, .render-dialog-inner { background: #ffffff; border-radius: 10px; max-width: 520px; box-shadow: 0 16px 36px rgba(0,0,0,0.16); border: 1px solid #e2e8dc; margin: 16px auto; overflow: hidden; }
.modal-header-bar, .dialog-header-bar { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #eaecf0; background: #fafbf9; font-weight: 600; font-size: 15px; color: #101828; }
.modal-close-btn { font-size: 20px; line-height: 1; color: #667085; cursor: pointer; padding: 0 4px; border: none; background: transparent; }
.modal-content-area, .dialog-content-area { padding: 20px; }
.dialog-footer-bar { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px; border-top: 1px solid #eaecf0; background: #fafbf9; }
.dialog-btn { padding: 8px 16px; font-size: 13px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; font-weight: 550; }
.dialog-btn.secondary { border-color: #d0d5dd; background: #ffffff; color: #344054; }
.dialog-btn.primary { background: #466e2c; color: #ffffff; }

/* Skeleton */
@keyframes skeleton-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.skeleton-lines { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.skeleton-lines i { display: block; height: 16px; border-radius: 4px; background: #e2e8dc !important; background: linear-gradient(90deg, #e3ebd8 25%, #f4f8ed 50%, #e3ebd8 75%) !important; background-size: 200% 100% !important; animation: skeleton-shimmer 1.5s ease-in-out infinite !important; }
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
