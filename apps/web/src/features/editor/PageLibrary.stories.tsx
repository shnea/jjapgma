import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createTemplate, type PageTheme as ThemeTokens } from '@jjapgma/ui-spec';
import { TemplatePicker } from './TemplatePicker';
import { ThemeEditor } from './ThemeEditor';
import { NodeRenderer } from './NodeRenderer';
import { CreatePageDialog } from './CreatePageDialog';
import { DeletedPagesDialog } from './DeletedPagesDialog';
import { Button } from '../../components/ui/Button';
import { TemplatePanel } from './TemplatePanel';
import { DesignPanel } from './DesignPanel';
function InputActions() {
  const [position, setPosition] = useState<'top' | 'left' | 'right'>('top');
  const [label, setLabel] = useState(true);
  const [large, setLarge] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState(true);
  const spec = createTemplate('management');
  const row = spec.root.children[2];
  const input = row.children[0];
  input.props.labelPosition = position;
  input.props.labelVisible = label;
  input.style.fontSize = large ? 24 : 16;
  return (
    <div>
      <label>
        라벨 위치
        <select
          aria-label="라벨 위치"
          value={position}
          onChange={(e) => setPosition(e.target.value as typeof position)}
        >
          <option value="top">위</option>
          <option value="left">왼쪽</option>
          <option value="right">오른쪽</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={label} onChange={(e) => setLabel(e.target.checked)} />
        라벨 표시
      </label>
      <label>
        <input type="checkbox" checked={large} onChange={(e) => setLarge(e.target.checked)} />큰
        입력칸
      </label>
      <label>
        <input type="checkbox" checked={mobile} onChange={(e) => setMobile(e.target.checked)} />
        모바일 배치
      </label>
      <label>
        <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
        미리보기 모드
      </label>
      <div className="input-actions-story" style={{ padding: 24, maxWidth: 720 }}>
        <NodeRenderer
          node={row}
          breakpoint={mobile ? 'mobile' : 'desktop'}
          preview={preview}
          theme={spec.theme}
        />
      </div>
    </div>
  );
}
function LibraryPanel({ disabled = false }: { disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', height: 650, minWidth: 820 }}>
      <aside className="left-panel">
        <div className="panel-scroll">
          <TemplatePanel
            spec={createTemplate('landing')}
            pageId="storybook"
            pageName="자주 쓰는 화면"
            projectId="storybook"
            targetName="화면"
            disabled={disabled}
            onInsert={() => true}
          />
        </div>
      </aside>
      <div style={{ flex: 1, background: '#eef0ed', padding: 20 }}>캔버스</div>
      <DesignPanel>
        <div className="panel-tabs">
          <span className="active">디자인</span>
        </div>
        <div className="panel-scroll">
          <ThemeEditor disabled={disabled} onChange={() => {}} />
        </div>
      </DesignPanel>
    </div>
  );
}
function Templates() {
  const [value, setValue] = useState('landing');
  return <TemplatePicker value={value} onChange={setValue} />;
}
function Theme({ disabled = false }: { disabled?: boolean }) {
  const [spec] = useState(() => createTemplate('landing'));
  const [theme, setTheme] = useState<ThemeTokens | undefined>(spec.theme);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
      <ThemeEditor theme={theme} disabled={disabled} onChange={setTheme} />
      <NodeRenderer root preview node={spec.root} theme={theme} breakpoint="desktop" />
    </div>
  );
}
function Creation() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>새 페이지</Button>
      {open && (
        <CreatePageDialog
          busy={false}
          error=""
          onCreate={async () => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
function Trash() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>삭제된 페이지</Button>
      {open && (
        <DeletedPagesDialog
          projectId="storybook"
          onClose={() => setOpen(false)}
          onRestore={async () => true}
        />
      )}
    </>
  );
}
const meta = { title: '프로젝트/페이지 라이브러리', component: Templates } satisfies Meta<
  typeof Templates
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TemplateList: Story = {};
export const PageTheme: Story = { render: () => <Theme /> };
export const ReadOnlyTheme: Story = { render: () => <Theme disabled /> };
export const CreateDialog: Story = { render: () => <Creation /> };
export const DeletedPages: Story = { render: () => <Trash /> };
export const TemplatePanelStory: Story = { name: 'Template Panel', render: () => <LibraryPanel /> };
export const ReadOnlyTemplatePanel: Story = { render: () => <LibraryPanel disabled /> };
export const InputActionAlignment: Story = { render: () => <InputActions /> };
