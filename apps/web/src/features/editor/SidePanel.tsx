import {
  useContext,
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { effectiveStyle, type UiNode, type Breakpoint } from '@jjapgma/ui-spec';
import { OverlayContext, ScopedOverlay, useOverlayAction } from './ScopedOverlay';
import { PanelContext } from './NavigationRuntime';
import { resolveColor } from './themeStyle';

export function SidePanel({
  node,
  breakpoint,
  preview,
  children,
}: {
  node: UiNode;
  breakpoint: Breakpoint;
  preview: boolean;
  children: ReactNode;
}) {
  const runtime = useContext(OverlayContext)!;
  const action = useOverlayAction();
  const [collapsed, setCollapsed] = useState(node.props.defaultCollapsed ?? false);
  const ref = useRef<HTMLElement>(null);
  const [top, setTop] = useState(0);
  const drawer = breakpoint === 'mobile' && node.props.mobileDrawer !== false;
  const right = node.props.panelSide === 'right';
  const collapsible = node.props.panelMode !== 'fixed';
  const isCollapsed = preview && collapsible && collapsed;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = el.closest<HTMLElement>('[data-page-root]');
    if (!root) return;
    const measure = () =>
      setTop(
        Math.max(
          0,
          (el.getBoundingClientRect().top - root.getBoundingClientRect().top) /
            (root.getBoundingClientRect().width / root.offsetWidth || 1),
        ),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [drawer, preview]);
  useEffect(
    () => setCollapsed(node.props.defaultCollapsed ?? false),
    [node.props.defaultCollapsed, preview],
  );
  useEffect(() => {
    if (drawer) return;
    runtime.targets.set(node.id, (type) =>
      setCollapsed((v) => (type === 'toggle' ? !v : type === 'close')),
    );
    return () => {
      runtime.targets.delete(node.id);
    };
  }, [runtime, node.id, drawer]);
  if (preview && effectiveStyle(node, breakpoint).hidden) return null;
  if (drawer) {
    const drawerNode: UiNode = {
      ...node,
      type: 'drawer',
      style: effectiveStyle(node, breakpoint),
      props: { ...node.props, isOpen: false, closeOnBackdrop: true },
    };
    return (
      <>
        {preview && node.props.mobileTrigger !== 'external' && (
          <button
            type="button"
            className={`panel-mobile-trigger ${right ? 'panel-right' : ''}`}
            aria-label={`${node.name} 열기`}
            onClick={() => action({ type: 'open', targetId: node.id })}
          >
            <Menu size={20} />
          </button>
        )}
        <PanelContext.Provider
          value={{ collapsed: false, close: () => action({ type: 'close', targetId: node.id }) }}
        >
          <ScopedOverlay
            node={drawerNode}
            preview={preview}
            hidden={!!effectiveStyle(node, breakpoint).hidden}
          >
            {children}
          </ScopedOverlay>
        </PanelContext.Provider>
      </>
    );
  }
  const width = isCollapsed
    ? node.props.collapseMode === 'hidden'
      ? 0
      : (node.props.collapsedWidth ?? 64)
    : (effectiveStyle(node, breakpoint).width ?? '240px');
  return (
    <aside
      ref={ref}
      className="side-panel"
      data-collapsed={isCollapsed}
      data-fully-hidden={isCollapsed && node.props.collapseMode === 'hidden'}
      data-side={right ? 'right' : 'left'}
      style={
        {
          width,
          order: right ? 1 : -1,
          background:
            resolveColor(effectiveStyle(node, breakpoint).background) ??
            'var(--page-surface, white)',
          '--panel-background':
            resolveColor(effectiveStyle(node, breakpoint).background) ??
            'var(--page-surface, white)',
          '--panel-border':
            resolveColor(effectiveStyle(node, breakpoint).borderColor) ??
            'var(--page-border, #d5ddec)',
          '--panel-border-width': `${effectiveStyle(node, breakpoint).borderWidth ?? 1}px`,
          '--panel-top': `${top}px`,
        } as CSSProperties
      }
      aria-label={node.props.text || node.name}
    >
      <div
        className="side-panel-inner"
        style={{
          overflowX:
            effectiveStyle(node, breakpoint).overflowX ?? effectiveStyle(node, breakpoint).overflow,
          overflowY:
            effectiveStyle(node, breakpoint).overflowY ?? effectiveStyle(node, breakpoint).overflow,
        }}
        hidden={isCollapsed && node.props.collapseMode === 'hidden'}
      >
        <PanelContext.Provider value={{ collapsed: isCollapsed, close: () => {} }}>
          {children}
        </PanelContext.Provider>
      </div>
      {collapsible && (
        <button
          type="button"
          className="panel-edge-toggle"
          aria-label={isCollapsed ? '사이드 패널 펼치기' : '사이드 패널 접기'}
          aria-expanded={!isCollapsed}
          onClick={() => preview && setCollapsed((v) => !v)}
        >
          {(right ? !isCollapsed : isCollapsed) ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      )}
    </aside>
  );
}
