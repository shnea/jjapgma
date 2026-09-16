import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';

const storageKey = 'jjapgma-invitation';
export function pendingInvitation() {
  const token = window.location.pathname === '/invitations' ? window.location.hash.slice(1) : '';
  if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
    sessionStorage.setItem(storageKey, token);
    window.history.replaceState(null, '', '/invitations');
  }
  return sessionStorage.getItem(storageKey);
}
type InvitationInfo = { projectId: string; projectName: string; role: string; accepted: boolean };
export function Invitation({ token, logout }: { token: string; logout: () => void }) {
  const [info, setInfo] = useState<InvitationInfo>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<InvitationInfo>('/invitations/preview', { method: 'POST', body: JSON.stringify({ token }) })
      .then(setInfo)
      .catch((e) => setError(errorMessage(e)));
  }, [token]);
  async function accept() {
    setBusy(true);
    setError('');
    try {
      const result = await api<InvitationInfo>('/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      sessionStorage.removeItem(storageKey);
      window.location.assign(`/projects/${result.projectId}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <main className="invitation-page">
      <section>
        <h1>프로젝트 공유 초대</h1>
        {info && (
          <>
            <h2>{info.projectName}</h2>
            <p>{info.role === 'EDITOR' ? '편집' : '보기'} 권한으로 공유됩니다.</p>
            <Button loading={busy} onClick={() => void accept()}>
              {info.accepted ? '프로젝트 열기' : '공유 수락'}
            </Button>
          </>
        )}
        {!info && !error && <p role="status">초대를 확인하고 있습니다…</p>}
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div className="invitation-actions">
          <Button variant="secondary" onClick={logout}>
            다른 계정으로 로그인
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              sessionStorage.removeItem(storageKey);
              window.location.assign('/');
            }}
          >
            프로젝트 목록으로
          </Button>
        </div>
      </section>
    </main>
  );
}
