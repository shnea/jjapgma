import { useEffect, useState } from 'react';
import { ArrowUpRight, LayoutGrid, Plus, Search, FolderOpen, LogOut, Layers3 } from 'lucide-react';
import { api, errorMessage, type Project, type User } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Brand } from '../../components/ui/Brand';
export function Projects({ user, logout }: { user: User; logout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  function load() {
    setError('');
    setLoading(true);
    api<Project[]>('/projects')
      .then(setProjects)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const project = await api<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      window.location.assign(`/projects/${project.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  const visible = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <a href="/" aria-label="짭그마 홈">
          <Brand small />
        </a>
        <div className="workspace-switch">
          <span className="avatar">{user.displayName.slice(0, 1)}</span>
          <div>
            <strong>나의 워크스페이스</strong>
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
          <span className="profile-chip">
            <span className="online-dot" />
            {user.displayName}
          </span>
        </header>
        <section className="project-section">
          <div className="section-title">
            <div>
              <span className="eyebrow">YOUR CREATIVE SPACE</span>
              <h1>
                내 프로젝트<span className="count">{projects.length}</span>
              </h1>
              <p>아이디어가 실제 화면이 되는 공간입니다.</p>
            </div>
            <Button onClick={() => setCreating((v) => !v)}>
              <Plus size={17} />새 프로젝트
            </Button>
          </div>
          {creating && (
            <form className="create-project" onSubmit={create}>
              <label htmlFor="project-name">프로젝트 이름</label>
              <input
                autoFocus
                id="project-name"
                maxLength={100}
                required
                placeholder="어떤 프로젝트를 만들까요?"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" loading={busy}>
                프로젝트 만들기
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>
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
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <Button variant="ghost" onClick={load}>
                다시 시도
              </Button>
            </div>
          )}
          {loading ? (
            <p role="status" className="empty-state">
              프로젝트를 불러오고 있습니다…
            </p>
          ) : (
            <div className="project-grid">
              {visible.map((project, index) => (
                <a className="project-card" key={project.id} href={`/projects/${project.id}`}>
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
                  <div className="project-card-info">
                    <h2>{project.name}</h2>
                    <div>
                      <span>
                        {project.pageCount}개 페이지 ·{' '}
                        {project.role === 'VIEWER' ? '보기 전용' : '편집 가능'}
                      </span>
                      <time>{new Date(project.updated_at).toLocaleDateString('ko-KR')}</time>
                    </div>
                  </div>
                </a>
              ))}
              {!query && (
                <button className="new-project-card" onClick={() => setCreating(true)}>
                  <span>
                    <Plus size={24} />
                  </span>
                  <strong>새 프로젝트 만들기</strong>
                  <small>빈 캔버스에서 시작해 보세요</small>
                </button>
              )}
              {query && !visible.length && (
                <div className="empty-state">
                  <FolderOpen />
                  <p>검색 결과가 없습니다.</p>
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
    </div>
  );
}
