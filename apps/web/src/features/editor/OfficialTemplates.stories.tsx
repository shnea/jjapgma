import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  createTemplate,
  createNode,
  createGrid,
  resizeGrid,
  pageTemplates,
  type Breakpoint,
} from '@jjapgma/ui-spec';
import { NodeRenderer } from './NodeRenderer';
import { ContentFields } from './controls/ContentFields';
function Gallery() {
  const [template, setTemplate] = useState('pricing');
  const [device, setDevice] = useState<Breakpoint>('desktop');
  const [editing, setEditing] = useState(false);
  const spec = useMemo(() => createTemplate(template), [template]);
  return (
    <main>
      <div style={{ display: 'flex', gap: 16, padding: 16, flexWrap: 'wrap' }}>
        <label>
          <input
            type="checkbox"
            checked={editing}
            onChange={(event) => setEditing(event.target.checked)}
          />
          편집 모드
        </label>
        <label>
          화면 선택
          <select value={template} onChange={(event) => setTemplate(event.target.value)}>
            {pageTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.category} · {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          화면 크기
          <select value={device} onChange={(event) => setDevice(event.target.value as Breakpoint)}>
            <option value="desktop">데스크톱</option>
            <option value="tablet">태블릿</option>
            <option value="mobile">모바일</option>
          </select>
        </label>
      </div>
      <div
        className="official-template-preview"
        style={{
          width: device === 'mobile' ? 375 : device === 'tablet' ? 768 : '100%',
          maxWidth: '100%',
          margin: 'auto',
        }}
      >
        <NodeRenderer
          key={`${template}-${device}`}
          node={spec.root}
          theme={spec.theme}
          breakpoint={device}
          preview={!editing}
          root
        />
      </div>
    </main>
  );
}
function ChartEditor() {
  const [node, setNode] = useState(() => createNode('chart'));
  return (
    <main
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, padding: 24 }}
    >
      <NodeRenderer node={node} preview breakpoint="desktop" />
      <aside className="inspector">
        <fieldset>
          <ContentFields
            node={node}
            onUpdate={(action) =>
              setNode((old) => {
                const next = structuredClone(old);
                action(next);
                return next;
              })
            }
          />
        </fieldset>
      </aside>
    </main>
  );
}
const meta = {
  title: '템플릿/공식 화면',
  component: Gallery,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Gallery>;
export default meta;
export const GalleryStory: StoryObj = { name: 'Gallery', render: () => <Gallery /> };
export const Charts: StoryObj = { render: () => <ChartEditor /> };
function GridEditor() {
  const [node, setNode] = useState(createGrid);
  const [preview, setPreview] = useState(false);
  return (
    <main style={{ padding: 56 }}>
      <label>
        <input
          type="checkbox"
          checked={preview}
          onChange={(event) => setPreview(event.target.checked)}
        />
        그리드 미리보기
      </label>
      <div style={{ marginTop: 56 }}>
        <NodeRenderer
          node={node}
          selectedId={node.id}
          breakpoint="desktop"
          preview={preview}
          onGridResize={(_id, columns, rows) =>
            setNode((old) => {
              const copy = structuredClone(old);
              resizeGrid(copy, columns, rows);
              return copy;
            })
          }
        />
      </div>
    </main>
  );
}
export const Grid: StoryObj = { render: () => <GridEditor /> };
