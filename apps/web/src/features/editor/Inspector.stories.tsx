import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  createNode,
  createTemplate,
  convertTable,
  type UiNode,
  type Breakpoint,
} from '@jjapgma/ui-spec';
import { Inspector } from './Inspector';
import { NodeRenderer } from './NodeRenderer';
function Demo({
  kind = 'button',
  disabled = false,
}: {
  kind: 'button' | 'container' | 'grid' | 'table' | 'input';
  disabled?: boolean;
}) {
  const [node, setNode] = useState(() => {
    const n = createNode(kind);
    if (kind === 'table') {
      n.props.text = '회원 목록';
      n.props.paginationMode = 'pagination';
      n.props.pageSize = 2;
      const table = convertTable({
        items:
          '이름|이메일|상태|작업|확인\n가람|garam@example.com|완료|수정|true\n나래|narae@example.com|대기|수정|false\n다온|daon@example.com|완료|수정|false',
      });
      table.columns[1].hidden = { mobile: true };
      table.columns[0].sortable = true;
      table.columns[2].type = 'badge';
      table.columns[2].rules = [{ value: '완료', color: '#24704b' }];
      table.columns[3].type = 'button';
      table.columns[3].icon = 'pencil';
      table.columns[4].type = 'checkbox';
      table.striped = true;
      table.firstColumn = 'number-select';
      table.searchable = true;
      n.props.table = table;
    }
    if (kind === 'container') {
      const row = createTemplate('management').root.children[2];
      row.responsive.mobile = { direction: 'column' };
      return row;
    }
    if (kind === 'input') {
      n.props.prefix = '₩';
      n.props.suffix = '원';
      n.props.clearable = true;
      n.props.errorText = '금액을 입력하세요.';
    }
    return n;
  });
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const parent = createNode('container');
  parent.style.direction = 'column';
  return (
    <div>
      <label>
        화면 크기
        <select value={breakpoint} onChange={(e) => setBreakpoint(e.target.value as Breakpoint)}>
          <option value="desktop">PC</option>
          <option value="mobile">모바일</option>
        </select>
      </label>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 30, padding: 20 }}>
        <div
          className="inspector-story-canvas"
          style={{ width: breakpoint === 'mobile' ? 350 : 620, flexShrink: 0 }}
        >
          <NodeRenderer node={node} breakpoint={breakpoint} preview />
        </div>
        <div style={{ width: 380, background: '#fff', border: '1px solid #dae2d4' }}>
          <Inspector
            node={node}
            parent={parent}
            breakpoint={breakpoint}
            root={false}
            disabled={disabled}
            onUpdate={(edit) =>
              setNode((prev) => {
                const next: UiNode = structuredClone(prev);
                edit(next);
                return next;
              })
            }
            onDelete={() => {}}
            onDuplicate={() => {}}
            onReorder={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
const meta = { title: '빌더/속성 편집', component: Demo, args: { kind: 'button' } } satisfies Meta<
  typeof Demo
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ButtonProperties: Story = {};
export const ContainerProperties: Story = { args: { kind: 'container' } };
export const GridProperties: Story = { args: { kind: 'grid' } };
export const TableProperties: Story = { args: { kind: 'table' } };
export const ReadOnlyTable: Story = { args: { kind: 'table', disabled: true } };
export const InputProperties: Story = { args: { kind: 'input' } };
