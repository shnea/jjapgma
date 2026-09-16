import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Layers3, Plus, ArchiveRestore } from 'lucide-react';
import { api, errorMessage, type Project, type User } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Brand } from '../../components/ui/Brand';
import { PageEditor } from './PageEditor';
import type { Page, PageSummary } from './types';
import { SharingDialog } from '../sharing/SharingDialog';
import { ProjectSwitcher } from '../projects/ProjectSwitcher';
import { NotificationBell } from '../notifications/NotificationBell';
import { CreatePageDialog } from './CreatePageDialog';
import { DeletedPagesDialog } from './DeletedPagesDialog';
import { McpConnections } from './McpConnections';
import { AccountLink } from '../account/AccountPage';
export function Editor({ projectId, user }: { projectId: string; user: User }) {
  const [project, setProject] = useState<Project>();
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [page, setPage] = useState<Page>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [trash, setTrash] = useState(false);
  const [mcp, setMcp] = useState(false);
  const dirty = useRef(false);
  useEffect(() => {
    Promise.all([
      api<Project>(`/projects/${projectId}`),
      api<PageSummary[]>(`/projects/${projectId}/pages`),
    ])
      .then(async ([p, list]) => {
        setProject(p);
        setPages(list);
        if (list[0]) setPage(await api<Page>(`/pages/${list[0].id}`));
      })
      .catch((e) => setError(errorMessage(e)));
  }, [projectId]);
  async function open(id: string) {
    if (
      dirty.current &&
      !window.confirm('아직 저장되지 않은 변경이 있습니다. 페이지를 이동할까요?')
    )
      return;
    setBusy(true);
    setError('');
    try {
      setPage(await api<Page>(`/pages/${id}`));
      dirty.current = false;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function create(name: string, templateId?: string) {
    if (dirty.current && !window.confirm('저장되지 않은 변경을 두고 새 페이지로 이동할까요?'))
      return;
    setBusy(true);
    setError('');
    try {
      const created = await api<Page>(`/projects/${projectId}/pages`, {
        method: 'POST',
        body: JSON.stringify({ name, templateId }),
      });
      setPages((v) => [...v, created]);
      setPage({ ...created, role: project!.role });
      dirty.current = false;
      setCreating(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleted(id: string) {
    const remaining = pages.filter((item) => item.id !== id);
    setPages(remaining);
    setPage(undefined);
    dirty.current = false;
    setBusy(true);
    try {
      if (remaining[0]) setPage(await api<Page>(`/pages/${remaining[0].id}`));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const pageNav = (actions?: React.ReactNode) => (
    <div className="page-navigation">
      <label>
        <span className="sr-only">페이지 선택</span>
        <select disabled={busy} value={page?.id ?? ''} onChange={(e) => void open(e.target.value)}>
          {!page && <option value="">페이지 선택</option>}
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <button
        aria-label="페이지 추가"
        disabled={busy || !project || project.role === 'VIEWER'}
        onClick={() => setCreating((v) => !v)}
      >
        <Plus size={16} />
      </button>
      {actions}
      <button
        aria-label="삭제된 페이지"
        title="삭제된 페이지 복원"
        disabled={busy || !project || project.role === 'VIEWER'}
        onClick={() => setTrash(true)}
      >
        <ArchiveRestore size={16} />
      </button>
    </div>
  );
  return (
    <div className="editor-shell">
      <div className="editor-project-bar">
        <a href="/" aria-label="프로젝트 목록">
          <ArrowLeft size={17} />
        </a>
        <a href="/" className="editor-brand">
          <Brand small />
        </a>
        <span className="separator" />
        <ProjectSwitcher project={project} />
        <span className="editor-stage">워크스페이스</span>
        <NotificationBell />
        <AccountLink user={user} />
        {project?.role === 'OWNER' && (
          <Button variant="secondary" onClick={() => setSharing(true)}>
            공유
          </Button>
        )}
      </div>
      {sharing && project && (
        <SharingDialog
          projectId={projectId}
          projectName={project.name}
          onClose={() => setSharing(false)}
        />
      )}
      {error && (
        <div role="alert" className="error-banner">
          {error}
          <a href="/">프로젝트 목록으로</a>
        </div>
      )}
      {creating && (
        <CreatePageDialog
          busy={busy}
          error={error}
          onCreate={create}
          onClose={() => setCreating(false)}
        />
      )}
      {mcp && (
        <McpConnections
          projectId={projectId}
          readOnly={project?.role === 'VIEWER'}
          onClose={() => setMcp(false)}
        />
      )}
      {trash && (
        <DeletedPagesDialog
          projectId={projectId}
          onClose={() => setTrash(false)}
          onRestore={async (deleted, revision) => {
            if (
              dirty.current &&
              !window.confirm('저장되지 않은 변경을 두고 복원한 페이지로 이동할까요?')
            )
              return false;
            const restored = await api<Page>(`/pages/${deleted.id}/restore`, {
              method: 'POST',
              body: JSON.stringify({ baseRevision: deleted.revision, revision }),
            });
            setPages((items) => [...items.filter((item) => item.id !== restored.id), restored]);
            setPage(restored);
            dirty.current = false;
            setError('');
            return true;
          }}
        />
      )}
      {page ? (
        <PageEditor
          key={page.id}
          initial={page}
          pageNav={pageNav}
          onMcp={() => setMcp(true)}
          onDeleted={deleted}
          onDirty={(value) => {
            dirty.current = value;
          }}
          onSaved={(saved) => setPages((list) => list.map((p) => (p.id === saved.id ? saved : p)))}
          onAiCreated={(saved) => {
            setPages((list) => [...list.filter((p) => p.id !== saved.id), saved]);
            setPage(saved);
            dirty.current = false;
          }}
        />
      ) : (
        <>
          <div className="empty-editor-nav">
            {pageNav()}
            <Button variant="ghost" disabled={!project} onClick={() => setMcp(true)}>
              MCP 연결
            </Button>
          </div>
          <main className="empty-editor">
            <span className="empty-editor-icon">
              <Layers3 size={36} />
            </span>
            <span className="eyebrow">A BLANK CANVAS. ENDLESS POSSIBILITIES.</span>
            <h1>첫 화면을 만들어 볼까요?</h1>
            <p>
              페이지를 만들고 요소를 배치해 보세요.
              <br />
              작은 아이디어가 시작되는 곳입니다.
            </p>
            {project?.role !== 'VIEWER' && (
              <Button disabled={!project} onClick={() => setCreating(true)}>
                <Plus size={17} />첫 페이지 만들기
              </Button>
            )}
          </main>
        </>
      )}
    </div>
  );
}
