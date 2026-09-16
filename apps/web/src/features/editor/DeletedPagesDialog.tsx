import { useEffect, useState } from 'react';
import type { UiSpec } from '@jjapgma/ui-spec';
import { api, errorMessage } from '../../lib/api';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { PagePreview } from './PagePreview';
import type { Page } from './types';
type DeletedPage = { id: string; name: string; revision: number; deleted_at: string };
type Revision = { revision: number; name: string; created_at: string };
export function DeletedPagesDialog({
  projectId,
  onClose,
  onRestore,
}: {
  projectId: string;
  onClose: () => void;
  onRestore: (page: DeletedPage, revision: number) => Promise<boolean>;
}) {
  const [pages, setPages] = useState<DeletedPage[]>();
  const [selected, setSelected] = useState('');
  const [versions, setVersions] = useState<Revision[]>([]);
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<{ name: string; spec: UiSpec }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    setPages(undefined);
    setSelected('');
    setVersions([]);
    setRevision(0);
    setPreview(undefined);
    void api<DeletedPage[]>(`/projects/${projectId}/deleted-pages`)
      .then((list) => {
        if (active) {
          setPages(list);
          setSelected(list[0]?.id ?? '');
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [projectId, refresh]);
  useEffect(() => {
    let active = true;
    setVersions([]);
    setRevision(0);
    setPreview(undefined);
    setMore(false);
    if (selected) {
      setLoading(true);
      void api<Revision[]>(`/pages/${selected}/revisions`)
        .then((list) => {
          if (active) {
            setVersions(list);
            setRevision(list[0]?.revision ?? 0);
            setMore(list.length === 50);
          }
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [selected]);
  useEffect(() => {
    let active = true;
    setPreview(undefined);
    if (selected && revision)
      void api<Pick<Page, 'name' | 'spec'>>(`/pages/${selected}/revisions/${revision}`)
        .then((value) => {
          if (active) setPreview(value);
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    return () => {
      active = false;
    };
  }, [selected, revision]);
  async function older() {
    setLoading(true);
    setError('');
    try {
      const list = await api<Revision[]>(
        `/pages/${selected}/revisions?before=${versions.at(-1)!.revision}`,
      );
      setVersions((current) => [...current, ...list]);
      setMore(list.length === 50);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  async function restore() {
    const page = pages?.find((item) => item.id === selected);
    if (!page || !preview) return;
    setBusy(true);
    setError('');
    try {
      if (await onRestore(page, revision)) onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="삭제된 페이지 복원" busy={busy} onClose={onClose}>
      <p className="library-note">
        삭제 전에 저장된 버전을 확인하고 복원하세요. 기존 기록은 유지되고 선택한 내용이 새 버전으로
        저장됩니다.
      </p>
      {error && (
        <div role="alert">
          <p className="error-text">{error}</p>
          <Button variant="ghost" disabled={busy} onClick={() => setRefresh((v) => v + 1)}>
            목록 다시 불러오기
          </Button>
        </div>
      )}
      {!pages && !error && <p role="status">삭제된 페이지를 불러오고 있습니다…</p>}
      {pages?.length === 0 && <p>삭제된 페이지가 없습니다.</p>}
      {Boolean(pages?.length) && (
        <>
          <div className="restore-selectors">
            <label>
              삭제된 페이지
              <select
                aria-label="삭제된 페이지"
                value={selected}
                disabled={busy || loading}
                onChange={(e) => setSelected(e.target.value)}
              >
                {pages!.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {new Date(item.deleted_at).toLocaleString('ko-KR')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              복원할 버전
              <select
                aria-label="복원할 버전"
                value={revision}
                disabled={busy || loading || !versions.length}
                onChange={(e) => setRevision(Number(e.target.value))}
              >
                {versions.map((item) => (
                  <option key={item.revision} value={item.revision}>
                    v{item.revision} · {item.name} ·{' '}
                    {new Date(item.created_at).toLocaleString('ko-KR')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {more && (
            <Button variant="ghost" disabled={busy} loading={loading} onClick={() => void older()}>
              이전 버전 더 보기
            </Button>
          )}
          {preview ? (
            <PagePreview spec={preview.spec} projectId={projectId} />
          ) : (
            !error && <p role="status">버전 미리보기를 불러오고 있습니다…</p>
          )}
          <footer>
            <Button loading={busy} disabled={!preview || loading} onClick={() => void restore()}>
              선택한 버전으로 복원
            </Button>
          </footer>
        </>
      )}
    </Dialog>
  );
}
