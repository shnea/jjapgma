import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createNode, createTemplate, type UiNode } from '@jjapgma/ui-spec';
import { NodeRenderer } from '../NodeRenderer';
import { Inspector } from '../Inspector';
import { RichTextIntegrationContext } from '../export/RichTextIntegration';

function RuntimeEditor() {
  const [node] = useState(() => createNode('richText'));
  const [document, setDocument] = useState('');
  return (
    <RichTextIntegrationContext.Provider
      value={{
        onChange: (_id, value) => setDocument(value),
        async uploadFile(_id, body) {
          const response = await fetch('/api/editor-files', { method: 'POST', body });
          if (!response.ok) throw new Error('파일 업로드 연결이 필요합니다.');
          return (await response.json()).previewUrl;
        },
      }}
    >
      <NodeRenderer node={node} breakpoint="desktop" preview />
      <p>소비 서비스의 업로드 API 연결 예시입니다. 파일만 전송하고 category는 생략합니다.</p>
      <output aria-label="서비스 본문 상태">{document}</output>
    </RichTextIntegrationContext.Provider>
  );
}

function Editing() {
  const [node, setNode] = useState<UiNode>(() => createNode('richText'));
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, padding: 24 }}
    >
      <NodeRenderer node={node} breakpoint="desktop" />
      <Inspector
        node={node}
        breakpoint="desktop"
        disabled={false}
        root={false}
        onUpdate={(change) =>
          setNode((value) => {
            const next = structuredClone(value);
            change(next);
            return next;
          })
        }
        onDelete={() => {}}
        onDuplicate={() => {}}
        onReorder={() => {}}
      />
    </div>
  );
}
const meta = {
  title: '빌더/서식 편집기',
  parameters: { layout: 'fullscreen' },
  component: NodeRenderer,
  args: { node: createNode('richText'), breakpoint: 'desktop', preview: true },
  decorators: [
    (Story) => (
      <div style={{ padding: 20, maxWidth: 980, margin: 'auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NodeRenderer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editor: Story = {};
export const BottomEditor: Story = {
  render: (args) => (
    <div style={{ paddingTop: 'max(0px, calc(100dvh - 240px))' }}>
      <NodeRenderer {...args} />
    </div>
  ),
};
export const Runtime: Story = { render: () => <RuntimeEditor /> };
export const ImageControls: Story = {
  args: {
    node: {
      ...createNode('richText'),
      props: {
        ...createNode('richText').props,
        documentJson: JSON.stringify([
          {
            type: 'image',
            props: {
              url: new URL('/placeholder.svg', location.href).href,
              name: '미리보기 이미지',
            },
          },
          { type: 'paragraph', content: '이미지를 눌러 크기를 조절하세요.' },
        ]),
      },
    },
  },
};
export const Viewer: Story = { args: { node: createTemplate('notice-document').root, root: true } };
export const Empty: Story = {
  args: {
    node: {
      ...createNode('richText'),
      props: { text: '빈 본문', documentJson: '', richTextMode: 'viewer' },
    },
  },
};
export const Disabled: Story = {
  args: {
    node: { ...createNode('richText'), props: { ...createNode('richText').props, disabled: true } },
  },
};
export const Design: Story = { render: () => <Editing /> };
