import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog } from './Dialog';
import { Button } from './Button';

function Example({ busy = false, long = false }: { busy?: boolean; long?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>대화상자 열기</Button>
      {open && (
        <Dialog
          title="프로젝트 설정"
          description={long ? '긴 프로젝트 이름과 설명 '.repeat(12) : undefined}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <label className="library-name">
            프로젝트 이름
            <input data-dialog-autofocus defaultValue="디자인 시스템" />
          </label>
          {long &&
            Array.from({ length: 12 }, (_, index) => (
              <p className="library-note" key={index}>
                설정 안내 {index + 1}. 작은 화면에서도 내용을 스크롤하고 마지막 동작에 접근할 수
                있습니다.
              </p>
            ))}
          <footer>
            <Button disabled={busy} onClick={() => setOpen(false)}>
              완료
            </Button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
const meta = { title: '공통/Dialog', component: Example } satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Busy: Story = { args: { busy: true } };
export const LongContent: Story = { args: { long: true } };
