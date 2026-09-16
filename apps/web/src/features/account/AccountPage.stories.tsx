import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AccountView, type Usage } from './AccountPage';
import type { User } from '../../lib/api';
const meta = {
  title: '계정/프로필과 사용량',
  component: AccountView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AccountView>;
export default meta;
const user: User = {
  id: 'demo',
  displayName: 'designer',
  email: 'designer@example.com',
  nickname: null,
  csrfToken: '',
};
const usage: Usage = {
  timeZone: 'Asia/Seoul',
  hasMore: false,
  summary: [
    {
      period: 'today',
      requests: 3,
      unknown: 1,
      input_tokens: 12000,
      output_tokens: 2500,
      total_tokens: 14500,
    },
  ],
  items: [
    {
      id: '1',
      created_at: '2026-09-16T07:30:00Z',
      status: 'completed',
      complete: true,
      calls: 3,
      model: 'example/model',
      input_tokens: 10000,
      output_tokens: 2000,
      total_tokens: 12000,
    },
    {
      id: '2',
      created_at: '2026-09-16T06:30:00Z',
      status: 'failed',
      complete: true,
      calls: 1,
      model: 'example/model',
      input_tokens: 2000,
      output_tokens: 500,
      total_tokens: 2500,
    },
    {
      id: '3',
      created_at: '2026-09-16T05:30:00Z',
      status: 'completed',
      complete: false,
      calls: 0,
      model: null,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    },
  ],
};
const largeUsage: Usage = {
  ...usage,
  items: usage.items.map((item, index) =>
    index === 0
      ? {
          ...item,
          model: 'example/long-model-name-for-layout-check',
          input_tokens: 123456789,
          output_tokens: 12345,
          total_tokens: 123469134,
        }
      : item,
  ),
};
function Example({ state = 'normal' }: { state?: string }) {
  const [profile, setProfile] = useState(user);
  return (
    <AccountView
      user={profile}
      usage={
        state === 'loading'
          ? undefined
          : state === 'empty'
            ? { ...usage, summary: [], items: [] }
            : state === 'large'
              ? largeUsage
              : usage
      }
      loading={state === 'loading'}
      error={state === 'error' ? '사용량을 불러오지 못했습니다.' : ''}
      onSave={async (nickname) => {
        setProfile({ ...profile, nickname, displayName: nickname ?? 'designer' });
      }}
      onRefresh={() => {}}
      onNext={() => {}}
      onPrevious={() => {}}
      hasPrevious={false}
      logout={() => {}}
    />
  );
}
export const Profile: StoryObj = { render: () => <Example /> };
export const Empty: StoryObj = { render: () => <Example state="empty" /> };
export const Loading: StoryObj = { render: () => <Example state="loading" /> };
export const Failure: StoryObj = { render: () => <Example state="error" /> };
export const LargeNumbers: StoryObj = { render: () => <Example state="large" /> };
