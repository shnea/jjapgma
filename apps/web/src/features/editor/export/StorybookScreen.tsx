import { useEffect, useState } from 'react';
import { validateSpec, type UiSpec, type Breakpoint } from '@jjapgma/ui-spec';
import { NodeRenderer } from '../NodeRenderer';
import { ExportAssetsContext, type ExportAssets } from './ExportAssets';
import '../../../styles/tokens.css';
import '../../../styles/renderer.css';
import '../../../styles/elements.css';
import '../../../styles/picker.css';
import '../../../styles/pagination.css';
import '../../../styles/page-theme.css';
import '../../../styles/table.css';
import '../../../styles/element-customization.css';
import '../../../styles/main-layout.css';

export function Screen({
  spec: input,
  assets = {},
  device = 'desktop',
}: {
  spec: UiSpec;
  assets?: ExportAssets;
  device?: Breakpoint;
}) {
  const spec = validateSpec(input);
  const [height, setHeight] = useState(800);
  useEffect(() => {
    const resize = () => setHeight(window.innerHeight);
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return (
    <div
      style={{
        width: device === 'mobile' ? 375 : device === 'tablet' ? 768 : '100%',
        maxWidth: '100%',
        minHeight: height,
        margin: 'auto',
      }}
    >
      <ExportAssetsContext.Provider value={assets}>
        <NodeRenderer
          key={spec.root.id}
          node={spec.root}
          theme={spec.theme}
          breakpoint={device}
          root
          preview
        />
      </ExportAssetsContext.Provider>
    </div>
  );
}
