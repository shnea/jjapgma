import { useState, type CSSProperties, type DragEvent } from 'react';
import { ElementContent } from './elements/ElementContent';
import { effectiveStyle, registry, type Breakpoint, type UiNode } from '@jjapgma/ui-spec';
export function NodeRenderer({
  node,
  breakpoint,
  selectedId,
  onSelect,
  onDrop,
  preview = false,
  root = true,
  ancestorLocked = false,
  horizontal = false,
  onResize,
}: {
  node: UiNode;
  breakpoint: Breakpoint;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onDrop?: (id: string, data: string, position?: 'before' | 'inside' | 'after') => void;
  preview?: boolean;
  root?: boolean;
  ancestorLocked?: boolean;
  horizontal?: boolean;
  onResize?: (id: string, width: number, height: number) => void;
}) {
  const [dropPosition, setDropPosition] = useState<'before' | 'inside' | 'after'>();
  const value = effectiveStyle(node, breakpoint);
  const container = registry[node.type].children;
  const locked = ancestorLocked || node.locked;
  function position(event: DragEvent<HTMLDivElement>): 'before' | 'inside' | 'after' {
    if (root) return 'inside';
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = horizontal
      ? (event.clientX - bounds.left) / bounds.width
      : (event.clientY - bounds.top) / bounds.height;
    if (container && fraction > 0.22 && fraction < 0.78) return 'inside';
    return fraction < 0.5 ? 'before' : 'after';
  }
  const style: CSSProperties = {
    width: value.width,
    height: value.height,
    padding: value.padding,
    gap: value.gap,
    borderRadius: value.radius,
    fontSize: value.fontSize,
    background: value.background,
    color: value.color,
    flexDirection: value.direction,
    alignItems: value.align,
    justifyContent: value.justify,
    textAlign: value.textAlign,
    ...(container ? { display: 'flex' } : {}),
    ...(node.type === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${value.gridColumns ?? 2}, minmax(0, 1fr))`,
          gridTemplateRows: value.gridRows ? `repeat(${value.gridRows}, minmax(0, auto))` : undefined,
        }
      : {}),
    ...(value.hidden ? { ...(preview ? { display: 'none' } : {}), opacity: 0.3 } : {}),
  };
  const content = container ? (
    node.children.length ? (
      node.children.map((child) => (
        <NodeRenderer
          key={child.id}
          node={child}
          breakpoint={breakpoint}
          selectedId={selectedId}
          onSelect={onSelect}
          onDrop={onDrop}
          onResize={onResize}
          preview={preview}
          root={false}
          ancestorLocked={locked}
          horizontal={value.direction === 'row'}
        />
      ))
    ) : !preview ? (
      <span className="drop-hint">요소를 여기로 끌어오세요</span>
    ) : null
  ) : (
    <ElementContent node={node} />
  );
  return (
    <div
      data-node-id={node.id}
      data-testid={`node-${node.type}`}
      data-drop-position={dropPosition}
      data-drop-axis={horizontal ? 'horizontal' : 'vertical'}
      draggable={!preview && !!onDrop && !root && !locked}
      onDragStart={(event) => {
        if (preview || !onDrop || root || locked) return;
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/jjapgma', JSON.stringify({ id: node.id }));
        onSelect?.(node.id);
      }}
      onDragEnd={() => setDropPosition(undefined)}
      className={`render-node render-${node.type} ${selectedId === node.id && !preview ? 'node-selected' : ''}`}
      style={style}
      onClick={
        preview
          ? undefined
          : (event) => {
              event.stopPropagation();
              onSelect?.(node.id);
            }
      }
      onDragOver={
        preview
          ? undefined
          : (event) => {
              if (onDrop && event.dataTransfer.types.includes('application/jjapgma')) {
                event.stopPropagation();
                if (locked) return;
                event.preventDefault();
                setDropPosition(position(event));
              }
            }
      }
      onDrop={
        preview
          ? undefined
          : (event) => {
              setDropPosition(undefined);
              if (onDrop && event.dataTransfer.types.includes('application/jjapgma')) {
                event.stopPropagation();
                if (locked) return;
                event.preventDefault();
                onDrop(node.id, event.dataTransfer.getData('application/jjapgma'), position(event));
              }
            }
      }
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDropPosition(undefined);
      }}
    >
      {selectedId === node.id && !preview && <span className="node-label">{node.name}</span>}
      {container || preview ? (
        content
      ) : (
        <div
          className="render-content"
          inert={!preview && !['heading', 'text', 'label', 'divider', 'spacer'].includes(node.type)}
        >
          {content}
        </div>
      )}
      {selectedId === node.id && !preview && !root && onResize && (
        <span
          className="resize-handle resize-handle-se"
          role="button"
          aria-label="크기 조절"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const startX = event.clientX;
            const startY = event.clientY;
            const bounds = event.currentTarget.parentElement!.getBoundingClientRect();
            const move = (moveEvent: PointerEvent) => {
              void moveEvent;
            };
            const up = (upEvent: PointerEvent) => {
              const width = Math.max(40, Math.round(bounds.width + upEvent.clientX - startX));
              const height = Math.max(28, Math.round(bounds.height + upEvent.clientY - startY));
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', up);
              onResize(node.id, width, height);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up, { once: true });
          }}
        />
      )}
    </div>
  );
}
