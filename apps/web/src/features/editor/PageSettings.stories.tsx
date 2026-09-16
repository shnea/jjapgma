import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageSettings } from './PageSettings';
function Example({ readOnly = false }: { readOnly?: boolean }) {
  const [name, setName] = useState('브랜드 홈');
  return (
    <div className="page-navigation" style={{ maxWidth: 300 }}>
      <span>{name}</span>
      <PageSettings
        name={name}
        busy={false}
        disabled={readOnly}
        error=""
        onRename={async (value) => {
          setName(value);
          return true;
        }}
        onDelete={async () => {
          setName('삭제됨');
          return true;
        }}
      />
    </div>
  );
}
const meta = { title: '프로젝트/페이지 수정', component: Example } satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editable: Story = {};
export const ReadOnly: Story = { args: { readOnly: true } };
