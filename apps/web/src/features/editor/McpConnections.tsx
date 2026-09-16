import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
type Connection = {
  id: string;
  name: string;
  scope: 'read' | 'write';
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
};
export function McpConnections({
  projectId,
  readOnly,
  onClose,
}: {
  projectId: string;
  readOnly: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Connection[]>([]),
    [name, setName] = useState('로컬 AI 에이전트'),
    [scope, setScope] = useState<'read' | 'write'>('read'),
    [days, setDays] = useState(30),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [created, setCreated] = useState<{ url: string; token: string }>();
  const refresh = () => api<Connection[]>(`/projects/${projectId}/mcp-connections`).then(setItems);
  useEffect(() => {
    void refresh().catch((e) => setError(errorMessage(e)));
  }, [projectId]);
  async function create() {
    setBusy(true);
    setError('');
    setCreated(undefined);
    try {
      setCreated(
        await api(`/projects/${projectId}/mcp-connections`, {
          method: 'POST',
          body: JSON.stringify({ name, scope, days }),
        }),
      );
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    setBusy(true);
    setError('');
    try {
      await api(`/projects/${projectId}/mcp-connections/${id}`, { method: 'DELETE' });
      setCreated(undefined);
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const config = created
    ? JSON.stringify(
        {
          mcpServers: {
            jjapgma: { url: created.url, headers: { Authorization: `Bearer ${created.token}` } },
          },
        },
        null,
        2,
      )
    : '';
  return (
    <Dialog title="프로젝트 MCP 연결" busy={busy} onClose={onClose}>
      <p>로컬 AI 에이전트에서 이 프로젝트의 화면 구조와 디자인 정보를 사용할 수 있습니다.</p>
      <fieldset disabled={busy} className="mcp-fields">
        <label>
          연결 이름
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          권한
          <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
            <option value="read">읽기 전용</option>
            <option value="write" disabled={readOnly}>
              읽기 + 변경 제안
            </option>
          </select>
        </label>
        <label>
          만료
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7일</option>
            <option value={30}>30일</option>
            <option value={90}>90일</option>
          </select>
        </label>
        <Button disabled={!name.trim()} onClick={() => void create()}>
          연결 발급
        </Button>
      </fieldset>
      {created && (
        <section className="mcp-issued">
          <p>인증 정보는 지금 한 번만 표시됩니다. 에이전트의 비공개 설정에 보관하세요.</p>
          <label>
            연결 주소
            <input readOnly value={created.url} />
          </label>
          <label>
            인증 토큰
            <input readOnly type="password" value={created.token} />
          </label>
          <label>
            연결 설정 예시
            <textarea readOnly rows={9} value={config} />
          </label>
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(config)
                .catch(() => setError('복사하지 못했습니다. 설정 내용을 직접 복사해 주세요.'))
            }
          >
            설정 복사
          </Button>
          <small>
            Streamable HTTP와 Authorization 헤더를 지원하는 클라이언트용 예시입니다. 클라이언트에
            따라 설정 형식이 다를 수 있습니다.
          </small>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      <ul className="mcp-list">
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <small>
                {item.scope === 'read' ? '읽기 전용' : '변경 제안'} · 만료{' '}
                {new Date(item.expires_at).toLocaleDateString('ko-KR')}
                {item.last_used_at
                  ? ` · 최근 사용 ${new Date(item.last_used_at).toLocaleString('ko-KR')}`
                  : ''}
              </small>
            </div>
            {item.revoked_at ? (
              <span>폐기됨</span>
            ) : (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void revoke(item.id)}
                aria-label={`${item.name} 연결 폐기`}
              >
                폐기
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
