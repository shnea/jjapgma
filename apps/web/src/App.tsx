import { useEffect, useState } from 'react';
import { api, ApiError, errorMessage, setCsrf, type User } from './lib/api';
import { Login } from './features/auth/Login';
import { Projects } from './features/projects/Projects';
import { Editor } from './features/editor/Editor';
import { Button } from './components/ui/Button';
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dev, setDev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setError('');
    setLoading(true);
    try {
      const settings = await api<{ devAuthEnabled: boolean }>('/auth/config');
      setDev(settings.devAuthEnabled);
      const identity = await api<User>('/auth/me');
      setCsrf(identity.csrfToken);
      setUser(identity);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function logout() {
    try {
      const result = await api<{ redirect: string }>('/auth/logout', { method: 'POST' });
      window.location.assign(result.redirect);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (loading)
    return (
      <main className="loading-screen" role="status">
        워크스페이스를 준비하고 있습니다…
      </main>
    );
  if (error)
    return (
      <main className="loading-screen">
        <p role="alert">{error}</p>
        <Button onClick={() => void load()}>다시 시도</Button>
      </main>
    );
  if (!user) return <Login dev={dev} onLogin={() => void load()} />;
  const project = /^\/projects\/([0-9a-f-]{36})$/.exec(window.location.pathname);
  return project ? (
    <Editor projectId={project[1]} />
  ) : (
    <Projects user={user} logout={() => void logout()} />
  );
}
