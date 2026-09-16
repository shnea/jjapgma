import type { UiSpec } from '@jjapgma/ui-spec';
import { NodeRenderer } from './NodeRenderer';
import { FileAssetsProvider } from './files/FileAssets';
export function PagePreview({
  spec,
  projectId,
  templateId,
}: {
  spec: UiSpec;
  projectId?: string;
  templateId?: string;
}) {
  const content = (
    <NodeRenderer root preview node={spec.root} theme={spec.theme} breakpoint="desktop" />
  );
  return (
    <div className="page-spec-preview" role="img" aria-label="페이지 미리보기" tabIndex={0}>
      <div inert aria-hidden="true">
        {projectId || templateId ? (
          <FileAssetsProvider
            value={{
              projectId: projectId ?? '',
              templateId,
              canUpload: () => false,
              onAttach: () => {},
            }}
          >
            {content}
          </FileAssetsProvider>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
