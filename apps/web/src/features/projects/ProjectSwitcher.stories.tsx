import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProjectSelect } from './ProjectSwitcher';
function Example() {
  const [value, setValue] = useState('mine');
  return (
    <ProjectSelect
      value={value}
      onChange={setValue}
      projects={[
        { id: 'mine', name: '나의 프로젝트', role: 'OWNER' },
        { id: 'shared', name: '팀 공유 프로젝트', role: 'EDITOR' },
      ]}
    />
  );
}
const meta = { title: '프로젝트/프로젝트 전환', component: Example } satisfies Meta<typeof Example>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
