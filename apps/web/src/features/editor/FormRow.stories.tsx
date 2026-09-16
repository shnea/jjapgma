import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createNode, type NodeStyle } from '@jjapgma/ui-spec';
import { NodeRenderer } from './NodeRenderer';

function FormRow() {
  const [position, setPosition] = useState<'top' | 'left' | 'right'>('top');
  const [mobile, setMobile] = useState(false),
    [large, setLarge] = useState(false),
    [help, setHelp] = useState(false),
    [hidden, setHidden] = useState(false),
    [manual, setManual] = useState(false),
    [wrapped, setWrapped] = useState(false),
    [custom, setCustom] = useState(false),
    [zoom, setZoom] = useState(false),
    [preview, setPreview] = useState(true);
  const [align, setAlign] = useState<NodeStyle['align']>('stretch');
  const row = createNode('container');
  row.id = 'form-row';
  row.style = {
    direction: 'row',
    align,
    gap: 16,
    padding: 16,
    wrap: wrapped,
    controlAlignment: manual ? 'layout' : 'input',
  };
  row.responsive.mobile = { direction: 'column', align: 'stretch' };
  const input = createNode('input'),
    date = createNode('input'),
    range = createNode('dateRange'),
    button = createNode('button');
  input.id = 'form-input';
  date.id = 'form-date';
  range.id = 'form-range';
  button.id = 'form-action';
  input.props.text = '검색어';
  date.props.text = '날짜';
  range.props.text = '조회 기간';
  date.props.controlType = 'date';
  button.props.text = '조회';
  for (const field of [input, date, range]) {
    field.props.labelPosition = position;
    field.props.labelVisible = !hidden;
    field.style = { width: '240px', fontSize: large ? 24 : 16 };
    field.responsive.mobile = { width: '100%' };
  }
  if (help) input.props.description = '검색어를 입력하면 해당 목록을 조회합니다.';
  if (custom) button.style.marginTop = 35;
  row.children = [input, date, range, button];
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <label>
          라벨 위치
          <select value={position} onChange={(e) => setPosition(e.target.value as typeof position)}>
            <option value="top">위</option>
            <option value="left">왼쪽</option>
            <option value="right">오른쪽</option>
          </select>
        </label>
        <label>
          기존 세로 정렬
          <select value={align} onChange={(e) => setAlign(e.target.value as typeof align)}>
            <option value="stretch">채움</option>
            <option value="flex-start">위</option>
            <option value="center">가운데</option>
            <option value="flex-end">아래</option>
          </select>
        </label>
        {[
          { label: '모바일', value: mobile, set: setMobile },
          { label: '큰 글자', value: large, set: setLarge },
          { label: '설명 문구', value: help, set: setHelp },
          { label: '라벨 숨김', value: hidden, set: setHidden },
          { label: '일반 배치', value: manual, set: setManual },
          { label: '줄바꿈', value: wrapped, set: setWrapped },
          { label: '직접 여백', value: custom, set: setCustom },
          { label: '축소 캔버스', value: zoom, set: setZoom },
          { label: '미리보기', value: preview, set: setPreview },
        ].map(({ label, value, set }) => (
          <label key={label}>
            <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
            {label}
          </label>
        ))}
      </div>
      <div
        className="form-row-story"
        style={{
          width: mobile ? 360 : wrapped ? 560 : 1040,
          transform: zoom ? 'scale(.7)' : undefined,
          transformOrigin: 'top left',
        }}
      >
        <NodeRenderer node={row} breakpoint={mobile ? 'mobile' : 'desktop'} preview={preview} />
      </div>
    </div>
  );
}
const meta = { title: '빌더/폼 행 정렬', component: FormRow } satisfies Meta<typeof FormRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Controls: Story = {};
