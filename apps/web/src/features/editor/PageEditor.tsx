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
  createGrid,
  resizeGrid,
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
import { PageSettings } from './PageSettings';
import { ThemeEditor } from './ThemeEditor';
import { TemplatePanel } from './TemplatePanel';
import { DesignPanel } from './DesignPanel';
import { AiChatPanel, type Proposal, type ApplyOptions } from './AiChatPanel';
import { CarouselEditingProvider } from './CarouselEditing';
export function PageEditor(props: Parameters<typeof PageEditorContent>[0]) {
  return (
    <CarouselEditingProvider>
      <PageEditorContent {...props} />
    </CarouselEditingProvider>
  );
}
function PageEditorContent({
  initial,
  pageNav,
  onDirty,
  onSaved,
  onDeleted,
  onAiCreated,
  onMcp,
}: {
  initial: Page;
  pageNav: (actions?: React.ReactNode) => React.ReactNode;
  onDirty: (value: boolean) => void;
  onSaved: (page: PageSummary) => void;
  onDeleted: (id: string) => Promise<void>;
  onAiCreated?: (page: Page) => void;
  onMcp?: () => void;
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
  const [viewportHeight, setViewportHeight] = useState(800);
  useEffect(() => {
    const el = canvasScroll.current;
    if (!el) return;
    const measure = () => {
      const css = getComputedStyle(el);
      setViewportHeight(
        Math.max(
          320,
          (el.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom)) /
            (zoom / 100),
        ),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [zoom]);
  const [name, setName] = useState(initial.name);
  const [savedSpec, setSavedSpec] = useState(initial.spec);
  const [savedName, setSavedName] = useState(initial.name);
  const [revision, setRevision] = useState(initial.revision);
  const revisionRef = useRef(revision);
  revisionRef.current = revision;
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
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
  const [aiApplying, setAiApplying] = useState(false);
  const [rightTab, setRightTab] = useState<'design' | 'ai'>('design');
  const readOnly = initial.role === 'VIEWER' || aiApplying;
  async function applyProposal(proposal: Proposal, options: ApplyOptions) {
    if (dirty || inFlight.current || readOnly)
      throw new Error('편집 내용을 저장하고 최신 화면에서 다시 적용해 주세요.');
    inFlight.current = true;
    setAiApplying(true);
    try {
      const page = await api<Page>(`/proposals/${proposal.id}/apply`, {
        method: 'POST',
        body: JSON.stringify(options),
      });
      if (!mounted.current) return;
      if (page.id !== initial.id) {
        onAiCreated?.(page);
        return;
      }
      dispatch({ type: 'edit', spec: page.spec });
      setSavedSpec(page.spec);
      setName(page.name);
      setSavedName(page.name);
      setRevision(page.revision);
      revisionRef.current = page.revision;
      setConflict(false);
      setError('');
      onSaved(page);
    } finally {
      inFlight.current = false;
      if (mounted.current) setAiApplying(false);
    }
  }
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const page = await api<Page>(`/pages/${initial.id}`);
        if (active && !inFlight.current && revisionRef.current === revision)
          setConflict(page.revision !== revision);
      } catch {
        /* Saving and chat requests report access failures. */
      }
    };
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [initial.id, revision]);
  const templateTarget = registry[selected.type].children
    ? selected
    : (findParent(spec.root, selected.id) ?? spec.root);
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
  const save = useCallback(
    async (nextName = name) => {
      if (inFlight.current || readOnly || conflict || !nextName.trim()) return false;
      if (!dirty && nextName === name) return true;
      inFlight.current = true;
      setSaving(true);
      setError('');
      try {
        const result = await api<Page>(`/pages/${initial.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: nextName, spec, baseRevision: revision }),
        });
        if (!mounted.current) return false;
        setRevision(result.revision);
        revisionRef.current = result.revision;
        setSavedSpec(spec);
        setSavedName(nextName);
        setName(nextName);
        onSaved(result);
        return true;
      } catch (e) {
        if (!mounted.current) return false;
        setError(errorMessage(e));
        if (e instanceof ApiError && e.status === 409) setConflict(true);
        return false;
      } finally {
        inFlight.current = false;
        if (mounted.current) setSaving(false);
      }
    },
    [dirty, readOnly, conflict, initial.id, name, spec, revision, onSaved],
  );
  async function deletePage() {
    if (inFlight.current || readOnly || conflict) return false;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      await api(`/pages/${initial.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ baseRevision: revision }),
      });
      await onDeleted(initial.id);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) setConflict(true);
      return false;
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  const [showHistory, setShowHistory] = useState(false);
  const [revisionsList, setRevisionsList] = useState<
    Array<{
      page_id: string;
      revision: number;
      name: string;
      author_id: string;
      created_at: string;
    }>
  >([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('dialog')) return;
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
        Array<{
          page_id: string;
          revision: number;
          name: string;
          author_id: string;
          created_at: string;
        }>
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
    const node = type === 'grid' ? createGrid() : createNode(type, Boolean(spec.theme));
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
  function resizeGridStructure(id: string, columns: number, rows: number) {
    change(() =>
      editSpec(spec, (root) => {
        const node = findNode(root, id);
        if (!node || isLocked(root, id)) throw new Error('잠긴 그리드는 변경할 수 없습니다.');
        resizeGrid(node, columns, rows);
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
      if ((event.target as HTMLElement).closest('dialog')) return;
      if ((event.target as HTMLElement).closest('.ai-chat-panel')) return;
      if (
        (event.ctrlKey || event.metaKey) &&
        ['c', 'x'].includes(event.key.toLowerCase()) &&
        !window.getSelection()?.isCollapsed
      )
        return;
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
          {onMcp && (
            <Button variant="ghost" onClick={onMcp}>
              MCP 연결
            </Button>
          )}
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
            {pageNav(
              <PageSettings
                name={name}
                disabled={readOnly || conflict}
                busy={saving}
                error={error}
                onRename={save}
                onDelete={deletePage}
              />,
            )}
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
              <button
                className={tab === 'templates' ? 'active' : ''}
                onClick={() => setTab('templates')}
              >
                템플릿
              </button>
            </div>
            <div className="panel-scroll">
              {tab === 'elements' ? (
                <Palette onAdd={add} disabled={readOnly} />
              ) : tab === 'templates' ? (
                <TemplatePanel
                  spec={spec}
                  pageId={initial.id}
                  pageName={name}
                  projectId={initial.project_id}
                  disabled={readOnly || conflict}
                  insertDisabled={isLocked(spec.root, templateTarget.id)}
                  targetName={templateTarget.name}
                  onInsert={(template, templateName, edgeToEdge) => {
                    if (readOnly || conflict) return false;
                    const node = cloneNode(template.root);
                    node.name = templateName;
                    let next = insertNode(spec, templateTarget.id, node);
                    if (edgeToEdge && templateTarget.id === spec.root.id) {
                      next = editSpec(next, (root) => {
                        const edge = {
                          padding: 0,
                          paddingTop: 0,
                          paddingRight: 0,
                          paddingBottom: 0,
                          paddingLeft: 0,
                          gap: 0,
                        };
                        Object.assign(root.style, edge);
                        for (const device of ['tablet', 'mobile'] as const)
                          Object.assign((root.responsive[device] ??= {}), edge);
                      });
                    }
                    dispatch({ type: 'edit', spec: next });
                    setSelected(node.id);
                    setError('');
                    return true;
                  }}
                />
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
              <div
                className="artboard"
                style={
                  {
                    width,
                    zoom: zoom / 100,
                    '--page-viewport-height': `${viewportHeight}px`,
                  } as React.CSSProperties
                }
              >
                <NodeRenderer
                  root
                  theme={spec.theme}
                  node={spec.root}
                  breakpoint={breakpoint}
                  selectedId={selected.id}
                  onSelect={setSelected}
                  onDrop={readOnly ? undefined : drop}
                  onResize={readOnly ? undefined : resize}
                  onGridResize={readOnly || conflict ? undefined : resizeGridStructure}
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
          <DesignPanel>
            <div className="panel-tabs">
              <button
                className={rightTab === 'design' ? 'active' : ''}
                onClick={() => setRightTab('design')}
              >
                디자인
              </button>
              <button
                className={rightTab === 'ai' ? 'active' : ''}
                onClick={() => setRightTab('ai')}
              >
                AI
              </button>
            </div>
            {rightTab === 'ai' ? (
              <AiChatPanel
                projectId={initial.project_id}
                pageId={initial.id}
                pageName={name}
                selectedId={selected.id}
                selectedName={selected.name}
                revision={revision}
                breakpoint={breakpoint}
                dirty={dirty}
                readOnly={readOnly}
                busy={saving || aiApplying}
                onSave={() => save()}
                onApply={applyProposal}
              />
            ) : (
              <div className="panel-scroll">
                {selected.id === spec.root.id && (
                  <ThemeEditor
                    theme={spec.theme}
                    disabled={readOnly || spec.root.locked || conflict}
                    onUseDefaults={() =>
                      change(() =>
                        editSpec(spec, (root) => {
                          for (const key of [
                            'background',
                            'color',
                            'radius',
                            'gap',
                            'padding',
                          ] as const) {
                            delete root.style[key];
                            for (const override of Object.values(root.responsive))
                              delete override[key];
                          }
                        }),
                      )
                    }
                    onChange={(theme) =>
                      change(() => {
                        const next = structuredClone(spec);
                        if (theme) next.theme = theme;
                        else delete next.theme;
                        return next;
                      })
                    }
                  />
                )}
                <Inspector
                  node={selected}
                  pageRoot={spec.root}
                  parent={findParent(spec.root, selected.id)}
                  theme={spec.theme}
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
            )}
          </DesignPanel>
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
                  <p>
                    프로젝트의 모든 페이지·이미지, 전체 컴포넌트, 공식·개인 템플릿을 포함합니다.
                    현재 페이지의 저장 전 변경도 담습니다. 압축을 풀고 npm install 후 npm run
                    storybook으로 실행하세요.
                  </p>
                </div>
                <Button
                  variant="primary"
                  aria-label="스토리북 내보내기"
                  disabled={exporting}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      await exportToStorybook({
                        id: initial.id,
                        project_id: initial.project_id,
                        name,
                        spec,
                      });
                      setShowExportModal(false);
                    } catch (e) {
                      setError(errorMessage(e));
                      setShowExportModal(false);
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  <FileCode size={14} style={{ marginRight: 6 }} />{' '}
                  {exporting ? '파일 모으는 중…' : '내보내기'}
                </Button>
              </div>

              <div className="export-option-card">
                <div className="export-option-info">
                  <h4>HTML + CSS + JavaScript (.zip)</h4>
                  <p>
                    압축을 풀고 index.html을 열면 스타일과 화면 동작이 유지됩니다. 첨부파일은 외부
                    서비스 주소를 참조합니다.
                  </p>
                </div>
                <Button
                  variant="primary"
                  aria-label="HTML 내보내기"
                  disabled={exporting}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      await exportToHtml(name, spec, initial.project_id);
                      setShowExportModal(false);
                    } catch (e) {
                      setError(errorMessage(e));
                      setShowExportModal(false);
                    } finally {
                      setExporting(false);
                    }
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
                            v{rev.revision}{' '}
                            {isCurrent && (
                              <span style={{ color: '#466e2c', fontSize: 12 }}>(현재 버전)</span>
                            )}
                          </span>
                          <span className="revision-time">
                            {new Date(rev.created_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <Button
                          variant="secondary"
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
