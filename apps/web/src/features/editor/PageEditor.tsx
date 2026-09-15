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
} from 'lucide-react';
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
  const [zoom, setZoom] = useState(75);
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
  useEffect(() => {
    if (!dirty || saving || error || conflict) return;
    const timer = window.setTimeout(() => void save(), 1500);
    return () => clearTimeout(timer);
  }, [dirty, saving, error, conflict, save]);
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
  function drop(parentId: string, data: string) {
    try {
      const value = JSON.parse(data);
      if (typeof value.id === 'string') change(() => moveNode(spec, value.id, parentId));
      else if (Object.hasOwn(registry, value.type)) add(value.type, parentId);
    } catch {
      setError('이 요소를 옮길 수 없습니다.');
    }
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
  const width = { desktop: 1200, tablet: 768, mobile: 375 }[breakpoint];
  return (
    <>
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
          <Button variant="ghost" onClick={download} aria-label="화면 JSON 다운로드">
            <Download size={16} />
          </Button>
          <Button variant="secondary" onClick={() => setPreview((v) => !v)}>
            {preview ? <X size={15} /> : <Eye size={15} />} {preview ? '편집으로' : '미리보기'}
          </Button>
          <Button
            disabled={readOnly || !dirty || conflict}
            loading={saving}
            onClick={() => void save()}
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
            <span>{width} × 자동 높이</span>
          </div>
          <div className="canvas-scroll">
            <div className="artboard-wrap" style={{ width: (width * zoom) / 100 }}>
              <div className="artboard" style={{ width, zoom: zoom / 100 }}>
                <NodeRenderer
                  node={spec.root}
                  breakpoint={breakpoint}
                  selectedId={selected.id}
                  onSelect={setSelected}
                  onDrop={readOnly ? undefined : drop}
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
                · {readOnly ? '보기 전용' : '클릭하여 선택 · Ctrl/⌘ + Z 실행 취소'}
              </span>
            </span>
            <label className="zoom-control">
              <span className="sr-only">확대 비율</span>
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
                {[25, 50, 75, 100, 125, 150].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </label>
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
    </>
  );
}
