import {
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Circle } from 'lucide-react';
import type { UiNode, MenuItem, Breakpoint } from '@jjapgma/ui-spec';
import { ElementIcon, iconCatalog } from '../controls/IconPicker';
import { PanelContext, useNavigation } from '../NavigationRuntime';
import { themeVariables } from '../themeStyle';

export function MenuElement({ node, breakpoint }: { node: UiNode; breakpoint: Breakpoint }) {
  const { queries } = useNavigation();
  const panel = useContext(PanelContext);
  const [selected, setSelected] = useState<string>();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [popup, setPopup] = useState<{
    id: string;
    left: number;
    top: number;
    height: number;
    theme: CSSProperties;
  }>();
  const trigger = useRef<HTMLElement | null>(null);
  const flyout = useRef<HTMLDivElement>(null);
  const query = (queries[node.id] ?? '').trim().toLocaleLowerCase();
  const active =
    selected ??
    node.props.activeMenuId ??
    node.props.menuItems?.find((i) => !i.kind || i.kind === 'item')?.id;
  const containsActive = (item: MenuItem): boolean =>
    item.id === active || !!item.children?.some(containsActive);
  const matches = (item: MenuItem): boolean =>
    !(breakpoint === 'mobile' && item.hiddenOnMobile) &&
    (!query || item.label.toLocaleLowerCase().includes(query) || !!item.children?.some(matches));
  const closePopup = (restore = false) => {
    setPopup(undefined);
    if (restore) trigger.current?.focus();
  };
  useEffect(() => {
    setPopup(undefined);
  }, [panel.collapsed, breakpoint]);
  useEffect(() => {
    if (!popup) return;
    flyout.current?.querySelector<HTMLElement>('button,a')?.focus();
    const outside = (e: PointerEvent) => {
      if (
        !flyout.current?.contains(e.target as Node) &&
        !trigger.current?.contains(e.target as Node)
      )
        setPopup(undefined);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setPopup(undefined);
        trigger.current?.focus();
      }
    };
    const scroll = (e: Event) => {
      if (!flyout.current?.contains(e.target as Node)) setPopup(undefined);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', scroll);
    document.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', scroll);
      document.removeEventListener('scroll', scroll, true);
    };
  }, [popup]);
  const openPopup = (item: MenuItem, e: MouseEvent<HTMLElement>) => {
    if (popup?.id === item.id) {
      closePopup();
      return;
    }
    trigger.current = e.currentTarget;
    const bounds = e.currentTarget.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 16);
    const top = Math.max(8, Math.min(bounds.top, window.innerHeight - 200));
    setPopup({
      id: item.id,
      left: Math.max(
        8,
        bounds.right + width + 8 > window.innerWidth ? bounds.left - width - 8 : bounds.right + 8,
      ),
      top,
      height: window.innerHeight - top - 8,
      theme: Object.fromEntries(
        themeVariables.map((key) => [
          `--page-${key}`,
          getComputedStyle(e.currentTarget).getPropertyValue(`--page-${key}`),
        ]),
      ),
    });
  };
  function renderItem(item: MenuItem, compact = false) {
    if (!matches(item)) return null;
    if (item.kind === 'divider')
      return <li key={item.id} role="separator" className="menu-divider" />;
    if (item.kind === 'group')
      return (
        <li key={item.id} className="menu-group" aria-label={item.label}>
          {!compact && item.label}
        </li>
      );
    const hasChildren = !!item.children?.length;
    const open = compact
      ? popup?.id === item.id
      : !!query || (expanded[item.id] ?? containsActive(item));
    const toggle = (e: MouseEvent<HTMLElement>) =>
      compact ? openPopup(item, e) : setExpanded((old) => ({ ...old, [item.id]: !open }));
    const activate = () => {
      setSelected(item.id);
      closePopup(true);
      panel.close();
    };
    const content = (
      <>
        {iconCatalog[item.icon ?? ''] ? (
          <ElementIcon name={item.icon} />
        ) : (
          <Circle size={16} aria-hidden="true" />
        )}
        {!compact && <span className="menu-label">{item.label}</span>}
        {!compact && item.badge && <span className="menu-badge">{item.badge}</span>}
      </>
    );
    return (
      <li
        key={item.id}
        data-active-branch={hasChildren && containsActive(item) ? 'true' : undefined}
      >
        <div className="menu-item-row">
          {item.href && !item.disabled && !(compact && hasChildren) ? (
            <a
              href={item.href}
              title={compact ? item.label : undefined}
              aria-label={item.label}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={activate}
            >
              {content}
            </a>
          ) : (
            <button
              type="button"
              disabled={item.disabled}
              title={compact ? item.label : undefined}
              aria-label={item.label}
              aria-current={!hasChildren && active === item.id ? 'page' : undefined}
              aria-expanded={hasChildren ? open : undefined}
              onClick={hasChildren ? toggle : activate}
            >
              {content}
              {hasChildren &&
                !compact &&
                !item.href &&
                (open ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}
            </button>
          )}
          {hasChildren && item.href && !compact && (
            <button
              type="button"
              className="menu-expand"
              aria-label={item.label + ' 하위 메뉴'}
              aria-expanded={open}
              disabled={item.disabled}
              onClick={toggle}
            >
              {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          )}
        </div>
        {hasChildren && open && !compact && (
          <ul className="menu-children">{item.children!.map((child) => renderItem(child))}</ul>
        )}
      </li>
    );
  }
  const items = node.props.menuItems ?? [];
  const popupItem = items.find((i) => i.id === popup?.id);
  return (
    <nav
      className={'structured-menu ' + (panel.collapsed ? 'menu-rail' : '')}
      aria-label={node.props.text || '메뉴'}
    >
      <ul>{items.map((item) => renderItem(item, panel.collapsed))}</ul>
      {query && !items.some((i) => i.kind !== 'group' && i.kind !== 'divider' && matches(i)) && (
        <p role="status">검색 결과가 없습니다.</p>
      )}
      {popup &&
        popupItem &&
        createPortal(
          <div
            ref={flyout}
            className="menu-flyout structured-menu"
            aria-label={popupItem.label + ' 하위 메뉴'}
            style={{ ...popup.theme, left: popup.left, top: popup.top, maxHeight: popup.height }}
            onBlur={(e) => {
              if (
                e.relatedTarget &&
                !e.currentTarget.contains(e.relatedTarget) &&
                !trigger.current?.contains(e.relatedTarget)
              )
                closePopup();
            }}
          >
            <strong>{popupItem.label}</strong>
            <ul>{popupItem.children?.map((child) => renderItem(child))}</ul>
          </div>,
          document.body,
        )}
    </nav>
  );
}
