import { useState } from 'react';
import { ArrowUpRight, Layers3, MousePointer2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Brand } from '../../components/ui/Brand';
import { api, errorMessage } from '../../lib/api';
export function Login({ dev, onLogin }: { dev: boolean; onLogin: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function enter() {
    setBusy(true);
    try {
      await api('/auth/dev', { method: 'POST' });
      onLogin();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <Brand />
      <div className="login-content">
        <span className="eyebrow">YOUR NEXT INTERFACE STARTS HERE</span>
        <h1>
          생각을 배치하고,
          <br />
          화면을 완성하세요<span>.</span>
        </h1>
        <p>
          하나의 설계에서 시작하는 일관된 UI.
          <br />
          짭그마에서 다음 프로젝트를 만들어 보세요.
        </p>
        <a className="button button-primary" href="/auth/login">
          Shnea 계정으로 로그인 <ArrowUpRight size={18} />
        </a>
        {dev && (
          <Button variant="secondary" loading={busy} onClick={enter}>
            개발용 워크스페이스 열기
          </Button>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
      </div>
      <div className="login-visual" aria-hidden="true">
        <div className="visual-card">
          <Layers3 />
          <span>
            Design once.
            <br />
            <b>Build together.</b>
          </span>
          <div className="visual-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="cursor-badge">
          <MousePointer2 size={18} /> Your idea
        </div>
      </div>
      <footer>짭그마 · 공통 UI 개발 플랫폼</footer>
    </main>
  );
}
