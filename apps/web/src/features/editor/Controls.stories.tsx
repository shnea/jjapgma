import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createNode } from '@jjapgma/ui-spec';
import { NodeRenderer } from './NodeRenderer';

function Controls() {
  const [width, setWidth] = useState(480);
  const [pages, setPages] = useState(10);
  const [includeTime, setIncludeTime] = useState(false);
  const pagination = createNode('pagination');
  pagination.id = 'pagination-example';
  pagination.props.pageCount = pages;
  const date = createNode('dateRange');
  date.id = 'date-example';
  date.props.includeTime = includeTime;
  const button = createNode('button');
  button.id = 'button-size-example';
  button.props.text = '내용에 맞춘 버튼';
  return (
    <div style={{ padding: 16 }}>
      <label>
        미리보기 너비{' '}
        <select
          aria-label="미리보기 너비"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        >
          <option>480</option>
          <option>240</option>
        </select>
      </label>
      <label>
        페이지 수{' '}
        <select
          aria-label="페이지 수"
          value={pages}
          onChange={(e) => setPages(Number(e.target.value))}
        >
          <option>10</option>
          <option>100</option>
        </select>
      </label>
      <label>
        시간 사용{' '}
        <select
          aria-label="시간 사용"
          value={String(includeTime)}
          onChange={(e) => setIncludeTime(e.target.value === 'true')}
        >
          <option value="false">사용 안 함</option>
          <option value="true">사용</option>
        </select>
      </label>
      <div
        style={{
          width,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          marginTop: 24,
        }}
      >
      <NodeRenderer node={date} breakpoint="desktop" preview />
      <NodeRenderer node={button} breakpoint="desktop" preview />
        <NodeRenderer node={pagination} breakpoint="desktop" preview />
        {(['top', 'left', 'right'] as const).map((position) => {
          const node = createNode('radio');
          node.id = 'radio-' + position;
          node.props.labelPosition = position;
          node.props.text = '라벨 ' + position;
          return <NodeRenderer key={node.id} node={node} breakpoint="desktop" preview />;
        })}
        {(['lines', 'circle', 'card'] as const).map((shape) => {
          const node = createNode('skeleton');
          node.id = 'skeleton-' + shape;
          node.props.shape = shape;
          return <NodeRenderer key={node.id} node={node} breakpoint="desktop" preview />;
        })}
      </div>
    </div>
  );
}
export default { title: '빌더/컨트롤 회귀', component: Controls } satisfies Meta<typeof Controls>;
export const Interactive: StoryObj<typeof Controls> = {};
