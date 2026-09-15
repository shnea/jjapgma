import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Layers3, Plus } from 'lucide-react';
import { api, errorMessage, type Project } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Brand } from '../../components/ui/Brand';
import { PageEditor } from './PageEditor';
import type { Page, PageSummary } from './types';
export function Editor({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project>();
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [page, setPage] = useState<Page>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
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
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (dirty.current && !window.confirm('저장되지 않은 변경을 두고 새 페이지로 이동할까요?'))
      return;
    setBusy(true);
    setError('');
    try {
      const created = await api<Page>(`/projects/${projectId}/pages`, {
        method: 'POST',
        body: JSON.stringify({ name: newName }),
      });
      setPages((v) => [...v, created]);
      setPage({ ...created, role: project!.role });
      dirty.current = false;
      setCreating(false);
      setNewName('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const pageNav = (
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
        <strong>{project?.name ?? '프로젝트 불러오는 중'}</strong>
        <ChevronDown size={13} />
        <span className="editor-stage">워크스페이스</span>
      </div>
      {error && (
        <div role="alert" className="error-banner">
          {error}
          <a href="/">프로젝트 목록으로</a>
        </div>
      )}
      {creating && (
        <form className="create-page" onSubmit={create}>
          <label htmlFor="page-name">새 페이지</label>
          <input
            id="page-name"
            autoFocus
            required
            maxLength={100}
            placeholder="페이지 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" loading={busy}>
            페이지 만들기
          </Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            취소
          </Button>
        </form>
      )}
      {page ? (
        <PageEditor
          key={page.id}
          initial={page}
          pageNav={pageNav}
          onDirty={(value) => {
            dirty.current = value;
          }}
          onSaved={(saved) => setPages((list) => list.map((p) => (p.id === saved.id ? saved : p)))}
        />
      ) : (
        <>
          <div className="empty-editor-nav">{pageNav}</div>
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
