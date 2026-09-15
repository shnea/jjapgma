import { ChevronDown, ChevronRight, Layers3, Lock, EyeOff, GripVertical } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { registry, type UiNode } from '@jjapgma/ui-spec';

export function Layers({
  node,
  selectedId,
  onSelect,
  onDrop,
  disabled,
  depth = 0,
}: {
  node: UiNode;
  selectedId: string;
  onSelect: (id: string) => void;
  onDrop: (id: string, data: string, position?: 'before' | 'inside' | 'after') => void;
  disabled: boolean;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [dropPos, setDropPos] = useState<'before' | 'inside' | 'after' | null>(null);

  const isContainer = Boolean(registry[node.type].children);
  const locked = disabled || node.locked;
  const position = (event: DragEvent<HTMLDivElement>) => {
    if (depth === 0) return 'inside' as const;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientY - rect.top) / rect.height;
    return isContainer && fraction > 0.25 && fraction < 0.75
      ? ('inside' as const)
      : fraction < 0.5
        ? ('before' as const)
        : ('after' as const);
  };

  return (
    <div className="layer-branch">
      <div
        className={`layer-row ${selectedId === node.id ? 'selected' : ''} ${dropPos ? `layer-drop-${dropPos}` : ''}`}
        style={{ paddingLeft: 6 + depth * 12 }}
        draggable={!locked && depth > 0}
        onDragStart={(event) => {
          if (locked || depth === 0) {
            event.preventDefault();
            return;
          }
          event.stopPropagation();
          event.dataTransfer.effectAllowed = 'move';
          const data = JSON.stringify({ id: node.id });
          event.dataTransfer.setData('application/jjapgma', data);
          event.dataTransfer.setData('text/plain', data);
        }}
        onDragOver={(event) => {
          if (
            !locked &&
            (event.dataTransfer.types.includes('application/jjapgma') ||
              event.dataTransfer.types.includes('text/plain'))
          ) {
            event.preventDefault();
            event.stopPropagation();
            setDropPos(position(event));
          }
        }}
        onDragLeave={() => setDropPos(null)}
        onDrop={(event) => {
          if (
            !locked &&
            (event.dataTransfer.types.includes('application/jjapgma') ||
              event.dataTransfer.types.includes('text/plain'))
          ) {
            event.preventDefault();
            event.stopPropagation();
            const pos = position(event);
            setDropPos(null);
            onDrop(
              node.id,
              event.dataTransfer.getData('application/jjapgma') || event.dataTransfer.getData('text/plain'),
              pos,
            );
          }
        }}
        onClick={() => onSelect(node.id)}
      >
        {depth > 0 && !locked && (
          <span className="layer-drag-handle" title="드래그하여 순서 변경">
            <GripVertical size={12} />
          </span>
        )}
        {node.children.length ? (
          <button
            type="button"
            className="layer-toggle"
            aria-label={`${node.name} ${expanded ? '접기' : '펼치기'}`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="layer-spacer" />
        )}
        <button
          type="button"
          className="layer-title-wrap layer-select"
          onClick={() => onSelect(node.id)}
        >
          <Layers3 size={13} />
          <span>{node.name}</span>
          {node.locked && <Lock size={11} />} {node.style.hidden && <EyeOff size={11} />}
        </button>
      </div>
      {expanded &&
        node.children.map((child) => (
          <Layers
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            onDrop={onDrop}
            disabled={locked}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
