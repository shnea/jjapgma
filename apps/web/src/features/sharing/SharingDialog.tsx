import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { SharingPanel, type SharingData, type SharingActions } from './SharingPanel';

export function SharingDialog({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<SharingData>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => {
      element.close();
      trigger?.focus();
    };
  }, []);
  useEffect(() => {
    api<SharingData>(`/projects/${projectId}/sharing`)
      .then(setData)
      .catch((e) => setError(errorMessage(e)));
  }, [projectId]);
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError('');
    try {
      setData(
        await api<SharingData>(`/projects/${projectId}/${path}`, {
          method,
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      );
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const actions: SharingActions = {
    add: (email, role) => mutate('sharing', 'POST', { email, role }),
    change: (kind, id, role) => {
      void mutate(`${kind}/${id}`, 'PATCH', { role });
    },
    remove: (kind, id) => {
      if (window.confirm('이 사용자의 프로젝트 공유를 취소할까요?'))
        void mutate(`${kind}/${id}`, 'DELETE');
    },
    retry: (id) => {
      void mutate(`invitations/${id}/retry`, 'POST');
    },
  };
  return (
    <dialog
      ref={dialog}
      className="sharing-dialog"
      aria-labelledby="sharing-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <h2 id="sharing-title">프로젝트 공유</h2>
          <p>{projectName}</p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </header>
      <SharingPanel data={data} error={error} busy={busy} actions={actions} />
      {!data && error && (
        <Button
          variant="secondary"
          onClick={() => {
            setError('');
            void api<SharingData>(`/projects/${projectId}/sharing`)
              .then(setData)
              .catch((e) => setError(errorMessage(e)));
          }}
        >
          다시 시도
        </Button>
      )}
    </dialog>
  );
}
