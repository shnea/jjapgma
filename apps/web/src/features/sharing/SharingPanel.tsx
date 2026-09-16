import { useState } from 'react';
import { Button } from '../../components/ui/Button';

export type ShareRole = 'EDITOR' | 'VIEWER';
export type SharingData = {
  mode: 'auto' | 'email';
  members: { id: string; displayName: string; email: string | null; role: ShareRole | 'OWNER' }[];
  invitations: {
    id: string;
    email: string;
    role: ShareRole;
    mode: 'auto' | 'email';
    expiresAt: string | null;
    expired: boolean;
    notificationStatus: 'NONE' | 'READY' | 'QUEUED' | 'FAILED';
  }[];
};
export type SharingActions = {
  add: (email: string, role: ShareRole) => Promise<boolean>;
  change: (kind: 'members' | 'invitations', id: string, role: ShareRole) => void;
  remove: (kind: 'members' | 'invitations', id: string) => void;
  retry: (id: string) => void;
};
export function SharingPanel({
  data,
  busy,
  error,
  actions,
}: {
  data?: SharingData;
  busy: boolean;
  error: string;
  actions: SharingActions;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('VIEWER');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await actions.add(email, role)) setEmail('');
  }
  const roleControl = (
    kind: 'members' | 'invitations',
    id: string,
    label: string,
    value: ShareRole,
  ) => (
    <select
      aria-label={`${label} 권한`}
      value={value}
      disabled={busy}
      onChange={(e) => actions.change(kind, id, e.target.value as ShareRole)}
    >
      <option value="VIEWER">보기</option>
      <option value="EDITOR">편집</option>
    </select>
  );
  return (
    <div className="sharing-panel">
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">공유 목록을 불러오고 있습니다…</p>
      ) : (
        <>
          <p>
            {data.mode === 'auto'
              ? '이메일을 추가하면 바로 공유됩니다. 처음 방문하는 사용자는 로그인하면 연결됩니다.'
              : '초대받은 사용자가 이메일의 링크로 로그인하고 수락하면 공유됩니다.'}
          </p>
          <form className="sharing-add" onSubmit={(e) => void submit(e)}>
            <label>
              공유할 이메일
              <input
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={busy}
              />
            </label>
            <label>
              권한
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ShareRole)}
                disabled={busy}
              >
                <option value="VIEWER">보기</option>
                <option value="EDITOR">편집</option>
              </select>
            </label>
            <Button type="submit" loading={busy}>
              {data.mode === 'auto' ? '공유 추가' : '초대 보내기'}
            </Button>
          </form>
          <h3>공유 중인 사용자</h3>
          <ul className="sharing-list">
            {data.members.map((member) => (
              <li key={member.id}>
                <div className="sharing-person">
                  <strong>{member.displayName}</strong>
                  <small>{member.email ?? '이메일 정보 없음'}</small>
                </div>
                {member.role === 'OWNER' ? (
                  <span>소유자</span>
                ) : (
                  <>
                    {roleControl(
                      'members',
                      member.id,
                      member.email ?? member.displayName,
                      member.role,
                    )}
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => actions.remove('members', member.id)}
                      aria-label={`${member.email ?? member.displayName} 공유 취소`}
                    >
                      공유 취소
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {data.invitations.length > 0 && (
            <>
              <h3>연결 대기</h3>
              <ul className="sharing-list">
                {data.invitations.map((invitation) => (
                  <li key={invitation.id}>
                    <div className="sharing-person">
                      <strong>{invitation.email}</strong>
                      <small>
                        {invitation.expired
                          ? '초대 만료 · 취소 후 다시 추가해 주세요'
                          : invitation.mode === 'auto'
                            ? '첫 로그인 대기'
                            : invitation.notificationStatus === 'QUEUED'
                              ? '메일 발송 요청 접수 · 수락 대기'
                              : invitation.notificationStatus === 'FAILED'
                                ? '메일 요청 실패 · 설정 확인 후 재시도'
                                : '메일 발송 요청 대기'}
                      </small>
                      {invitation.expiresAt && (
                        <small>
                          유효기간: {new Date(invitation.expiresAt).toLocaleString('ko-KR')}
                        </small>
                      )}
                    </div>
                    {roleControl('invitations', invitation.id, invitation.email, invitation.role)}
                    {invitation.mode === 'email' &&
                      !invitation.expired &&
                      ['READY', 'FAILED'].includes(invitation.notificationStatus) && (
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => actions.retry(invitation.id)}
                        >
                          메일 요청 재시도
                        </Button>
                      )}
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => actions.remove('invitations', invitation.id)}
                      aria-label={`${invitation.email} 공유 취소`}
                    >
                      공유 취소
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
