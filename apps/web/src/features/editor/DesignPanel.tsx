import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
const storageKey = 'jjapgma.design-panel-width';
const minimum = 300,
  maximum = 560,
  defaultWidth = 380;
const clamp = (value: number, max = maximum) => Math.min(max, Math.max(minimum, value));
export function DesignPanel({ children }: { children: ReactNode }) {
  const panel = useRef<HTMLElement>(null);
  const id = useId();
  const [limit, setLimit] = useState(maximum);
  const [preferred, setPreferred] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(storageKey));
      return stored >= minimum && Number.isFinite(stored) ? clamp(stored) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; width: number } | undefined>(undefined);
  const width = clamp(preferred, limit);
  useEffect(() => {
    const container = panel.current?.parentElement;
    if (!container) return;
    const resize = () => {
      const left = container.querySelector('.left-panel')?.getBoundingClientRect().width ?? 0;
      setLimit(clamp(container.clientWidth - left - 320));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return () => observer.disconnect();
  }, []);
  function resize(value: number) {
    const next = clamp(value, limit);
    setPreferred(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      /* Layout works without storage. */
    }
  }
  return (
    <aside
      ref={panel}
      id={id}
      className={`right-panel${dragging ? ' is-resizing' : ''}`}
      style={{ width }}
    >
      <div
        className="panel-resizer"
        role="separator"
        aria-label="디자인 패널 너비"
        aria-orientation="vertical"
        aria-controls={id}
        aria-valuemin={minimum}
        aria-valuemax={limit}
        aria-valuenow={width}
        tabIndex={0}
        title="드래그 또는 좌우 방향키로 너비 조절 · 두 번 클릭하여 초기화"
        onDoubleClick={() => resize(defaultWidth)}
        onKeyDown={(e) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
          e.preventDefault();
          e.stopPropagation();
          resize(
            e.key === 'Home'
              ? minimum
              : e.key === 'End'
                ? limit
                : width + (e.key === 'ArrowLeft' ? 20 : -20),
          );
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, width };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (drag.current) resize(drag.current.width + drag.current.x - e.clientX);
        }}
        onPointerUp={(e) => {
          drag.current = undefined;
          setDragging(false);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onLostPointerCapture={() => {
          drag.current = undefined;
          setDragging(false);
        }}
      />
      {children}
    </aside>
  );
}
