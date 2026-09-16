import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SharingPanel, type SharingData } from './SharingPanel';

const initial: SharingData = {
  mode: 'auto',
  members: [
    { id: 'owner', displayName: 'owner', email: 'owner@example.com', role: 'OWNER' },
    { id: 'viewer', displayName: 'reader', email: 'reader@example.com', role: 'VIEWER' },
  ],
  invitations: [],
};
function Example({ mode = 'auto', failed = false }: { mode?: 'auto' | 'email'; failed?: boolean }) {
  const [data, setData] = useState<SharingData>({
    ...initial,
    mode,
    invitations: failed
      ? [
          {
            id: 'pending',
            email: 'pending@example.com',
            role: 'VIEWER',
            mode: 'email',
            notificationStatus: 'FAILED',
            expired: false,
            expiresAt: null,
          },
        ]
      : [],
  });
  return (
    <div style={{ maxWidth: 720, padding: 24 }}>
      <SharingPanel
        data={data}
        error=""
        busy={false}
        actions={{
          add: async (email, role) => {
            setData((prev) => ({
              ...prev,
              invitations: [
                ...prev.invitations,
                {
                  id: email,
                  email,
                  role,
                  mode,
                  notificationStatus: mode === 'auto' ? 'NONE' : 'QUEUED',
                  expired: false,
                  expiresAt: null,
                },
              ],
            }));
            return true;
          },
          change: (kind, id, role) =>
            setData((prev) => ({
              ...prev,
              [kind]: prev[kind].map((item) => (item.id === id ? { ...item, role } : item)),
            })),
          remove: (kind, id) =>
            setData((prev) => ({ ...prev, [kind]: prev[kind].filter((item) => item.id !== id) })),
          retry: (id) =>
            setData((prev) => ({
              ...prev,
              invitations: prev.invitations.map((item) =>
                item.id === id ? { ...item, notificationStatus: 'QUEUED' } : item,
              ),
            })),
        }}
      />
    </div>
  );
}
const meta = { title: '프로젝트/공유 관리', component: Example } satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Auto: Story = {};
export const Email: Story = { args: { mode: 'email' } };
export const Failed: Story = { args: { mode: 'email', failed: true } };
