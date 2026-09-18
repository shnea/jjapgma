import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  LayoutGrid,
  Plus,
  Search,
  FolderOpen,
  LogOut,
  Layers3,
  Trash2,
  Share2,
} from 'lucide-react';
import { api, errorMessage, type Project, type User } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Brand } from '../../components/ui/Brand';
import { SharingDialog } from '../sharing/SharingDialog';
import { ProjectSelect } from './ProjectSwitcher';
import { NotificationBell } from '../notifications/NotificationBell';
import { AccountLink } from '../account/AccountPage';
export function Projects({ user, logout }: { user: User; logout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string>();
  const [sharing, setSharing] = useState<Project>();
  const requestVersion = useRef(0);
  const load = useCallback(async (showLoading = true) => {
    const version = ++requestVersion.current;
    setLoadError('');
    if (showLoading) setLoading(true);
    try {
      const next = await api<Project[]>('/projects');
      if (version === requestVersion.current) setProjects(next);
    } catch (e) {
      if (version === requestVersion.current) setLoadError(errorMessage(e));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => void load(false);
    window.addEventListener('project-access-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      requestVersion.current++;
      window.removeEventListener('project-access-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);
  async function deleteProject(id: string, projectName: string) {
    if (deleting) return;
    if (
      !window.confirm(
        `'${projectName}' 프로젝트를 삭제하시겠습니까? 소속된 모든 페이지와 파일이 삭제됩니다.`,
      )
    ) {
      return;
    }
    setDeleting(id);
    setError('');
    try {
      await api(`/projects/${id}`, { method: 'DELETE' });
      requestVersion.current++;
      setLoading(false);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(undefined);
    }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const project = await api<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      window.location.assign(`/projects/${project.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  const search = query.trim().toLocaleLowerCase('ko-KR');
  const visible = projects.filter((p) => p.name.toLocaleLowerCase('ko-KR').includes(search));
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <a href="/" aria-label="짭그마 홈">
          <Brand small />
        </a>
        <div className="workspace-switch">
          <span className="avatar">{user.displayName.slice(0, 1)}</span>
          <div>
            <ProjectSelect
              projects={projects}
              value=""
              disabled={loading}
              onChange={(id) => {
                if (id) window.location.assign(`/projects/${id}`);
              }}
            />
            <small>{user.displayName}</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          <a href="/" className="nav-item active">
            <LayoutGrid size={17} />
            프로젝트<span>{projects.length}</span>
          </a>
        </nav>
        <div className="sidebar-note">
          <Layers3 size={24} />
          <strong>하나의 설계, 같은 화면</strong>
          <p>
            프로젝트의 UI를 한곳에 모아
            <br />
            일관된 경험을 만들어 보세요.
          </p>
        </div>
        <button className="nav-item logout" onClick={logout}>
          <LogOut size={16} />
          로그아웃
        </button>
      </aside>
      <main className="workspace-main">
        <header className="workspace-top">
          <span>
            워크스페이스 <span className="muted">/</span> 프로젝트
          </span>
          <div className="workspace-account">
            <NotificationBell />
            <AccountLink user={user} />
            <span className="profile-chip" title={user.displayName}>
              <span className="online-dot" />
              <span>{user.displayName}</span>
            </span>
          </div>
        </header>
        <section className="project-section">
          <div className="section-title">
            <div>
              <h1>
                내 프로젝트<span className="count">{projects.length}</span>
              </h1>
              <p>아이디어가 실제 화면이 되는 공간입니다.</p>
            </div>
            <Button
              disabled={busy}
              aria-expanded={creating}
              aria-controls={creating ? 'create-project' : undefined}
              onClick={() => setCreating((v) => !v)}
            >
              <Plus size={17} />새 프로젝트
            </Button>
          </div>
          {creating && (
            <form id="create-project" className="create-project" onSubmit={create}>
              <label htmlFor="project-name">프로젝트 이름</label>
              <input
                autoFocus
                id="project-name"
                maxLength={100}
                required
                placeholder="어떤 프로젝트를 만들까요?"
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" loading={busy} disabled={!name.trim()}>
                프로젝트 만들기
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setCreating(false)}>
                취소
              </Button>
            </form>
          )}
          <div className="project-filters">
            <span className="filter-active">전체 프로젝트</span>
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="프로젝트 검색"
                placeholder="프로젝트 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {loadError && (
            <div className="error-banner" role="alert">
              {loadError}
              <Button variant="ghost" onClick={() => void load()}>
                다시 시도
              </Button>
            </div>
          )}
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <p role="status" className="empty-state">
              프로젝트를 불러오고 있습니다…
            </p>
          ) : (
            <div className="project-grid">
              {visible.map((project, index) => (
                <article className="project-card" key={project.id}>
                  <a
                    className="project-card-link"
                    href={`/projects/${project.id}`}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <div className={`project-thumbnail tone-${index % 3}`} aria-hidden="true">
                      <div className="mini-window">
                        <div className="mini-toolbar">
                          <i />
                          <i />
                          <i />
                        </div>
                        <div className="mini-body">
                          <div className="mini-nav" />
                          <div className="mini-content">
                            <i />
                            <span />
                            <div>
                              <b />
                              <b />
                              <b />
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="open-project">
                        <ArrowUpRight size={18} />
                      </span>
                    </div>
                  </a>
                  <div className="project-card-info">
                    <div className="project-card-header-row">
                      <h2>
                        <a href={`/projects/${project.id}`} title={project.name}>
                          {project.name}
                        </a>
                      </h2>
                      {project.role === 'OWNER' && (
                        <div className="project-card-actions">
                          <button
                            type="button"
                            className="share-project-btn"
                            aria-label={`${project.name} 공유`}
                            title="프로젝트 공유"
                            disabled={deleting === project.id}
                            onClick={() => setSharing(project)}
                          >
                            <Share2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="delete-project-btn"
                            aria-label={`${project.name} 삭제`}
                            title="프로젝트 삭제"
                            disabled={Boolean(deleting)}
                            aria-busy={deleting === project.id}
                            onClick={() => void deleteProject(project.id, project.name)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="project-card-meta">
                      <span>
                        {project.pageCount}개 페이지 ·{' '}
                        {project.role === 'VIEWER' ? '보기 전용' : '편집 가능'}
                        {project.role !== 'OWNER' && ' · 공유받음'}
                      </span>
                      <time dateTime={project.updated_at}>
                        {new Date(project.updated_at).toLocaleDateString('ko-KR')}
                      </time>
                    </div>
                  </div>
                </article>
              ))}
              {!search && (
                <button className="new-project-card" onClick={() => setCreating(true)}>
                  <span>
                    <Plus size={24} />
                  </span>
                  <strong>새 프로젝트 만들기</strong>
                  <small>빈 캔버스에서 시작해 보세요</small>
                </button>
              )}
              {search && !visible.length && (
                <div className="empty-state" role="status">
                  <FolderOpen />
                  <p>검색 결과가 없습니다.</p>
                  <Button variant="secondary" onClick={() => setQuery('')}>
                    검색 초기화
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="workspace-footer">
            <span>작은 아이디어부터, 완성된 인터페이스까지.</span>
            <span>MADE WITH JJAPGMA</span>
          </div>
        </section>
      </main>
      {sharing && (
        <SharingDialog
          projectId={sharing.id}
          projectName={sharing.name}
          onClose={() => setSharing(undefined)}
        />
      )}
    </div>
  );
}
