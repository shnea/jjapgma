import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { validateSpec, type Breakpoint } from '@jjapgma/ui-spec';
import { NodeRenderer } from '../NodeRenderer';
import { ExportAssetsContext, type ExportAssets } from './ExportAssets';
import '../../../styles/tokens.css';
import '../../../styles/renderer.css';
import '../../../styles/elements.css';
import '../../../styles/picker.css';
import '../../../styles/pagination.css';

const payload = JSON.parse(document.getElementById('jjapgma-spec')!.textContent!);
const spec = validateSpec(payload.spec);
const assets: ExportAssets = payload.assets ?? {};
const breakpoint = (): Breakpoint =>
  window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
function ExportedPage() {
  const [device, setDevice] = useState(breakpoint);
  useEffect(() => {
    const resize = () => setDevice(breakpoint());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return (
    <ExportAssetsContext.Provider value={assets}>
      <NodeRenderer node={spec.root} breakpoint={device} root preview />
    </ExportAssetsContext.Provider>
  );
}
createRoot(document.getElementById('root')!).render(<ExportedPage />);
