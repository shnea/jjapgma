import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { validateSpec, type Breakpoint } from '@jjapgma/ui-spec';
import { NodeRenderer } from '../NodeRenderer';
import { ExportAssetsContext, type ExportAssets } from './ExportAssets';
import { RichTextIntegrationContext, type RichTextIntegration } from './RichTextIntegration';
import '../../../styles/tokens.css';
import '../../../styles/renderer.css';
import '../../../styles/elements.css';
import '../../../styles/picker.css';
import '../../../styles/pagination.css';
import '../../../styles/page-theme.css';
import '../../../styles/table.css';
import '../../../styles/element-customization.css';
import '../../../styles/main-layout.css';

const payload = JSON.parse(document.getElementById('jjapgma-spec')!.textContent!);
const spec = validateSpec(payload.spec);
const assets: ExportAssets = payload.assets ?? {};
declare global {
  interface Window {
    jjapgmaRichText?: RichTextIntegration;
  }
}
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
      <RichTextIntegrationContext.Provider value={window.jjapgmaRichText}>
        <NodeRenderer node={spec.root} theme={spec.theme} breakpoint={device} root preview />
      </RichTextIntegrationContext.Provider>
    </ExportAssetsContext.Provider>
  );
}
createRoot(document.getElementById('root')!).render(<ExportedPage />);
