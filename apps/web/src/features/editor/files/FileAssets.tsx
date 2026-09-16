import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { UiNode } from '@jjapgma/ui-spec';
import { api, errorMessage } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { ExportAssetsContext } from '../export/ExportAssets';
type Attachment = NonNullable<UiNode['props']['attachment']>;
type Assets = {
  projectId: string;
  templateId?: string;
  onAttach: (nodeId: string, file: Attachment) => void;
  canUpload: (nodeId: string) => boolean;
};
const Context = createContext<Assets | null>(null);
export const FileAssetsProvider = Context.Provider;
export function FileUploadControl({ node }: { node: UiNode }) {
  const exportedAssets = useContext(ExportAssetsContext);
  const assets = useContext(Context);
  const currentAssets = useRef(assets);
  currentAssets.current = assets;
  const [settings, setSettings] = useState<{ enabled: boolean; maxBytes: number }>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (assets)
      void api<{ enabled: boolean; maxBytes: number }>('/files/config')
        .then((value) => {
          if (active) setSettings(value);
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    return () => {
      active = false;
    };
  }, [assets?.projectId]);
  async function upload(file?: File) {
    if (!file || !assets || !settings) return;
    setError('');
    if (file.size > settings.maxBytes) {
      setError(`파일은 ${Math.floor(settings.maxBytes / 1024 / 1024)} MB 이하여야 합니다.`);
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const reference = await api<Attachment>(
        `/files/upload?projectId=${encodeURIComponent(assets.projectId)}`,
        { method: 'POST', body },
      );
      currentAssets.current?.onAttach(node.id, reference);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="file-upload-control">
      <label>
        {node.type === 'image' ? '이미지 업로드' : node.props.text || '첨부파일'}
        <input
          type="file"
          accept={
            node.type === 'image'
              ? 'image/png,image/jpeg,image/gif,image/webp'
              : '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.json'
          }
          disabled={
            busy || !settings?.enabled || !assets?.canUpload(node.id) || node.props.disabled
          }
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {busy && <p role="status">업로드 중…</p>}
      {!assets ? (
        <small>프로젝트에서 파일을 업로드할 수 있습니다.</small>
      ) : settings && !settings.enabled ? (
        <small>파일 업로드 연결 설정이 필요합니다.</small>
      ) : (
        <small>
          파일 링크는 공개됩니다. 최대 {settings ? Math.floor(settings.maxBytes / 1024 / 1024) : 10}{' '}
          MB.
        </small>
      )}
      {error && <p role="alert">{error}</p>}
      {node.props.attachment &&
        !assets?.templateId &&
        (assets || exportedAssets?.[node.id]?.download) && (
          <a
            href={
              exportedAssets?.[node.id]?.download ??
              `/api/projects/${assets?.projectId}/files/${encodeURIComponent(node.props.attachment.fileId)}/download`
            }
            target="_blank"
            rel="noreferrer"
          >
            {node.props.attachment.name} 다운로드
          </a>
        )}
    </div>
  );
}
export function FileImage({ node }: { node: UiNode }) {
  const assets = useContext(Context),
    file = node.props.attachment;
  const [url, setUrl] = useState(''),
    [message, setMessage] = useState('미리보기 준비 중…'),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true,
      timer: number | undefined,
      attempts = 0;
    setUrl('');
    setMessage('미리보기 준비 중…');
    async function check() {
      if (!assets || !file) return;
      try {
        const result = await api<{ ready: boolean; previewUrl: string }>(
          `/${assets.templateId ? `templates/${assets.templateId}` : `projects/${assets.projectId}`}/files/${encodeURIComponent(file.fileId)}/preview`,
        );
        if (!active) return;
        if (result.ready) setUrl(result.previewUrl);
        else if (++attempts < 5) timer = window.setTimeout(() => void check(), 2000);
        else setMessage('미리보기를 준비하고 있습니다. 잠시 후 다시 확인하세요.');
      } catch (e) {
        if (active) setMessage(errorMessage(e));
      }
    }
    void check();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [assets?.projectId, assets?.templateId, file?.fileId, retry]);
  if (url)
    return (
      <img
        className="element-image"
        src={url}
        alt={node.props.text || file?.name || '이미지'}
        onError={() => {
          setUrl('');
          setMessage('미리보기를 불러올 수 없습니다. 파일이 만료되었을 수 있습니다.');
        }}
      />
    );
  return (
    <div className="element-image-empty">
      <span>{message}</span>
      <Button variant="ghost" onClick={() => setRetry((value) => value + 1)}>
        미리보기 다시 확인
      </Button>
    </div>
  );
}
