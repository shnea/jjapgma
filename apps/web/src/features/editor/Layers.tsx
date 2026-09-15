import { ChevronDown, ChevronRight, Layers3, Lock, EyeOff, GripVertical } from 'lucide-react';
import { useState } from 'react';
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

  return (
    <div className="layer-branch">
      <div
        className={`layer-row ${selectedId === node.id ? 'selected' : ''} ${dropPos ? `layer-drop-${dropPos}` : ''}`}
        style={{ paddingLeft: 6 + depth * 12 }}
        draggable={!disabled && depth > 0 && !node.locked}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('application/jjapgma', JSON.stringify({ id: node.id }));
        }}
        onDragOver={(event) => {
          if (!disabled) {
            event.preventDefault();
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            const relY = event.clientY - rect.top;
            if (isContainer && relY > rect.height * 0.25 && relY < rect.height * 0.75) {
              setDropPos('inside');
            } else if (relY < rect.height * 0.5) {
              setDropPos('before');
            } else {
              setDropPos('after');
            }
          }
        }}
        onDragLeave={() => setDropPos(null)}
        onDrop={(event) => {
          if (!disabled) {
            event.preventDefault();
            event.stopPropagation();
            const pos = dropPos || 'inside';
            setDropPos(null);
            onDrop(node.id, event.dataTransfer.getData('application/jjapgma'), pos);
          }
        }}
        onClick={() => onSelect(node.id)}
      >
        {depth > 0 && !node.locked && (
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
        <div className="layer-title-wrap">
          <Layers3 size={13} />
          <span>{node.name}</span>
          {node.locked && <Lock size={11} />} {node.style.hidden && <EyeOff size={11} />}
        </div>
      </div>
      {expanded &&
        node.children.map((child) => (
          <Layers
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            onDrop={onDrop}
            disabled={disabled}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
