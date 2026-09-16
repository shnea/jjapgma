import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationList, type NotificationData } from './NotificationList';
function Example({ empty = false }: { empty?: boolean }) {
  const [data, setData] = useState<NotificationData>({
    unreadCount: empty ? 0 : 1,
    items: empty
      ? []
      : [
          {
            id: 'one',
            projectId: 'project',
            projectName: '공유 디자인 시스템',
            createdAt: '2026-09-16T00:00:00Z',
            readAt: null,
          },
        ],
  });
  return (
    <div style={{ maxWidth: 370 }}>
      <NotificationList
        data={data}
        busy={false}
        error=""
        onOpen={(item) =>
          setData({ unreadCount: 0, items: [{ ...item, readAt: '2026-09-16T01:00:00Z' }] })
        }
        onReadAll={() =>
          setData({
            unreadCount: 0,
            items: data.items.map((item) => ({ ...item, readAt: '2026-09-16T01:00:00Z' })),
          })
        }
        onRetry={() => {}}
      />
    </div>
  );
}
const meta = { title: '프로젝트/공유 알림', component: Example } satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Unread: Story = {};
export const Empty: Story = { args: { empty: true } };
