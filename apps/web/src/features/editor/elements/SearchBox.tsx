import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { UiNode, Breakpoint } from '@jjapgma/ui-spec';
import { useNavigation } from '../NavigationRuntime';

export function SearchBox({ node, breakpoint }: { node: UiNode; breakpoint: Breakpoint }) {
  const { queries, search } = useNavigation();
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const target = node.props.searchTargetId;
  const value = target ? (queries[target] ?? '') : local;
  const update = (v: string) => (target ? search(target, v) : setLocal(v));
  const compact = breakpoint === 'mobile' && node.props.mobileSearch === 'icon';
  const align = node.props.searchAlign ?? 'right';
  return (
    <div
      className="element-menu-search"
      style={{
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
      }}
    >
      {compact && !expanded ? (
        <button
          ref={trigger}
          type="button"
          className="search-icon-trigger"
          aria-label="검색창 열기"
          onClick={() => setExpanded(true)}
        >
          <Search size={20} />
        </button>
      ) : (
        <div className="search-box-field" style={{ width: node.props.searchWidth ?? 240 }}>
          <Search size={17} aria-hidden="true" />
          <input
            ref={input}
            autoFocus={compact && expanded}
            type="search"
            aria-label={node.props.text || '메뉴 검색'}
            placeholder={node.props.placeholder ?? '메뉴 검색'}
            value={value}
            onChange={(e) => update(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && compact) {
                setExpanded(false);
                requestAnimationFrame(() => trigger.current?.focus());
              }
            }}
          />
          {value && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => {
                update('');
                input.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          )}
          {compact && (
            <button
              type="button"
              aria-label="검색창 닫기"
              onClick={() => {
                setExpanded(false);
                requestAnimationFrame(() => trigger.current?.focus());
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
