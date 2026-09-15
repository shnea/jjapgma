import { useState, type CSSProperties, type DragEvent } from 'react';
import { GripVertical } from 'lucide-react';
import { registry, type Breakpoint, type UiNode } from '@jjapgma/ui-spec';
import { ElementContent } from './elements/ElementContent';

export function NodeRenderer({
  node,
  breakpoint,
  selectedId,
  onSelect,
  onDrop,
  onResize,
  preview = false,
  root = false,
  ancestorLocked = false,
  horizontal = false,
}: {
  node: UiNode;
  breakpoint: Breakpoint;
  selectedId: string;
  onSelect?: (id: string) => void;
  onDrop?: (id: string, data: string, position?: 'before' | 'inside' | 'after') => void;
  onResize?: (id: string, width: number, height: number) => void;
  preview?: boolean;
  root?: boolean;
  ancestorLocked?: boolean;
  horizontal?: boolean;
}) {
  const [dropPosition, setDropPosition] = useState<'before' | 'inside' | 'after' | undefined>();
  const [modalOpen, setModalOpen] = useState(true);
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const container = Boolean(registry[node.type].children);
  const value = node.responsive[breakpoint] ?? node.style;
  const locked = ancestorLocked || node.locked;

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (!preview) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX - modalOffset.x;
    const startY = e.clientY - modalOffset.y;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      setModalOffset({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  function position(event: DragEvent<HTMLDivElement>): 'before' | 'inside' | 'after' {
    if (root) return 'inside';
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = horizontal
      ? (event.clientX - bounds.left) / bounds.width
      : (event.clientY - bounds.top) / bounds.height;
    if (container && fraction > 0.22 && fraction < 0.78) return 'inside';
    return fraction < 0.5 ? 'before' : 'after';
  }
  function parseCustomCss(cssStr?: string): CSSProperties {
    if (!cssStr) return {};
    const custom: Record<string, string> = {};
    cssStr.split(';').forEach((statement) => {
      const [key, ...values] = statement.split(':');
      if (key && values.length) {
        const camelKey = key.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        custom[camelKey] = values.join(':').trim();
      }
    });
    return custom as CSSProperties;
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
    overflow: value.overflow,
    ...(container ? { display: 'flex' } : {}),
    ...(node.type === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${value.gridColumns ?? 2}, minmax(0, 1fr))`,
          gridTemplateRows: value.gridRows ? `repeat(${value.gridRows}, minmax(0, auto))` : undefined,
        }
      : {}),
    ...(value.hidden ? { ...(preview ? { display: 'none' } : {}), opacity: 0.3 } : {}),
    ...parseCustomCss(node.props.customCss),
  };

  if ((node.type === 'modal' || node.type === 'dialog') && preview && !modalOpen) {
    return (
      <div className="render-modal-reopen-wrap" style={{ padding: '12px 0' }}>
        <button
          type="button"
          className="dialog-btn primary"
          onClick={() => setModalOpen(true)}
        >
          {node.props.text || '모달/다이얼로그'} 다시 열기
        </button>
      </div>
    );
  }

  const innerContent = container ? (
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

  const modalTransformStyle: CSSProperties =
    preview && (modalOffset.x || modalOffset.y)
      ? { transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }
      : {};

  const content =
    node.type === 'modal' ? (
      <div className="render-modal-inner" style={modalTransformStyle}>
        <div
          className="modal-header-bar"
          onMouseDown={handleHeaderMouseDown}
          style={{ cursor: preview ? 'grab' : 'default' }}
          title={preview ? '드래그하여 이동' : undefined}
        >
          <strong>{node.props.text || '모달 대화상자'}</strong>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="닫기"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(false);
            }}
          >
            ×
          </button>
        </div>
        <div className="modal-content-area">{innerContent}</div>
      </div>
    ) : node.type === 'dialog' ? (
      <div className="render-dialog-inner" style={modalTransformStyle}>
        <div
          className="dialog-header-bar"
          onMouseDown={handleHeaderMouseDown}
          style={{ cursor: preview ? 'grab' : 'default' }}
          title={preview ? '드래그하여 이동' : undefined}
        >
          <strong>{node.props.text || '다이얼로그'}</strong>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="닫기"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(false);
            }}
          >
            ×
          </button>
        </div>
        <div className="dialog-content-area">{innerContent}</div>
        <div className="dialog-footer-bar">
          <button
            type="button"
            className="dialog-btn secondary"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(false);
            }}
          >
            취소
          </button>
          <button
            type="button"
            className="dialog-btn primary"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(false);
            }}
          >
            확인
          </button>
        </div>
      </div>
    ) : (
      innerContent
    );
  return (
    <div
      data-node-id={node.id}
      data-testid={`node-${node.type}`}
      data-drop-position={dropPosition}
      data-drop-axis={horizontal ? 'horizontal' : 'vertical'}
      data-preview={preview ? 'true' : undefined}
      draggable={!preview && !!onDrop && !root && !locked}
      onDragStart={(event) => {
        if (preview || !onDrop || root || locked) return;
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/jjapgma', JSON.stringify({ id: node.id }));
        onSelect?.(node.id);
      }}
      onDragEnd={() => setDropPosition(undefined)}
      className={`render-node render-${node.type} ${preview ? 'preview-mode' : ''} ${selectedId === node.id && !preview ? 'node-selected' : ''}`}
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
      {selectedId === node.id && !preview && (
        <span className="node-label">
          {!root && !locked && <GripVertical size={11} style={{ marginRight: 3, verticalAlign: 'middle', cursor: 'grab' }} />}
          {node.name}
        </span>
      )}
      {container || preview ? (
        content
      ) : (
        <div className="render-content" style={{ pointerEvents: preview ? 'auto' : 'none', width: '100%' }}>
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
