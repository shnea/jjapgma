import {
  BlockNoteEditor,
  BlockNoteViewer,
  type BlockNoteEditorHandle,
  type BlockNoteTheme,
} from '@shnea/blocknote';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { mapRichTextUrls, richTextFileId, type UiNode } from '@jjapgma/ui-spec';
import { api, errorMessage } from '../../../lib/api';
import { useFileAssets } from '../files/FileAssets';
import { ExportAssetsContext } from '../export/ExportAssets';
import { RichTextIntegrationContext } from '../export/RichTextIntegration';
import '@shnea/blocknote/style.css';
import './rich-text.css';

export const richTextFonts = [
  { key: 'sans', label: '고딕', value: 'system-ui, sans-serif' },
  { key: 'serif', label: '명조', value: 'Georgia, "Noto Serif KR", serif' },
  { key: 'mono', label: '고정폭', value: 'ui-monospace, monospace' },
] as const;
const fontSizes = [12, 14, 16, 18, 20, 24, 32, 40].map((size) => ({
  label: `${size}px`,
  value: `${size}px`,
}));
export async function richTextPreview(
  scope: string,
  file: NonNullable<UiNode['props']['attachment']>,
) {
  for (let attempt = 0; file.mimeType.startsWith('image/') && attempt < 5; attempt++) {
    const value = await api<{ ready: boolean; previewUrl: string }>(
      `/${scope}/files/${encodeURIComponent(file.fileId)}/preview`,
    );
    if (value.ready) break;
    if (attempt === 4)
      throw new Error('첨부파일 미리보기를 준비 중입니다. 잠시 후 다시 시도하세요.');
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const response = await fetch(`/api/${scope}/files/${encodeURIComponent(file.fileId)}/content`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error('첨부파일을 불러오지 못했습니다. 만료 여부와 권한을 확인하세요.');
  return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: file.mimeType }));
}

export function useRichTextFiles(node: UiNode) {
  const assets = useFileAssets();
  const exported = useContext(ExportAssetsContext);
  const scope = assets?.templateId
    ? `templates/${assets.templateId}`
    : assets
      ? `projects/${assets.projectId}`
      : '';
  const references = JSON.stringify(node.props.richTextFiles ?? []);
  const ids = (node.props.richTextFiles ?? []).map((file) => file.fileId).join(',');
  const [state, setState] = useState<{ key: string; urls: Record<string, string>; error: string }>({
    key: '',
    urls: {},
    error: '',
  });
  const [retry, setRetry] = useState(0);
  const key = `${scope}:${node.id}:${ids}:${retry}`;
  useEffect(() => {
    let active = true;
    const loaded: string[] = [];
    if (exported || !ids) return;
    if (!scope) {
      setState({ key, urls: {}, error: '프로젝트에서 첨부파일을 확인할 수 있습니다.' });
      return;
    }
    void Promise.allSettled(
      (JSON.parse(references) as NonNullable<UiNode['props']['richTextFiles']>).map(
        async (file) => {
          const url = await richTextPreview(scope, file);
          if (!active) URL.revokeObjectURL(url);
          else loaded.push(url);
          return [file.fileId, url] as const;
        },
      ),
    ).then((entries) => {
      const failed = entries.find((entry) => entry.status === 'rejected');
      if (active)
        setState({
          key,
          urls: Object.fromEntries(
            entries.flatMap((entry) => (entry.status === 'fulfilled' ? [entry.value] : [])),
          ),
          error: failed?.status === 'rejected' ? errorMessage(failed.reason) : '',
        });
    });
    return () => {
      active = false;
      loaded.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [key, ids, scope, exported, references]);
  const urls = exported
    ? Object.fromEntries(
        (node.props.richTextFiles ?? []).map((file) => [
          file.fileId,
          exported[`${node.id}:file:${file.fileId}`]?.src ?? '',
        ]),
      )
    : state.key === key
      ? state.urls
      : {};
  return {
    urls,
    pending: !!ids && !exported && state.key !== key,
    error: state.key === key ? state.error : '',
    retry: () => setRetry((v) => v + 1),
  };
}

export function RichTextSurface({
  node,
  value,
  onChange,
  uploadFile,
  editing = false,
  style,
}: {
  node: UiNode;
  value: string;
  onChange?: (value: string) => void;
  uploadFile?: (file: File) => Promise<string>;
  editing?: boolean;
  style?: CSSProperties;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const editor = useRef<BlockNoteEditorHandle>(null);
  useLayoutEffect(() => {
    const dialog = surface.current?.closest('dialog');
    const portal = editing ? editor.current?.getEditor().portalElement : undefined;
    // @shnea/blocknote mounts its portal under body. A native modal makes body inert;
    // keep the editor-owned portal inside the dialog's top layer instead.
    if (dialog && portal) dialog.appendChild(portal);
  }, [editing]);
  useEffect(() => {
    if (!editing) return;
    const host = surface.current!;
    let frame = 0;
    const positionMenu = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const menu = host.querySelector<HTMLElement>('.shnea-blocknote-image-menu');
        if (!menu) return;
        // The package uses pointer viewport coordinates as fixed CSS offsets. Account
        // for builder canvas zoom, then keep all four presets inside the viewport.
        menu.style.translate = '';
        const bounds = menu.getBoundingClientRect();
        const scale = bounds.width / menu.offsetWidth || 1;
        const left = Math.max(
          8,
          Math.min(parseFloat(menu.style.left), innerWidth - bounds.width - 8),
        );
        const top = Math.max(
          8,
          Math.min(parseFloat(menu.style.top), innerHeight - bounds.height - 8),
        );
        menu.style.translate = `${(left - bounds.left) / scale}px ${(top - bounds.top) / scale}px`;
      });
    };
    host.addEventListener('click', positionMenu, true);
    window.addEventListener('resize', positionMenu);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener('click', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };
  }, [editing]);
  // The package does not expose DOM accessibility props for its document or table scrollers.
  useEffect(() => {
    const document = surface.current?.querySelector('.bn-editor');
    document?.setAttribute('aria-label', node.props.text || '서식 본문');
    document?.setAttribute('aria-readonly', String(!editing || !!node.props.disabled));
    surface.current?.querySelectorAll<HTMLElement>('.tableWrapper').forEach((table) => {
      table.tabIndex = 0;
      table.setAttribute('role', 'region');
      table.setAttribute('aria-label', '본문 표');
    });
  }, [value, editing, node.props.text, node.props.disabled]);
  const theme: BlockNoteTheme = {
    colors: { editor: { text: 'inherit', background: 'transparent' } },
    fontFamily: richTextFonts.find((font) => font.key === (node.props.richTextFont ?? 'sans'))!
      .value,
    borderRadius: 6,
  };
  return (
    <div
      ref={surface}
      className="rich-text-surface"
      style={{ '--rich-text-font': theme.fontFamily, ...style } as CSSProperties}
    >
      {editing ? (
        <BlockNoteEditor
          ref={editor}
          value={value}
          theme={theme}
          fontFamilies={richTextFonts}
          fontSizes={fontSizes}
          editable={!node.props.disabled}
          onChange={onChange}
          uploadFile={
            uploadFile ??
            (async () => {
              throw new Error('파일 첨부는 디자인 속성의 본문 편집에서 사용할 수 있습니다.');
            })
          }
        />
      ) : (
        <BlockNoteViewer
          key={value ? 'document' : 'empty'}
          value={value}
          theme={theme}
          fontFamilies={richTextFonts}
          enableImageModal={node.props.richTextImageModal ?? true}
        />
      )}
    </div>
  );
}

