import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { NotificationList, type NotificationData, type NotificationItem } from './NotificationList';

export function NotificationBell() {
  const [data, setData] = useState<NotificationData>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const active = useRef(false);
  const pending = useRef(false);
  const requestVersion = useRef(0);
  const known = useRef('');
  const load = useCallback(async (force = false) => {
    if (pending.current && !force) return;
    const version = ++requestVersion.current;
    pending.current = true;
    try {
      const next = await api<NotificationData>('/notifications');
      if (!active.current || version !== requestVersion.current) return;
      setData(next);
      setError('');
      const signature = next.items.map((item) => item.id).join(',');
      if (known.current !== signature) {
        known.current = signature;
        window.dispatchEvent(new Event('project-access-changed'));
      }
    } catch (e) {
      if (active.current && version === requestVersion.current) setError(errorMessage(e));
    } finally {
      if (version === requestVersion.current) pending.current = false;
    }
  }, []);
  useEffect(() => {
    active.current = true;
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const timer = window.setInterval(refresh, 15000);
    const outside = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node))
        details.current.open = false;
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    document.addEventListener('pointerdown', outside);
    return () => {
      active.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      document.removeEventListener('pointerdown', outside);
    };
  }, [load]);
  async function read(item?: NotificationItem) {
    setBusy(true);
    setError('');
    try {
      await api(item ? `/notifications/${item.id}/read` : '/notifications/read-all', {
        method: 'PATCH',
      });
      if (item) window.location.assign(`/projects/${item.projectId}`);
      else await load(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="notification-bell"
      ref={details}
      onToggle={(event) => {
        if (event.currentTarget.open) void load();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          details.current!.open = false;
          details.current?.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label={`알림${data?.unreadCount ? ` ${data.unreadCount}개 읽지 않음` : ''}`}>
        <Bell size={18} />
        {Boolean(data?.unreadCount) && (
          <span className="notification-count">
            {data!.unreadCount > 99 ? '99+' : data!.unreadCount}
          </span>
        )}
        <span className="sr-only" aria-live="polite">
          읽지 않은 알림 {data?.unreadCount ?? 0}개
        </span>
      </summary>
      <NotificationList
        data={data}
        busy={busy}
        error={error}
        onOpen={(item) => void read(item)}
        onReadAll={() => void read()}
        onRetry={() => void load()}
      />
    </details>
  );
}
