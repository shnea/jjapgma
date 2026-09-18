import type { Meta, StoryObj } from '@storybook/react-vite';
import { componentTypes, createNode, registry, themePresets } from '@jjapgma/ui-spec';
import { NodeRenderer } from './NodeRenderer';
const examples = componentTypes.map((type) => {
  const node = createNode(type);
  node.id = `catalog-${type}`;
  if (registry[type].children) {
    const child = createNode('text');
    child.id = `${node.id}-child`;
    child.props.text = '안에 배치한 텍스트';
    node.children.push(child);
  }
  return node;
});
function Catalog({ themed = false }: { themed?: boolean }) {
  return (
    <div
      style={{
        padding: 24,
        display: 'grid',
        gap: 24,
        alignItems: 'start',
        background: '#f5f7f6',
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))',
      }}
    >
      {examples.map((node) => (
        <section
          key={node.id}
          data-catalog-type={node.type}
          style={{
            background: '#fff',
            border: '1px solid #dfe5e1',
            borderRadius: 12,
            padding: 24,
            minWidth: 0,
          }}
        >
          <h2 style={{ fontSize: 14, marginBottom: 16 }}>
            {registry[node.type].name} · {node.type}
          </h2>
          <NodeRenderer
            node={node}
            theme={themed ? themePresets[1].theme : undefined}
            breakpoint="desktop"
            preview
          />
        </section>
      ))}
    </div>
  );
}
export default { title: '빌더/요소 카탈로그', component: Catalog } satisfies Meta<typeof Catalog>;
export const All: StoryObj<typeof Catalog> = {};
export const Themed: StoryObj<typeof Catalog> = { args: { themed: true } };
