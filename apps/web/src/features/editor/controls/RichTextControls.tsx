import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  effectiveStyle,
  mapRichTextUrls,
  normalizeRichText,
  richTextFileId,
  richTextFileIds,
  richTextFileUrl,
  type Breakpoint,
  type PageTheme,
  type UiNode,
} from '@jjapgma/ui-spec';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { api, errorMessage } from '../../../lib/api';
import { useFileAssets } from '../files/FileAssets';
import { resolveColor, themeStyle } from '../themeStyle';
import {
  RichTextSurface,
  richTextFonts,
  richTextPreview,
  useRichTextFiles,
} from '../elements/RichTextSurface';

type Props = {
  node: UiNode;
  theme?: PageTheme;
  breakpoint: Breakpoint;
  onUpdate: (change: (node: UiNode) => void) => void;
};
type Attachment = NonNullable<UiNode['props']['attachment']>;

function DocumentDialog({
  node,
  theme,
  breakpoint,
  onUpdate,
  onClose,
}: Props & { onClose: () => void }) {
  const files = useRichTextFiles(node);
  const assets = useFileAssets();
  const [draft, setDraft] = useState<string>();
  const uploaded = useRef(new Map<string, { file: Attachment; url: string }>());
  useEffect(() => {
    const files = uploaded.current;
    return () => {
      for (const { url } of files.values()) URL.revokeObjectURL(url);
    };
  }, []);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const style = effectiveStyle(node, breakpoint);
  const source = mapRichTextUrls(node.props.documentJson ?? '', (url) => {
    const id = richTextFileId(url);
    return id ? (files.urls[id] ?? url) : url;
  });
  async function upload(file: File) {
    if (!assets?.canUpload(node.id)) {
      setError('파일 첨부는 프로젝트의 편집 권한이 필요합니다.');
      throw new Error('파일 첨부는 프로젝트의 편집 권한이 필요합니다.');
    }
    setError('');
    setPending((count) => count + 1);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('category', 'tmp');
      const reference = await api<Attachment>(
        `/files/upload?projectId=${encodeURIComponent(assets.projectId)}`,
        { method: 'POST', body },
      );
      const url = await richTextPreview(`projects/${assets.projectId}`, reference);
      uploaded.current.set(reference.fileId, { file: reference, url });
      return url;
    } catch (error) {
      setError(errorMessage(error));
      throw error;
    } finally {
      setPending((count) => count - 1);
    }
  }
  function apply() {
    try {
      const reverse = new Map(Object.entries(files.urls).map(([id, url]) => [url, id]));
      for (const [id, { url }] of uploaded.current) reverse.set(url, id);
      const documentJson = normalizeRichText(
        mapRichTextUrls(draft ?? source, (url) =>
          reverse.has(url) ? richTextFileUrl(reverse.get(url)!) : url,
        ),
      );
      const ids = richTextFileIds(documentJson);
      const references = new Map(
        (node.props.richTextFiles ?? []).map((file) => [file.fileId, file]),
      );
      for (const [id, { file }] of uploaded.current) references.set(id, file);
      if ([...ids].some((id) => !references.has(id)))
        throw new Error('등록한 첨부파일만 사용할 수 있습니다.');
      onUpdate((n) => {
        n.props.documentJson = documentJson;
        n.props.richTextFiles = [...ids].map((id) => references.get(id)!);
      });
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  return (
    <Dialog
      title="본문 편집"
      description="텍스트를 선택하면 서식 도구가 나타납니다. /로 제목·목록·표를 추가하세요."
      className="rich-text-dialog"
      busy={pending > 0}
      onClose={onClose}
    >
      <div className="rich-text-tools">
        <p>
          {pending
            ? '파일을 업로드하는 중…'
            : '/image 또는 /file로 첨부하세요. 공개 링크·tmp 보존 정책 · 최대 10 MB.'}
        </p>
      </div>
      {files.error && (
        <p role="alert">
          {files.error} 첨부 블록을 삭제하거나 다시 확인할 수 있습니다.{' '}
          <Button variant="ghost" onClick={files.retry}>
            다시 확인
          </Button>
        </p>
      )}
      {files.pending ? (
        <p role="status">첨부파일을 불러오는 중…</p>
      ) : (
        <div className="rich-text-workspace">
          <RichTextSurface
            node={{ ...node, props: { ...node.props, disabled: false } }}
            value={draft ?? source}
            editing
            uploadFile={upload}
            onChange={(value) => {
              setDraft(value);
              setError('');
            }}
            style={
              {
                ...themeStyle(theme, node, style, false),
                color: resolveColor(style.color),
                background: resolveColor(style.background),
                '--element-font-size': `${style.fontSize ?? 16}px`,
                '--element-line-height': style.lineHeight ?? 1.7,
              } as CSSProperties
            }
          />
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <footer>
        <Button variant="secondary" disabled={pending > 0} onClick={onClose}>
          취소
        </Button>
        <Button disabled={pending > 0 || files.pending} onClick={apply}>
          본문 적용
        </Button>
      </footer>
    </Dialog>
  );
}

export function RichTextControls(props: Props) {
  const [open, setOpen] = useState(false);
  const { node, onUpdate } = props;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        본문 편집
      </Button>
      <label>
        표시 모드
        <select
          value={node.props.richTextMode ?? 'editor'}
          onChange={(event) =>
            onUpdate((n) => {
              n.props.richTextMode = event.target.value as 'editor' | 'viewer';
            })
          }
        >
          <option value="editor">편집기 · 입력 체험</option>
          <option value="viewer">뷰어 · 읽기 전용</option>
        </select>
      </label>
      <label>
        본문 기본 글꼴
        <select
          value={node.props.richTextFont ?? 'sans'}
          onChange={(event) =>
            onUpdate((n) => {
              n.props.richTextFont = event.target.value as 'sans' | 'serif' | 'mono';
            })
          }
        >
          {richTextFonts.map((font) => (
            <option key={font.key} value={font.key}>
              {font.label}
            </option>
          ))}
        </select>
      </label>
      <label className="check-field">
        <input
          type="checkbox"
          checked={node.props.richTextImageModal ?? true}
          onChange={(event) =>
            onUpdate((n) => {
              n.props.richTextImageModal = event.target.checked;
            })
          }
        />
        뷰어 이미지 확대
      </label>
      <details className="rich-text-help">
        <summary>서식 편집기 사용법</summary>
        <p>
          본문 편집 → 본문 적용 후 상단 저장을 누르세요. 글자 선택 후 굵기·색·크기·글꼴을 바꾸고 /로
          문단·목록·표·파일을 넣으세요.
        </p>
        <p>
          아래 디자인 속성은 전체 본문의 기본 글자 크기·행간·배경·여백에 적용됩니다. 본문에서 지정한
          개별 서식이 우선합니다.
        </p>
        <p>
          미리보기 입력은 저장되지 않습니다. 첨부파일은 임시 보존이므로 장기 보관용 템플릿은 텍스트
          중심으로 구성하세요.
        </p>
      </details>
      {open && <DocumentDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}
