import { useEffect, useState } from 'react';
import { ArrowLeft, LogOut, RefreshCw, UserRound } from 'lucide-react';
import { api, errorMessage, type User } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Brand } from '../../components/ui/Brand';

export function AccountLink({ user }: { user: User }) {
  return (
    <a className="account-avatar" href="/account" aria-label="내 계정" title={user.displayName}>
      <UserRound size={19} />
    </a>
  );
}
type Counts = { input_tokens: number; output_tokens: number; total_tokens: number };
export type Usage = {
  summary: (Counts & { period: string; requests: number; unknown: number })[];
  items: (Counts & {
    id: string;
    created_at: string;
    status: string;
    complete: boolean;
    calls: number;
    model: string | null;
  })[];
  hasMore: boolean;
  timeZone: string;
};
const number = (value: number) => value.toLocaleString('ko-KR');
export function AccountView({
  user,
  usage,
  loading,
  error,
  onSave,
  onRefresh,
  onPrevious,
  onNext,
  hasPrevious,
  logout,
}: {
  user: User;
  usage?: Usage;
  loading: boolean;
  error: string;
  onSave: (nickname: string | null) => Promise<void>;
  onRefresh: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  logout: () => void;
}) {
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  useEffect(() => setNickname(user.nickname ?? ''), [user.nickname]);
  async function save(value: string | null) {
    setSaving(true);
    setMessage('');
    setSaveError('');
    try {
      await onSave(value);
      setNickname(value ?? '');
      setMessage('닉네임을 저장했습니다.');
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="account-page">
      <header className="account-header">
        <a href="/" aria-label="프로젝트 목록">
          <ArrowLeft size={18} />
          <Brand small />
        </a>
        <Button variant="ghost" onClick={logout}>
          <LogOut size={16} />
          로그아웃
        </Button>
      </header>
      <main className="account-content">
        <div>
          <span className="eyebrow">MY ACCOUNT</span>
          <h1>내 계정</h1>
          <p className="muted">프로필과 AI 사용 내역을 확인하세요.</p>
        </div>
        <section className="account-card" aria-labelledby="profile-title">
          <h2 id="profile-title">프로필</h2>
          <div className="account-identity">
            <span className="account-avatar">
              <UserRound size={24} />
            </span>
            <div>
              <strong>{user.displayName}</strong>
              <p className="muted">{user.email ?? '개발 계정'}</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(nickname.trim() || null);
            }}
          >
            <label htmlFor="account-nickname">닉네임</label>
            <div className="account-name-input">
              <input
                id="account-nickname"
                value={nickname}
                maxLength={40}
                placeholder={user.email?.split('@')[0] ?? '기본 이름'}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setMessage('');
                }}
                disabled={saving}
                aria-describedby="nickname-help"
              />
              <Button type="submit" loading={saving}>
                저장
              </Button>
              <Button
                variant="ghost"
                disabled={saving || !user.nickname}
                onClick={() => void save(null)}
              >
                기본 이름 사용
              </Button>
            </div>
            <p id="nickname-help" className="muted">
              최대 40자 · 다른 사람과 같은 닉네임을 사용할 수 있습니다. 비워 두면 이메일 앞부분을
              사용합니다.
            </p>
            {message && <p role="status">{message}</p>}
            {saveError && (
              <p role="alert" className="error-banner">
                {saveError}
              </p>
            )}
          </form>
        </section>
        <section aria-labelledby="usage-title">
          <div className="account-section-title">
            <div>
              <h2 id="usage-title">AI 사용량</h2>
              <p className="muted">한국 시간 기준 · 입력과 출력 토큰을 합산합니다.</p>
            </div>
            <Button variant="secondary" disabled={loading} onClick={onRefresh}>
              <RefreshCw size={16} />
              새로고침
            </Button>
          </div>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          {loading && <p role="status">사용량을 불러오고 있습니다…</p>}
          {usage && (
            <>
              <div className="usage-summary">
                {(
                  [
                    ['today', '오늘'],
                    ['month', '이번 달'],
                    ['all', '전체'],
                  ] as const
                ).map(([period, label]) => {
                  const count = usage.summary.find((s) => s.period === period) ?? {
                    requests: 0,
                    unknown: 0,
                    input_tokens: 0,
                    output_tokens: 0,
                    total_tokens: 0,
                  };
                  return (
                    <article key={period} className="account-card">
                      <h3>{label}</h3>
                      <strong className="usage-total">
                        {count.requests > 0 &&
                        count.unknown === count.requests &&
                        count.total_tokens === 0
                          ? '미집계'
                          : number(count.total_tokens)}
                        <small>확인된 토큰</small>
                      </strong>
                      <dl>
                        <div>
                          <dt>입력</dt>
                          <dd>{number(count.input_tokens)}</dd>
                        </div>
                        <div>
                          <dt>출력</dt>
                          <dd>{number(count.output_tokens)}</dd>
                        </div>
                        <div>
                          <dt>요청</dt>
                          <dd>{number(count.requests)}회</dd>
                        </div>
                      </dl>
                      {count.unknown > 0 && (
                        <p className="usage-note">
                          {count.unknown}건은 미집계 또는 부분 집계입니다.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
              <div className="account-card usage-history">
                <h3>요청별 내역</h3>
                {usage.items.length ? (
                  <div className="usage-table-scroll">
                    <table>
                      <caption className="sr-only">AI 요청별 토큰 사용량</caption>
                      <thead>
                        <tr>
                          <th scope="col">요청 시각</th>
                          <th scope="col">모델</th>
                          <th scope="col">상태</th>
                          <th scope="col" className="usage-number">
                            입력 토큰
                          </th>
                          <th scope="col" className="usage-number">
                            출력 토큰
                          </th>
                          <th scope="col" className="usage-number usage-sum">
                            합계 토큰
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.items.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <time dateTime={item.created_at}>
                                {new Date(item.created_at).toLocaleString('ko-KR', {
                                  timeZone: usage.timeZone,
                                })}
                              </time>
                            </td>
                            <td>
                              {item.model ?? '정보 없음'}
                              <small>
                                {item.calls ? `${item.calls}회 확인된 모델 호출` : '호출 정보 없음'}
                              </small>
                            </td>
                            <td>
                              <span className={`usage-status usage-${item.status}`}>
                                {(
                                  {
                                    running: '진행 중',
                                    completed: '완료',
                                    failed: '실패',
                                  } as Record<string, string>
                                )[item.status] ?? item.status}
                              </span>
                              {!item.complete && (
                                <small>{item.calls ? '부분 집계' : '미집계'}</small>
                              )}
                            </td>
                            <td className="usage-number">
                              {item.calls ? number(item.input_tokens) : '—'}
                            </td>
                            <td className="usage-number">
                              {item.calls ? number(item.output_tokens) : '—'}
                            </td>
                            <td className="usage-number usage-sum">
                              {item.calls ? number(item.total_tokens) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">아직 AI 사용 내역이 없습니다.</p>
                )}
                <nav className="usage-pagination" aria-label="사용 내역 페이지">
                  <Button
                    variant="secondary"
                    disabled={loading || !hasPrevious}
                    onClick={onPrevious}
                  >
                    이전
                  </Button>
                  <Button variant="secondary" disabled={loading || !usage.hasMore} onClick={onNext}>
                    다음
                  </Button>
                </nav>
              </div>
            </>
          )}
          <p className="usage-help muted">
            n8n이 전달한 실제 사용량만 표시합니다. 한 요청에서 여러 번 사용한 모델의 토큰을 모두
            합산하며, 실패한 요청에도 사용량이 생길 수 있습니다. 미집계는 0 토큰을 의미하지
            않습니다. 외부 MCP 클라이언트가 자체적으로 사용한 모델과 기능 도입 전 내역은 포함되지
            않습니다.
          </p>
        </section>
      </main>
    </div>
  );
}
export function AccountPage({
  user,
  onUser,
  logout,
}: {
  user: User;
  onUser: (user: User) => void;
  logout: () => void;
}) {
  const [usage, setUsage] = useState<Usage>();
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<Usage>(`/account/usage?offset=${offset}`)
      .then((v) => {
        if (active) setUsage(v);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [offset, refresh]);
  return (
    <AccountView
      user={user}
      usage={usage}
      loading={loading}
      error={error}
      onSave={async (nickname) => {
        const result = await api<Pick<User, 'displayName' | 'nickname'>>('/account/profile', {
          method: 'PATCH',
          body: JSON.stringify({ nickname }),
        });
        onUser({ ...user, ...result });
      }}
      onRefresh={() => setRefresh((v) => v + 1)}
      hasPrevious={offset > 0}
      onPrevious={() => setOffset((v) => Math.max(0, v - 20))}
      onNext={() => setOffset((v) => v + 20)}
      logout={logout}
    />
  );
}
