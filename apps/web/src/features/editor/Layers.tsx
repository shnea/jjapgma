import { ChevronDown, ChevronRight, Layers3, Lock, EyeOff } from 'lucide-react';
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
  onDrop: (id: string, data: string) => void;
  disabled: boolean;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="layer-branch">
      <div
        className={`layer-row ${selectedId === node.id ? 'selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        draggable={!disabled && depth > 0 && !node.locked}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.setData('application/jjapgma', JSON.stringify({ id: node.id }));
        }}
        onDragOver={(event) => {
          if (!disabled && registry[node.type].children) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDrop={(event) => {
          if (!disabled && registry[node.type].children) {
            event.preventDefault();
            event.stopPropagation();
            onDrop(node.id, event.dataTransfer.getData('application/jjapgma'));
          }
        }}
      >
        {node.children.length ? (
          <button
            className="layer-toggle"
            aria-label={`${node.name} ${expanded ? '접기' : '펼치기'}`}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="layer-spacer" />
        )}
        <button className="layer-select" onClick={() => onSelect(node.id)}>
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
            disabled={disabled}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
