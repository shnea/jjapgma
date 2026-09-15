import type { UiNode, UiSpec } from '@jjapgma/ui-spec';

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
      return `<button type="button" class="btn btn-${node.props.variant || 'default'}"${styleAttr}>${text}</button>`;
    case 'link':
      return `<a href="${node.props.href || '#'}"${styleAttr}>${text}</a>`;
    case 'image':
      return `<img src="${node.props.src || '/placeholder.svg'}" alt="${text}"${styleAttr} />`;
    case 'divider':
      return `<hr${styleAttr} />`;
    case 'spacer':
      return `<div class="spacer"${styleAttr}></div>`;
    case 'input':
      return `<div class="form-group"${styleAttr}><label>${text}</label><input type="${node.props.controlType || 'text'}" placeholder="${node.props.placeholder || ''}" /></div>`;
    case 'textarea':
      return `<div class="form-group"${styleAttr}><label>${text}</label><textarea placeholder="${node.props.placeholder || ''}"></textarea></div>`;
    case 'select': {
      const options = (node.props.items || '').split('\n').filter(Boolean);
      return `<div class="form-group"${styleAttr}><label>${text}</label><select ${node.props.multiple ? 'multiple' : ''}>${options.map((o) => `<option>${o}</option>`).join('')}</select></div>`;
    }
    case 'checkbox':
      return `<label class="checkbox-inline"${styleAttr}><input type="checkbox" /> <span>${text}</span></label>`;
    case 'switch':
      return `<label class="switch-inline"${styleAttr}><input type="checkbox" role="switch" /> <span>${text}</span></label>`;
    case 'table': {
      const [header = '', ...rows] = (node.props.items || '').split('\n').filter(Boolean);
      return `<table class="table"${styleAttr}><thead><tr>${header.split('|').map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.split('|').map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    case 'list': {
      const items = (node.props.items || '').split('\n').filter(Boolean);
      return `<ul class="list"${styleAttr}>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    }
    default:
      return `<div class="element-${node.type}"${styleAttr}>${text}</div>`;
  }
}

export function exportToHtml(pageName: string, spec: UiSpec) {
  const content = renderNodeToHtml(spec.root);
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageName.trim() || '짭그마 내보내기'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif; }
    body { background: #f8faf6; color: #1f2937; padding: 32px 16px; line-height: 1.5; }
    .jjapgma-container { display: flex; }
    .jjapgma-card { background: #ffffff; border: 1px solid #e2e8dc; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .jjapgma-grid { display: grid; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 14px; cursor: pointer; border: 1px solid transparent; background: #466e2c; color: white; }
    .btn-outline { background: transparent; border-color: #466e2c; color: #466e2c; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #374151; }
    input, textarea, select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; }
    .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .table th, .table td { border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px; text-align: left; }
    .table th { background: #f9fafb; font-weight: 600; }
    .list { padding-left: 20px; }
    .list li { margin-bottom: 6px; }
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
  const componentName = (pageName.replace(/[^a-zA-Z0-9]/g, '') || 'Page') + 'View';
  const storybookCode = `// Generated by Jjapgma UI Builder
import type { Meta, StoryObj } from '@storybook/react';

// Spec definition
const spec = ${JSON.stringify(spec, null, 2)};

export function ${componentName}() {
  return (
    <div style={{ padding: 32, background: '#f8faf6', minHeight: '100vh' }}>
      <header style={{ marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>${pageName}</h1>
        <p style={{ color: '#6b7280', fontSize: 13 }}>Generated Storybook Page</p>
      </header>
      <pre style={{ background: '#ffffff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'auto' }}>
        <code>{JSON.stringify(spec, null, 2)}</code>
      </pre>
    </div>
  );
}

const meta: Meta<typeof ${componentName}> = {
  title: 'Pages/${pageName}',
  component: ${componentName},
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ${componentName}>;

export const Default: Story = {};
`;

  const blob = new Blob([storybookCode], { type: 'text/typescript;charset=utf-8' });
  downloadBlob(blob, `${pageName.trim() || 'Page'}.stories.tsx`);
}
