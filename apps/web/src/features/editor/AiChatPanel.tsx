import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Plus, X, LoaderCircle } from 'lucide-react';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatComposer } from '../../components/chat/ChatComposer';
import type { Breakpoint, UiSpec } from '@jjapgma/ui-spec';
import { api, ApiError, errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { NodeRenderer } from './NodeRenderer';
import { prepareChatImage, imagePreparationSummary } from './prepareChatImage';
export type Proposal = {
  id: string;
  page_id: string | null;
  name: string;
  summary: string;
  status: 'pending' | 'applied' | 'rejected';
  base_revision: number | null;
  spec?: UiSpec;
  review?: {
    revision: number | null;
    merged: { name: string; spec: UiSpec } | null;
    conflicts: string[];
  };
};
export type ApplyOptions = { mode: 'merge' | 'overwrite'; expectedRevision?: number };
type ChatHistory = {
  enabled: boolean;
  threads: { id: string; title: string }[];
  runs: {
    id: string;
    thread_id: string;
    page_id: string;
    prompt: string;
    reply: string | null;
    status: string;
    created_at?: string;
    completed_at?: string | null;
    image?: ChatImage | null;
  }[];
};
type ChatImage = { fileId: string; name: string; mimeType: string };
function ReferenceImage({ projectId, image }: { projectId: string; image: ChatImage }) {
  const [url, setUrl] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl('');
    setUnavailable(false);
    api<{ ready: boolean; previewUrl: string }>(
      `/projects/${projectId}/files/${encodeURIComponent(image.fileId)}/preview`,
    )
      .then((r) => {
        if (active) {
          if (r.ready && /^https?:\/\//.test(r.previewUrl)) setUrl(r.previewUrl);
          else setUnavailable(true);
        }
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [projectId, image.fileId]);
  return (
    <div className="ai-reference-image">
      {url && !unavailable ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={image.name} onError={() => setUnavailable(true)} />
        </a>
      ) : (
        <span>{unavailable ? '미리보기를 불러올 수 없습니다.' : '이미지 불러오는 중…'}</span>
      )}
      <small>{image.name}</small>
    </div>
  );
}
export function AiChatPanel({
  projectId,
  pageId,
  pageName,
  selectedId,
  selectedName,
  revision,
  breakpoint,
  dirty,
  readOnly,
  busy,
  onSave,
  onApply,
}: {
  projectId: string;
  pageId: string;
  pageName: string;
  selectedId: string;
  selectedName: string;
  revision: number;
  breakpoint: Breakpoint;
  dirty: boolean;
  readOnly: boolean;
  busy: boolean;
  onSave: () => Promise<boolean>;
  onApply: (proposal: Proposal, options: ApplyOptions) => Promise<void>;
}) {
  const [history, setHistory] = useState<ChatHistory>({ enabled: false, threads: [], runs: [] }),
    [proposals, setProposals] = useState<Proposal[]>([]),
    [thread, setThread] = useState<string>(),
    [draft, setDraft] = useState(''),
    [error, setError] = useState(''),
    [sending, setSending] = useState(false),
    [preview, setPreview] = useState<Proposal>(),
    [working, setWorking] = useState(false);
  const [attachment, setAttachment] = useState<ChatImage>();
  const [applyMode, setApplyMode] = useState<'merge' | 'overwrite'>('merge');
  const [uploading, setUploading] = useState(false);
  const [imageSummary, setImageSummary] = useState('');
  const [uploadStage, setUploadStage] = useState('');
  const uploadLock = useRef(false);
  const [pendingPrompt, setPendingPrompt] = useState<{
    text: string;
    time: string;
    image?: ChatImage;
  }>();
  const transcript = useRef<HTMLDivElement>(null),
    follow = useRef(true),
    sendLock = useRef(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const alive = useRef(true),
    picked = useRef(false);
  useEffect(() => {
    alive.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const [h, p] = await Promise.all([
          api<ChatHistory>(`/projects/${projectId}/chat`),
          api<Proposal[]>(`/projects/${projectId}/proposals`),
        ]);
        if (!alive.current) return;
        setHistory(h);
        setProposals(p);
        if (!picked.current) {
          setThread(h.threads[0]?.id);
          picked.current = true;
        }
      } catch (e) {
        if (alive.current) setError(errorMessage(e));
      } finally {
        if (alive.current) timer = setTimeout(refresh, 2500);
      }
    };
    void refresh();
    return () => {
      alive.current = false;
      clearTimeout(timer);
    };
  }, [projectId]);
  const running = history.runs.some((r) => r.status === 'running');
  useEffect(() => {
    if (follow.current && transcript.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [history.runs, proposals, pendingPrompt, thread]);
  async function upload(file?: File) {
    if (!file || readOnly || uploading || sending || running || uploadLock.current) return;
    uploadLock.current = true;
    setUploading(true);
    setUploadStage('이미지 축소·압축 중…');
    setError('');
    try {
      const prepared = await prepareChatImage(file);
      if (!alive.current) return;
      setUploadStage('압축 이미지 업로드 중…');
      const body = new FormData();
      body.set('file', prepared.file);
      const result = await api<ChatImage>(`/files/upload?projectId=${projectId}`, {
        method: 'POST',
        body,
      });
      if (alive.current) {
        setAttachment(result);
        setImageSummary(imagePreparationSummary(prepared));
      }
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      uploadLock.current = false;
      if (alive.current) setUploading(false);
    }
  }
  async function send() {
    if (
      !history.enabled ||
      !draft.trim() ||
      dirty ||
      busy ||
      sending ||
      running ||
      uploading ||
      sendLock.current
    )
      return;
    sendLock.current = true;
    follow.current = true;
    setPendingPrompt({ text: draft, time: new Date().toISOString(), image: attachment });
    setSending(true);
    setError('');
    try {
      const r = await api<{ threadId: string }>(`/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          threadId: thread,
          pageId,
          message: draft,
          currentRevision: revision,
          selectedNodeIds: [selectedId],
          currentBreakpoint: breakpoint,
          imageFileId: attachment?.fileId,
        }),
      });
      if (alive.current) {
        setThread(r.threadId);
        picked.current = true;
        setDraft((current) => (current === draft ? '' : current));
        setAttachment(undefined);
        setImageSummary('');
        setHistory(await api(`/projects/${projectId}/chat`));
      }
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      sendLock.current = false;
      if (alive.current) {
        setSending(false);
        setPendingPrompt(undefined);
      }
    }
  }
  async function inspect(id: string) {
    setError('');
    try {
      setApplyMode('merge');
      setPreview(await api<Proposal>(`/proposals/${id}/review`));
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function apply() {
    if (!preview || dirty || readOnly || busy) return;
    setWorking(true);
    setError('');
    try {
      await onApply(preview, {
        mode: applyMode,
        expectedRevision: preview.review?.revision ?? undefined,
      });
      if (alive.current) {
        setPreview(undefined);
        setProposals(await api(`/projects/${projectId}/proposals`));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && alive.current) {
        try {
          setApplyMode('merge');
          setPreview(await api<Proposal>(`/proposals/${preview.id}/review`));
        } catch {
          /* Keep the original conflict visible; do not apply without another review. */
        }
      }
      if (alive.current) setError(errorMessage(e));
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  async function reject(id: string) {
    setWorking(true);
    setError('');
    try {
      await api(`/proposals/${id}`, { method: 'DELETE' });
      setProposals(await api(`/projects/${projectId}/proposals`));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-context">
        <strong>{pageName}</strong>
        <small>
          선택: {selectedName} ·{' '}
          {breakpoint === 'mobile' ? '모바일' : breakpoint === 'tablet' ? '태블릿' : '데스크톱'}
        </small>
      </div>
      <div className="ai-thread-picker">
        <select
          aria-label="AI 대화 선택"
          value={thread ?? ''}
          onChange={(e) => {
            picked.current = true;
            setThread(e.target.value || undefined);
            follow.current = true;
          }}
        >
          <option value="">새 대화</option>
          {history.threads.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          aria-label="새 AI 대화"
          onClick={() => {
            picked.current = true;
            setThread(undefined);
            follow.current = true;
          }}
        >
          <Plus size={16} />
        </Button>
      </div>
      {!history.enabled && (
        <p className="ai-notice">
          n8n 연결을 준비 중입니다. 프로젝트 MCP 연결과 변경 제안 검토는 사용할 수 있습니다.
        </p>
      )}
      <div
        className="ai-transcript"
        ref={transcript}
        tabIndex={0}
        aria-label="대화 내용"
        onScroll={(e) => {
          const el = e.currentTarget;
          follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 70;
        }}
      >
        <div className="ai-messages" role="log" aria-label="AI 대화 메시지" aria-live="polite">
          {history.runs
            .filter((r) => r.thread_id === thread)
            .map((r) => (
              <div key={r.id}>
                <ChatMessage copyable role="user" content={r.prompt} time={r.created_at}>
                  {r.image && <ReferenceImage projectId={projectId} image={r.image} />}
                </ChatMessage>
                <ChatMessage
                  role="assistant"
                  copyable
                  content={r.reply ?? ''}
                  time={r.completed_at}
                  pending={r.status === 'running'}
                  failed={r.status === 'failed'}
                />
              </div>
            ))}
          {pendingPrompt &&
            !history.runs.some((r) => r.thread_id === thread && r.status === 'running') && (
              <>
                <ChatMessage role="user" content={pendingPrompt.text} time={pendingPrompt.time}>
                  {pendingPrompt.image && (
                    <ReferenceImage projectId={projectId} image={pendingPrompt.image} />
                  )}
                </ChatMessage>
                <ChatMessage role="assistant" content="" pending />
              </>
            )}
          {!pendingPrompt && !history.runs.some((r) => r.thread_id === thread) && (
            <p className="panel-help">
              “회원 목록 화면을 그려줘” 또는 “선택한 버튼을 오른쪽으로 옮겨줘”처럼 요청해 보세요.
            </p>
          )}
        </div>
        <section className="ai-proposals" aria-label="화면 변경 제안">
          {proposals
            .filter((p) => p.status === 'pending')
            .map((p) => (
              <article key={p.id}>
                <strong>{p.name}</strong>
                <p>{p.summary}</p>
                <small>{p.page_id ? '기존 페이지 변경' : '새 페이지 생성'}</small>
                <div>
                  <Button variant="secondary" disabled={working} onClick={() => void inspect(p.id)}>
                    미리보기
                  </Button>
                  <Button variant="ghost" disabled={working} onClick={() => void reject(p.id)}>
                    거절
                  </Button>
                </div>
              </article>
            ))}
        </section>
      </div>
      <div className="ai-chat-footer">
        {error && <p role="alert">{error}</p>}
        {dirty && (
          <p className="ai-notice">
            편집한 내용을 저장한 뒤 질문하거나 변경을 적용해 주세요.{' '}
            <Button variant="ghost" disabled={busy} onClick={() => void onSave()}>
              현재 화면 저장
            </Button>
          </p>
        )}
        {readOnly && <p className="panel-help">보기 권한에서는 질문과 화면 조회만 가능합니다.</p>}
        <ChatComposer
          value={draft}
          onChange={setDraft}
          onSend={() => void send()}
          label="AI에게 요청"
          placeholder="어떤 화면을 만들까요?"
          disabled={!history.enabled || dirty || busy || uploading}
          pending={sending || running}
        >
          {attachment && (
            <div className="ai-attached">
              <ReferenceImage projectId={projectId} image={attachment} />
              <Button
                variant="ghost"
                aria-label="첨부 이미지 제거"
                disabled={sending || running || uploading}
                onClick={() => {
                  setAttachment(undefined);
                  setImageSummary('');
                }}
              >
                <X size={16} />
              </Button>
            </div>
          )}
          <input
            ref={imageInput}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-label="참고 이미지 파일"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={readOnly || uploading || sending || running || !history.enabled}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div className="ai-attachment-actions">
            <Button
              variant="ghost"
              disabled={readOnly || uploading || sending || running || !history.enabled}
              onClick={() => imageInput.current?.click()}
            >
              {uploading ? (
                <LoaderCircle className="chat-spinning" size={16} />
              ) : (
                <ImagePlus size={16} />
              )}
              이미지 첨부
            </Button>
            <small>{uploading ? uploadStage : '1장 · 1,024px / 200 KB로 자동 축소'}</small>
          </div>
          {attachment && imageSummary && (
            <small className="ai-image-summary" role="status">
              {imageSummary}
            </small>
          )}
        </ChatComposer>
      </div>
      {preview?.spec && (
        <Dialog title="AI 변경 미리보기" busy={working} onClose={() => setPreview(undefined)}>
          <p>{preview.summary}</p>
          {preview.page_id &&
            preview.review &&
            preview.base_revision !== preview.review.revision && (
              <fieldset disabled={working} className="ai-resolution">
                <legend>AI 요청 후 화면이 변경되었습니다</legend>
                <p>
                  AI 기준 버전 {preview.base_revision} → 현재 버전 {preview.review.revision}. 아래
                  미리보기는 선택한 적용 결과입니다.
                </p>
                <label>
                  <input
                    type="radio"
                    name="ai-resolution"
                    checked={applyMode === 'merge'}
                    onChange={() => setApplyMode('merge')}
                    disabled={!preview.review.merged}
                  />{' '}
                  내 변경과 병합{!preview.review.merged && ' (겹치는 변경 있음)'}
                </label>
                <label>
                  <input
                    type="radio"
                    name="ai-resolution"
                    checked={applyMode === 'overwrite'}
                    onChange={() => setApplyMode('overwrite')}
                  />{' '}
                  AI 제안으로 덮어쓰기
                </label>
                {applyMode === 'overwrite' ? (
                  <p>
                    현재 페이지 전체를 AI 제안으로 바꿉니다. 이후 직접 수정한 내용은 이전 버전
                    기록에 남습니다.
                  </p>
                ) : (
                  <p>
                    {preview.review.merged
                      ? '서로 다른 속성의 변경을 합쳤습니다. 내 변경과 AI 변경을 함께 저장합니다.'
                      : '같은 속성 또는 요소 구조가 겹쳐 자동 병합할 수 없습니다. 덮어쓰기를 선택하거나 취소해 주세요.'}
                  </p>
                )}
              </fieldset>
            )}
          <div className="ai-proposal-preview">
            <NodeRenderer
              node={
                (applyMode === 'merge'
                  ? (preview.review?.merged?.spec ?? preview.spec)
                  : preview.spec
                ).root
              }
              theme={
                (applyMode === 'merge'
                  ? (preview.review?.merged?.spec ?? preview.spec)
                  : preview.spec
                ).theme
              }
              breakpoint={breakpoint}
              root
              preview
            />
          </div>
          <p>적용하면 새 버전으로 저장됩니다. 기존 버전은 버전 기록에서 복원할 수 있습니다.</p>
          {dirty && (
            <p>
              먼저 직접 편집한 내용을 저장해 주세요.{' '}
              <Button
                variant="secondary"
                disabled={working || busy}
                onClick={async () => {
                  if (await onSave()) await inspect(preview.id);
                }}
              >
                저장하고 미리보기 갱신
              </Button>
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <Button
            disabled={
              dirty ||
              readOnly ||
              busy ||
              working ||
              (applyMode === 'merge' && !!preview.review && !preview.review.merged)
            }
            onClick={() => void apply()}
          >
            변경 적용
          </Button>
        </Dialog>
      )}
    </div>
  );
}
