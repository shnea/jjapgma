import { Button } from '../../components/ui/Button';
export type NotificationItem = {
  id: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  readAt: string | null;
};
export type NotificationData = { items: NotificationItem[]; unreadCount: number };
export function NotificationList({
  data,
  busy,
  error,
  onOpen,
  onReadAll,
  onRetry,
}: {
  data?: NotificationData;
  busy: boolean;
  error: string;
  onOpen: (item: NotificationItem) => void;
  onReadAll: () => void;
  onRetry: () => void;
}) {
  return (
    <section className="notification-panel" aria-label="공유 알림 목록">
      <header>
        <strong>알림</strong>
        <Button variant="ghost" disabled={busy || !data?.unreadCount} onClick={onReadAll}>
          모두 읽음
        </Button>
      </header>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button variant="ghost" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      )}
      {!data && !error && <p>알림을 불러오고 있습니다…</p>}
      {data && !data.items.length && <p>새로운 공유 알림이 없습니다.</p>}
      <ul>
        {data?.items.map((item) => (
          <li key={item.id}>
            <button
              className={item.readAt ? '' : 'unread'}
              disabled={busy}
              onClick={() => onOpen(item)}
            >
              <span>
                {!item.readAt && <span className="notification-dot" aria-label="읽지 않음" />}
                <strong>{item.projectName}</strong> 프로젝트가 공유되었습니다.
              </span>
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString('ko-KR')}
              </time>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
