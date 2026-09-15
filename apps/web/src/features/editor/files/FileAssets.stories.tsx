import type { Meta, StoryObj } from '@storybook/react-vite';
import { createNode } from '@jjapgma/ui-spec';
import { FileAssetsProvider, FileUploadControl, FileImage } from './FileAssets';
const file = createNode('fileUpload');
file.id = 'story-file';
const image = createNode('image');
image.id = 'story-image';
image.props.attachment = { fileId: '14', name: 'image.png', mimeType: 'image/png' };
function Example({ preview = false }: { preview?: boolean }) {
  return (
    <FileAssetsProvider
      value={{
        projectId: '00000000-0000-4000-8000-000000000001',
        canUpload: () => true,
        onAttach: () => {},
      }}
    >
      <div style={{ padding: 24, width: 360 }}>
        {preview ? <FileImage node={image} /> : <FileUploadControl node={file} />}
      </div>
    </FileAssetsProvider>
  );
}
export default { title: '빌더/첨부파일', component: Example } satisfies Meta<typeof Example>;
export const Upload: StoryObj<typeof Example> = {};
export const Preview: StoryObj<typeof Example> = { args: { preview: true } };
