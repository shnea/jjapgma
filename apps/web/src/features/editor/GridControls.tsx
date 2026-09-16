import { Minus, Plus, Columns2, Rows2 } from 'lucide-react';
import { gridDimensions, type UiNode } from '@jjapgma/ui-spec';
import './grid-controls.css';

export function GridControls({
  node,
  onResize,
}: {
  node: UiNode;
  onResize: (id: string, columns: number, rows: number) => void;
}) {
  const { columns, rows } = gridDimensions(node);
  return (
    <div
      className="grid-edit-controls"
      role="group"
      aria-label="그리드 영역 조절"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onDragStart={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <span title="모든 화면에 적용되는 기본 영역 구조">
        {columns} × {rows}
      </span>
      <Columns2 size={14} aria-hidden="true" />
      <button
        type="button"
        aria-label="그리드 열 줄이기"
        disabled={columns <= 1}
        onClick={() => onResize(node.id, columns - 1, rows)}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        aria-label="그리드 열 늘리기"
        disabled={columns >= 12}
        onClick={() => onResize(node.id, columns + 1, rows)}
      >
        <Plus size={14} />
      </button>
      <Rows2 size={14} aria-hidden="true" />
      <button
        type="button"
        aria-label="그리드 행 줄이기"
        disabled={rows <= 1}
        onClick={() => onResize(node.id, columns, rows - 1)}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        aria-label="그리드 행 늘리기"
        disabled={rows >= 50}
        onClick={() => onResize(node.id, columns, rows + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
