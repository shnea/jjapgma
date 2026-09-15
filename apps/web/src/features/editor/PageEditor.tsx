import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Check,
  Eye,
  Layers3,
  Monitor,
  Redo2,
  Save,
  Smartphone,
  Tablet,
  Undo2,
  X,
  Download,
  History,
  FileCode,
  Globe,
  FileJson,
} from 'lucide-react';
import { exportToJson, exportToHtml, exportToStorybook } from './export/exporters';
import {
  cloneNode,
  createNode,
  editSpec,
  findNode,
  findParent,
  insertNode,
  isLocked,
  moveNode,
  registry,
  removeNode,
  dropElement,
  type DropPosition,
  type Breakpoint,
  type ComponentType,
  type UiNode,
  type UiSpec,
} from '@jjapgma/ui-spec';
import { api, ApiError, errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Palette } from './Palette';
import { Layers } from './Layers';
import { Inspector } from './Inspector';
import { NodeRenderer } from './NodeRenderer';
import { useHistory } from './history';
import { FileAssetsProvider } from './files/FileAssets';
import type { Page, PageSummary } from './types';
export function PageEditor({
  initial,
  pageNav,
  onDirty,
  onSaved,
}: {
  initial: Page;
  pageNav: React.ReactNode;
  onDirty: (value: boolean) => void;
  onSaved: (page: PageSummary) => void;
}) {
  const [history, dispatch] = useHistory(initial.spec);
  const spec = history.present;
  const [selectedId, setSelected] = useState(spec.root.id);
  const selected = findNode(spec.root, selectedId) ?? spec.root;
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [tab, setTab] = useState('elements');
  const [preview, setPreview] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [canvasWidths, setCanvasWidths] = useState({ desktop: 1440, tablet: 768, mobile: 375 });
  const canvasScroll = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(initial.name);
  const [savedSpec, setSavedSpec] = useState(initial.spec);
  const [savedName, setSavedName] = useState(initial.name);
  const [revision, setRevision] = useState(initial.revision);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const inFlight = useRef(false);
  const clipboard = useRef<UiNode | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const dirty = JSON.stringify(spec) !== JSON.stringify(savedSpec) || name !== savedName;
  const readOnly = initial.role === 'VIEWER';
  useEffect(() => {
    onDirty(dirty);
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, onDirty]);
  const save = useCallback(async () => {
    if (!dirty || inFlight.current || readOnly || conflict) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await api<Page>(`/pages/${initial.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, spec, baseRevision: revision }),
      });
      if (!mounted.current) return;
      setRevision(result.revision);
      setSavedSpec(spec);
      setSavedName(name);
      onSaved(result);
    } catch (e) {
      if (!mounted.current) return;
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) setConflict(true);
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [dirty, readOnly, conflict, initial.id, name, spec, revision, onSaved]);
  const [showHistory, setShowHistory] = useState(false);
  const [revisionsList, setRevisionsList] = useState<
    Array<{ page_id: string; revision: number; name: string; author_id: string; created_at: string }>
  >([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !saving && !readOnly && !conflict) {
          void save();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dirty, saving, readOnly, conflict, save]);

  const openHistory = async () => {
    setShowHistory(true);
    setLoadingRevisions(true);
    try {
      const list = await api<
        Array<{ page_id: string; revision: number; name: string; author_id: string; created_at: string }>
      >(`/pages/${initial.id}/revisions`);
      setRevisionsList(list);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingRevisions(false);
    }
  };

  const restoreRevision = async (revNum: number) => {
    try {
      const revData = await api<{ name: string; spec: UiSpec }>(
        `/pages/${initial.id}/revisions/${revNum}`,
      );
      dispatch({ type: 'edit', spec: revData.spec });
      setName(revData.name);
      setShowHistory(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  function change(action: () => UiSpec) {
    if (readOnly) return;
    try {
      dispatch({ type: 'edit', spec: action() });
      if (!conflict) setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  function add(type: ComponentType, parentId?: string) {
    const parent =
      parentId ??
      (registry[selected.type].children
        ? selected.id
        : (findParent(spec.root, selected.id)?.id ?? spec.root.id));
    const node = createNode(type);
    change(() => insertNode(spec, parent, node));
    setSelected(node.id);
  }
  function drop(targetId: string, data: string, position: DropPosition = 'inside') {
    change(() => {
      const next = dropElement(spec, targetId, data, position);
      const queue = [next.root];
      while (queue.length) {
        const node = queue.pop()!;
        if (!findNode(spec.root, node.id)) {
          setSelected(node.id);
          break;
        }
        queue.push(...node.children);
      }
      return next;
    });
  }
  function resize(id: string, width: number, height: number) {
    change(() =>
      editSpec(spec, (root) => {
        const node = findNode(root, id);
        if (!node || isLocked(root, id)) throw new Error('잠긴 요소는 크기를 조절할 수 없습니다.');
        const target = breakpoint === 'desktop' ? node.style : (node.responsive[breakpoint] ??= {});
        target.width = `${Math.min(2560, width)}px`;
        target.height = `${Math.min(1600, height)}px`;
      }),
    );
  }
  function remove() {
    change(() => removeNode(spec, selected.id));
  }
  function duplicate() {
    const parent = findParent(spec.root, selected.id);
    if (parent) {
      const copy = cloneNode(selected);
      change(() => insertNode(spec, parent.id, copy));
      setSelected(copy.id);
    }
  }
  function reorder(direction: number) {
    const parent = findParent(spec.root, selected.id);
    if (parent)
      change(() =>
        moveNode(
          spec,
          selected.id,
          parent.id,
          Math.max(
            0,
            Math.min(
              parent.children.length - 1,
              parent.children.findIndex((n) => n.id === selected.id) + direction,
            ),
          ),
        ),
      );
  }
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
        return;
      }
      if (
        readOnly ||
        preview ||
        (event.target as HTMLElement).closest('input,textarea,select,[contenteditable]')
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        dispatch({ type: 'redo' });
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicate();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        clipboard.current = cloneNode(selected);
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'v' &&
        clipboard.current
      ) {
        event.preventDefault();
        const parent = registry[selected.type].children
          ? selected
          : (findParent(spec.root, selected.id) ?? spec.root);
        change(() => insertNode(spec, parent.id, cloneNode(clipboard.current!)));
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        remove();
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });
  async function reload() {
    if (
      !window.confirm(
        '저장되지 않은 변경을 버리고 최신 화면을 불러올까요? 먼저 JSON으로 내려받아 보관할 수 있습니다.',
      )
    )
      return;
    try {
      const page = await api<Page>(`/pages/${initial.id}`);
      dispatch({ type: 'reset', spec: page.spec });
      setSavedSpec(page.spec);
      setName(page.name);
      setSavedName(page.name);
      setRevision(page.revision);
      setConflict(false);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  function download() {
    const blob = new Blob([JSON.stringify({ name, baseRevision: revision, spec }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jjapgma-page-${initial.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const width = canvasWidths[breakpoint];
  return (
    <FileAssetsProvider
      value={{
        projectId: initial.project_id,
        canUpload: (id) => !readOnly && !isLocked(spec.root, id),
        onAttach: (id, attachment) =>
          change(() =>
            editSpec(spec, (root) => {
              if (isLocked(root, id)) throw new Error('잠긴 요소입니다.');
              const node = findNode(root, id);
              if (node) node.props.attachment = attachment;
            }),
          ),
      }}
    >
      <header className="editor-toolbar">
        <div className="history-tools">
          <Button
            variant="ghost"
            aria-label="실행 취소"
            disabled={readOnly || !history.past.length}
            onClick={() => dispatch({ type: 'undo' })}
          >
            <Undo2 size={17} />
          </Button>
          <Button
            variant="ghost"
            aria-label="다시 실행"
            disabled={readOnly || !history.future.length}
            onClick={() => dispatch({ type: 'redo' })}
          >
            <Redo2 size={17} />
          </Button>
          <span className="separator" />
          <span className="save-status" role="status">
            {saving ? (
              '저장 중…'
            ) : dirty ? (
              '저장되지 않은 변경'
            ) : (
              <>
                <Check size={13} />
                저장됨
              </>
            )}
          </span>
        </div>
        <div className="device-switch">
          {(
            [
              ['desktop', Monitor, '데스크톱'],
              ['tablet', Tablet, '태블릿'],
              ['mobile', Smartphone, '모바일'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              title={label}
              aria-label={label}
              aria-pressed={breakpoint === value}
              className={breakpoint === value ? 'active' : ''}
              onClick={() => setBreakpoint(value)}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <Button
            variant="ghost"
            onClick={() => void openHistory()}
            title="버전 기록"
            aria-label="버전 기록"
          >
            <History size={16} />
            <span style={{ fontSize: 13, marginLeft: 4 }}>v{revision}</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowExportModal(true)}
            aria-label="내보내기"
            title="내보내기"
          >
            <Download size={16} />
            <span style={{ fontSize: 13, marginLeft: 4 }}>내보내기</span>
          </Button>
          <Button variant="secondary" onClick={() => setPreview((v) => !v)}>
            {preview ? <X size={15} /> : <Eye size={15} />} {preview ? '편집으로' : '미리보기'}
          </Button>
          <Button
            disabled={readOnly || !dirty || conflict}
            loading={saving}
            onClick={() => void save()}
            title="수동 저장 (Ctrl+S)"
          >
            <Save size={15} />
            저장
          </Button>
        </div>
      </header>
      {error && (
        <div role="alert" className="error-banner">
          {error}
          {conflict ? (
            <>
              <Button variant="secondary" onClick={download}>
                내 변경 내려받기
              </Button>
              <Button variant="secondary" onClick={() => void reload()}>
                최신 화면 불러오기
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => void save()}>
              저장 재시도
            </Button>
          )}
        </div>
      )}
      <div className={`editor-body ${preview ? 'is-preview' : ''}`}>
        {!preview && (
          <aside className="left-panel">
            {pageNav}
            <div className="panel-tabs">
              <button
                className={tab === 'elements' ? 'active' : ''}
                onClick={() => setTab('elements')}
              >
                요소
              </button>
              <button className={tab === 'layers' ? 'active' : ''} onClick={() => setTab('layers')}>
                레이어
              </button>
            </div>
            <div className="panel-scroll">
              {tab === 'elements' ? (
                <Palette onAdd={add} disabled={readOnly} />
              ) : (
                <Layers
                  node={spec.root}
                  selectedId={selected.id}
                  onSelect={setSelected}
                  onDrop={drop}
                  disabled={readOnly}
                />
              )}
            </div>
            <div className="left-panel-footer">
              <Layers3 size={13} />
              페이지 구조 · revision {revision}
            </div>
          </aside>
        )}
        <main className="canvas-workspace">
          <div className="canvas-heading">
            <span>{name}</span>
            <label className="canvas-width">
              화면 너비{' '}
              <input
                aria-label="캔버스 너비"
                type="number"
                min={320}
                max={2560}
                value={width}
                onChange={(e) =>
                  setCanvasWidths((v) => ({
                    ...v,
                    [breakpoint]: Math.min(2560, Math.max(320, Number(e.target.value))),
                  }))
                }
              />{' '}
              px
            </label>
          </div>
          <div className="canvas-scroll" ref={canvasScroll}>
            <div className="artboard-wrap" style={{ width: (width * zoom) / 100 }}>
              <div className="artboard" style={{ width, zoom: zoom / 100 }}>
                <NodeRenderer
                  node={spec.root}
                  breakpoint={breakpoint}
                  selectedId={selected.id}
                  onSelect={setSelected}
                  onDrop={readOnly ? undefined : drop}
                  onResize={readOnly ? undefined : resize}
                  preview={preview}
                />
              </div>
            </div>
          </div>
          <div className="canvas-bottom">
            <span>
              {preview ? '미리보기' : '선택 도구'}
              <span className="muted">
                {' '}
                · {readOnly ? '보기 전용' : '드래그하여 이동 · Ctrl/⌘ + Z 실행 취소'}
              </span>
            </span>
            <div className="canvas-zoom-tools">
              <Button
                variant="ghost"
                onClick={() =>
                  setZoom(
                    Math.max(
                      25,
                      Math.min(
                        150,
                        Math.floor(
                          (((canvasScroll.current?.clientWidth ?? width) - 80) / width) * 100,
                        ),
                      ),
                    ),
                  )
                }
              >
                화면에 맞춤
              </Button>
              <label className="zoom-control">
                <span className="sr-only">확대 비율</span>
                <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
                  {Array.from(new Set([25, 50, 75, 100, 125, 150, zoom]))
                    .sort((a, b) => a - b)
                    .map((v) => (
                      <option key={v} value={v}>
                        {v}%
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </div>
        </main>
        {!preview && (
          <aside className="right-panel">
            <div className="panel-tabs">
              <span className="active">디자인</span>
            </div>
            <div className="panel-scroll">
              <div className="page-name-field">
                <label>
                  페이지 이름
                  <input
                    disabled={readOnly}
                    value={name}
                    maxLength={100}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              </div>
              <Inspector
                node={selected}
                breakpoint={breakpoint}
                root={selected.id === spec.root.id}
                disabled={
                  readOnly ||
                  (!!findParent(spec.root, selected.id) &&
                    isLocked(spec.root, findParent(spec.root, selected.id)!.id))
                }
                onUpdate={(action) =>
                  change(() =>
                    editSpec(spec, (root) => {
                      action(findNode(root, selected.id)!);
                    }),
                  )
                }
                onDelete={remove}
                onDuplicate={duplicate}
                onReorder={reorder}
              />
            </div>
          </aside>
        )}
      </div>

      {showExportModal && (
        <div className="editor-modal-backdrop" onClick={() => setShowExportModal(false)}>
          <div className="editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="editor-modal-header">
              <h3>프로젝트 내보내기</h3>
              <Button variant="ghost" onClick={() => setShowExportModal(false)} aria-label="닫기">
                <X size={16} />
              </Button>
            </div>
            <div className="editor-modal-body">
              <div className="export-option-card">
                <div className="export-option-info">
                  <h4>스토리북 내보내기 (.zip)</h4>
                  <p>npm i && npm run storybook(6006 포트)으로 바로 실행 가능한 독립 실행 환경 ZIP 패키지를 다운로드합니다.</p>
                </div>
                <Button
                  variant="primary"
                  aria-label="스토리북 내보내기"
                  onClick={() => {
                    exportToStorybook(name, spec);
                    setShowExportModal(false);
                  }}
                >
                  <FileCode size={14} style={{ marginRight: 6 }} /> 내보내기
                </Button>
              </div>

              <div className="export-option-card">
                <div className="export-option-info">
                  <h4>HTML 내보내기 (.html)</h4>
                  <p>브라우저에서 바로 열 수 있는 독립 실행형 단일 HTML 파일로 내보냅니다.</p>
                </div>
                <Button
                  variant="primary"
                  aria-label="HTML 내보내기"
                  onClick={() => {
                    exportToHtml(name, spec);
                    setShowExportModal(false);
                  }}
                >
                  <Globe size={14} style={{ marginRight: 6 }} /> 내보내기
                </Button>
              </div>

              <div className="export-option-card">
                <div className="export-option-info">
                  <h4>JSON 스펙 내보내기 (.json)</h4>
                  <p>짭그마 원본 UI Spec JSON 파일을 내려받습니다.</p>
                </div>
                <Button
                  variant="primary"
                  aria-label="JSON 내보내기"
                  onClick={() => {
                    exportToJson(name, spec);
                    setShowExportModal(false);
                  }}
                >
                  <FileJson size={14} style={{ marginRight: 6 }} /> 내보내기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="editor-modal-backdrop" onClick={() => setShowHistory(false)}>
          <div className="editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="editor-modal-header">
              <h3>버전 기록 (Revision History)</h3>
              <Button variant="ghost" onClick={() => setShowHistory(false)} aria-label="닫기">
                <X size={16} />
              </Button>
            </div>
            <div className="editor-modal-body">
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                저장할 때마다 생성된 버전 목록입니다. 원하는 시점으로 복원할 수 있습니다.
              </p>
              {loadingRevisions ? (
                <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 24 }}>
                  버전 기록을 불러오는 중…
                </p>
              ) : revisionsList.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 24 }}>
                  기록된 이전 버전이 없습니다.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {revisionsList.map((rev) => {
                    const isCurrent = rev.revision === revision;
                    return (
                      <div
                        key={rev.revision}
                        className={`revision-item ${isCurrent ? 'current' : ''}`}
                      >
                        <div className="revision-meta">
                          <span className="revision-tag">
                            v{rev.revision} {isCurrent && <span style={{ color: '#466e2c', fontSize: 12 }}>(현재 버전)</span>}
                          </span>
                          <span className="revision-time">
                            {new Date(rev.created_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <Button
                          variant={isCurrent ? 'outline' : 'secondary'}
                          onClick={() => void restoreRevision(rev.revision)}
                        >
                          {isCurrent ? '현재 버전으로 복원' : '이 버전으로 복원'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </FileAssetsProvider>
  );
}
