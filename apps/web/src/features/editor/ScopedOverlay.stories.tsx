import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createNode } from '@jjapgma/ui-spec';
import { NodeRenderer } from './NodeRenderer';
function OverlayExample() {
  const [preview, setPreview] = useState(true);
  const [kind, setKind] = useState<'dialog' | 'nonModal'>('dialog');
  const [long, setLong] = useState(false);
  const [short, setShort] = useState(false);
  const root = createNode('container');
  root.id = 'overlay-root';
  root.style = { height: short ? '180px' : '3000px', padding: 24, gap: 24, direction: 'column' };
  const modal = createNode('modal');
  modal.id = 'sample-modal';
  modal.props = { text: '전체 화면 창', isOpen: false, closeOnBackdrop: false };
  const nested = createNode('container');
  nested.id = 'local-container';
  nested.style = {
    width: '600px',
    height: '1000px',
    padding: 24,
    background: '#eeeeee',
    direction: 'column',
  };
  const dialog = createNode(kind);
  dialog.id = 'sample-dialog';
  dialog.props = { text: '영역 안의 창', isOpen: false, showFooter: false };
  const opener = createNode('button');
  opener.id = 'open-modal';
  opener.props = { text: '전체 창 열기', overlayAction: { type: 'open', targetId: modal.id } };
  const openLocal = createNode('button');
  openLocal.id = 'open-local';
  openLocal.props = { text: '영역 창 열기', overlayAction: { type: 'open', targetId: dialog.id } };
  const field = createNode('input');
  field.id = 'modal-input';
  field.props.text = '이름';
  const closer = createNode('button');
  const background = createNode('input');
  background.id = 'background-input';
  background.props.text = '배경 입력';
  closer.id = 'close-local';
  closer.props = { text: '작성 완료', overlayAction: { type: 'close' } };
  modal.children = [field];
  const dialogInput = createNode('input');
  dialogInput.id = 'dialog-input';
  dialogInput.props.text = '이름';
  dialog.children = [dialogInput, closer];
  dialog.style = { ...dialog.style, direction: long ? 'column' : 'row', width: '500px' };
  if (long) {
    dialog.children = Array.from({ length: 24 }, (_, i) => {
      const input = createNode('input');
      input.id = `long-field-${i}`;
      input.props.text = `항목 ${i + 1}`;
      return input;
    });
    dialog.children.push(closer);
  }
  nested.children = [openLocal, background, dialog];
  root.children = [opener, nested, modal];
  return (
    <>
      <label>
        <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
        미리보기
      </label>
      <label>
        <input type="checkbox" checked={long} onChange={(e) => setLong(e.target.checked)} />긴 내용
      </label>
      <label>
        <input type="checkbox" checked={short} onChange={(e) => setShort(e.target.checked)} />
        짧은 페이지
      </label>
      <label>
        영역 창 종류
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="dialog">다이얼로그</option>
          <option value="nonModal">Non-modal</option>
        </select>
      </label>
      <div
        className="overlay-story-viewport"
        style={{ width: 850, maxWidth: '100%', height: 600, overflow: 'auto', margin: '20px auto' }}
      >
        <NodeRenderer node={root} breakpoint="desktop" preview={preview} root />
      </div>
    </>
  );
}
export default { title: '빌더/모달과 다이얼로그', component: OverlayExample } satisfies Meta<
  typeof OverlayExample
>;
export const Default: StoryObj<typeof OverlayExample> = {};