export function RichTextElement({ node, preview }: { node: UiNode; preview: boolean }) {
  const integration = useContext(RichTextIntegrationContext);
  const files = useRichTextFiles(node);
  const [draft, setDraft] = useState<string>();
  const [uploadError, setUploadError] = useState('');
  useEffect(() => {
    setDraft(undefined);
  }, [node.props.documentJson, preview]);
  const value = mapRichTextUrls(node.props.documentJson ?? '', (url) => {
    const id = richTextFileId(url);
    return id ? (files.urls[id] ?? '') : url;
  });
  const editing = preview && node.props.richTextMode !== 'viewer';
  return (
    <>
      {files.pending && <p role="status">첨부파일을 불러오는 중…</p>}
      {files.error && (
        <p role="alert">
          {files.error}{' '}
          <button type="button" onClick={files.retry}>
            다시 확인
          </button>
        </p>
      )}
      {editing && !integration && (
        <p className="rich-text-preview-note">입력 체험 · 변경 내용은 저장되지 않습니다</p>
      )}
      {uploadError && <p role="alert">{uploadError}</p>}
      <RichTextSurface
        node={node}
        value={draft ?? value}
        editing={editing && !files.pending}
        onChange={(value) => {
          setDraft(value);
          integration?.onChange(node.id, value);
        }}
        uploadFile={async (file) => {
          setUploadError('');
          try {
            if (!integration)
              throw new Error('파일 첨부는 디자인 속성의 본문 편집에서 사용할 수 있습니다.');
            const body = new FormData();
            body.set('file', file);
            // Real app uploads use file-service's default retention, never the builder's tmp.
            const url = await integration.uploadFile(node.id, body);
            const parsed = new URL(url);
            if (
              !['http:', 'https:'].includes(parsed.protocol) ||
              parsed.username ||
              parsed.password
            )
              throw new Error('업로드 결과는 유효한 HTTP(S) 파일 주소여야 합니다.');
            return parsed.href;
          } catch {
            const message = integration
              ? '파일을 첨부하지 못했습니다. 업로드 연결을 확인하고 다시 시도하세요.'
              : '파일 첨부는 디자인 속성의 본문 편집에서 사용할 수 있습니다.';
            setUploadError(message);
            throw new Error(message);
          }
        }}
      />
    </>
  );
}
