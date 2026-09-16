import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { effectiveStyle, type UiNode, type Breakpoint } from '@jjapgma/ui-spec';
import { useControlRowAlignment } from './useControlRowAlignment';
import { X } from 'lucide-react';
import { NavigationProvider } from './NavigationRuntime';
import { themeVariables } from './themeStyle';

type Action = NonNullable<UiNode['props']['overlayAction']>;
type Runtime = {
  targets: Map<string, (type: Action['type']) => void>;
  stack: string[];
  sequence: number;
};
export const OverlayContext = createContext<Runtime | null>(null);
const CurrentOverlay = createContext<string | undefined>(undefined);
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState<Runtime>(() => ({ targets: new Map(), stack: [], sequence: 0 }));
  return (
    <OverlayContext.Provider value={runtime}>
      <NavigationProvider>{children}</NavigationProvider>
    </OverlayContext.Provider>
  );
}
export function useOverlayAction() {
  const runtime = useContext(OverlayContext);
  const current = useContext(CurrentOverlay);
  return (action: Action) => runtime?.targets.get(action.targetId ?? current ?? '')?.(action.type);
}

// The anchor stays in the UI tree; the portal escapes clipping/transform containing blocks.
export function ScopedOverlay({
  node,
  preview,
  hidden,
  children,
}: {
  node: UiNode;
  preview: boolean;
  hidden: boolean;
  children: ReactNode;
}) {
  const runtime = useContext(OverlayContext)!;
  const anchor = useRef<HTMLSpanElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(node.props.isOpen !== false);
  const [area, setArea] = useState<CSSProperties>({ visibility: 'hidden' });
  const [order, setOrder] = useState(0);
  const [host, setHost] = useState<HTMLElement>(document.body);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | undefined>(
    undefined,
  );
  const drawer = node.type === 'drawer';
  const blocking = node.type === 'modal' || drawer;
  const visible = !hidden && (!preview || open);
  useEffect(() => setOpen(node.props.isOpen !== false), [node.props.isOpen]);
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    drag.current = undefined;
  }, [open, preview]);
  useEffect(() => {
    runtime.targets.set(node.id, (type) =>
      setOpen((v) => (type === 'toggle' ? !v : type === 'open')),
    );
    return () => {
      runtime.targets.delete(node.id);
    };
  }, [runtime, node.id]);
  useLayoutEffect(() => {
    if (!visible) return;
    const anchorParent = anchor.current!.parentElement!;
    const parent =
      drawer && node.props.drawerScope === 'page'
        ? (anchorParent.closest<HTMLElement>('[data-page-root="true"]') ?? anchorParent)
        : anchorParent;
    const pageScope = parent.dataset.pageRoot === 'true';
    setHost(parent.closest('dialog') ?? document.body);
    const measure = () => {
      if (parent.closest('[inert]')) {
        setArea({ visibility: 'hidden' });
        return;
      }
      const viewport = window.visualViewport;
      let left = viewport?.offsetLeft ?? 0,
        top = viewport?.offsetTop ?? 0,
        right = left + (viewport?.width ?? window.innerWidth),
        bottom = top + (viewport?.height ?? window.innerHeight);
      for (let el: HTMLElement | null = parent; el; el = el.parentElement) {
        const css = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        if (el === parent || /(auto|scroll|hidden|clip)/.test(css.overflowX)) {
          left = Math.max(left, box.left);
          right = Math.min(right, box.right);
        }
        if (
          (el === parent && (!pageScope || drawer)) ||
          (el !== parent && /(auto|scroll|hidden|clip)/.test(css.overflowY))
        ) {
          top = Math.max(top, box.top);
          bottom = Math.min(bottom, box.bottom);
        }
      }
      const zoom = parent.offsetWidth
        ? parent.getBoundingClientRect().width / parent.offsetWidth
        : 1;
      setArea({
        ...Object.fromEntries(
          themeVariables.map((key) => [
            `--page-${key}`,
            getComputedStyle(parent).getPropertyValue(`--page-${key}`),
          ]),
        ),
        left,
        top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
        visibility: right > left && bottom > top ? 'visible' : 'hidden',
        '--overlay-zoom': zoom,
      } as CSSProperties);
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (let el: HTMLElement | null = parent; el; el = el.parentElement) observer.observe(el);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
    };
  }, [visible, node, preview, drawer]);
  useEffect(() => {
    if (!visible || !preview || !drawer) return;
    const stop = (event: Event) => {
      if (event.target instanceof Node && !surface.current?.contains(event.target))
        event.preventDefault();
    };
    const scope = anchor.current?.closest('[data-page-root="true"]');
    scope?.addEventListener('wheel', stop, { passive: false });
    scope?.addEventListener('touchmove', stop, { passive: false });
    return () => {
      scope?.removeEventListener('wheel', stop);
      scope?.removeEventListener('touchmove', stop);
    };
  }, [visible, preview, drawer]);
  useLayoutEffect(() => {
    if (!visible || !preview || area.visibility !== 'visible' || anchor.current?.closest('[inert]'))
      return;
    runtime.stack.push(node.id);
    setOrder(++runtime.sequence);
    const trigger = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        surface.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
    (focusable()[0] ?? surface.current)?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (runtime.stack.at(-1) !== node.id) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpen(false);
      }
      if (
        e.key === 'Tab' &&
        blocking &&
        (drawer || surface.current?.contains(document.activeElement))
      ) {
        const all = focusable();
        const i = all.indexOf(document.activeElement as HTMLElement);
        if (!all.length) {
          e.preventDefault();
          surface.current?.focus();
        } else if (e.shiftKey ? i <= 0 : i === all.length - 1 || i === -1) {
          e.preventDefault();
          all[e.shiftKey ? all.length - 1 : 0].focus();
        }
      }
    };
    const focus = (e: FocusEvent) => {
      if (
        blocking &&
        runtime.stack.at(-1) === node.id &&
        e.target instanceof Node &&
        anchor.current?.parentElement?.contains(e.target)
      )
        (focusable()[0] ?? surface.current)?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', key, true);
    document.addEventListener('focusin', focus, true);
    return () => {
      const wasTop = runtime.stack.at(-1) === node.id;
      runtime.stack = runtime.stack.filter((id) => id !== node.id);
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('focusin', focus, true);
      if (wasTop && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [visible, preview, runtime, node.id, blocking, host, area.visibility, drawer]);
  return (
    <>
      <span ref={anchor} hidden data-overlay-anchor={node.id} />
      {visible &&
        createPortal(
          <div
            className={`scoped-overlay ${drawer ? `scoped-drawer drawer-${node.props.panelSide ?? 'left'}` : ''} ${preview ? '' : 'overlay-editing'} ${blocking ? '' : 'overlay-nonblocking'}`}
            data-overlay-id={node.id}
            style={{ ...area, zIndex: 100 + order }}
            onWheel={(e) => {
              if (drawer && e.target === e.currentTarget) e.preventDefault();
            }}
            onClick={(e) => {
              if (
                e.target === e.currentTarget &&
                preview &&
                blocking &&
                node.props.closeOnBackdrop &&
                runtime.stack.at(-1) === node.id
              )
                setOpen(false);
            }}
          >
            <div
              ref={surface}
              className="scoped-overlay-surface"
              style={{
                transform: `translate(${offset.x / Number(area['--overlay-zoom' as keyof CSSProperties] ?? 1)}px, ${offset.y / Number(area['--overlay-zoom' as keyof CSSProperties] ?? 1)}px)`,
                ...(drawer
                  ? {
                      width: node.style.width ?? '300px',
                      height: `${Number(area.height ?? 0) / Number(area['--overlay-zoom' as keyof CSSProperties] ?? 1)}px`,
                      maxHeight: `${Number(area.height ?? 0) / Number(area['--overlay-zoom' as keyof CSSProperties] ?? 1)}px`,
                      maxWidth: `${(Number(area.width ?? 0) * 0.9) / Number(area['--overlay-zoom' as keyof CSSProperties] ?? 1)}px`,
                    }
                  : {}),
              }}
              onPointerDown={(e) => {
                if (!preview) return;
                runtime.stack = runtime.stack.filter((id) => id !== node.id);
                runtime.stack.push(node.id);
                setOrder(++runtime.sequence);
                if (
                  blocking ||
                  e.button !== 0 ||
                  !(e.target instanceof Element) ||
                  !e.target.closest('.modal-header-bar') ||
                  e.target.closest('button')
                )
                  return;
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                const box = e.currentTarget.getBoundingClientRect();
                const maxX = Math.max(0, (Number(area.width) - 32 - box.width) / 2),
                  maxY = Math.max(0, (Number(area.height) - 32 - box.height) / 2);
                setOffset({
                  x: Math.max(
                    -maxX,
                    Math.min(maxX, drag.current.offsetX + e.clientX - drag.current.x),
                  ),
                  y: Math.max(
                    -maxY,
                    Math.min(maxY, drag.current.offsetY + e.clientY - drag.current.y),
                  ),
                });
              }}
              onPointerUp={(e) => {
                drag.current = undefined;
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onLostPointerCapture={() => {
                drag.current = undefined;
              }}
              role={preview ? 'dialog' : undefined}
              aria-label={node.props.text || node.name}
              aria-modal={preview && blocking ? true : undefined}
              tabIndex={-1}
            >
              <CurrentOverlay.Provider value={node.id}>
                {drawer && (
                  <button
                    type="button"
                    className="drawer-close"
                    aria-label="서랍 닫기"
                    onClick={() => setOpen(false)}
                  >
                    <X size={20} />
                  </button>
                )}
                {children}
              </CurrentOverlay.Provider>
            </div>
          </div>,
          host,
        )}
    </>
  );
}

export function OverlayChrome({
  node,
  preview,
  children,
  contentStyle,
  breakpoint,
}: {
  node: UiNode;
  preview: boolean;
  children: ReactNode;
  contentStyle: CSSProperties;
  breakpoint: Breakpoint;
}) {
  const controlRow = useControlRowAlignment(
    contentStyle.flexDirection === 'row' &&
      effectiveStyle(node, breakpoint).controlAlignment !== 'layout',
    node,
    breakpoint,
  );
  const action = useOverlayAction();
  const close = () => {
    if (preview) action({ type: 'close', targetId: node.id });
  };
  return (
    <>
      {node.props.showHeader !== false && (
        <div
          className="modal-header-bar"
          style={{
            cursor: preview && node.type !== 'modal' ? 'grab' : undefined,
            touchAction: preview && node.type !== 'modal' ? 'none' : undefined,
          }}
        >
          <strong>{node.props.text || node.name}</strong>
          <button type="button" className="modal-close-btn" aria-label="닫기" onClick={close}>
            <X size={18} />
          </button>
        </div>
      )}
      <div
        ref={controlRow}
        className="scoped-overlay-content"
        style={Object.fromEntries(
          Object.entries(contentStyle).filter(([, value]) => value !== undefined),
        )}
      >
        {children}
      </div>
      {(node.props.showFooter ?? node.type === 'dialog') && (
        <div className="dialog-footer-bar">
          <button type="button" className="dialog-btn secondary" onClick={close}>
            취소
          </button>
          <button type="button" className="dialog-btn primary" onClick={close}>
            확인
          </button>
        </div>
      )}
    </>
  );
}
