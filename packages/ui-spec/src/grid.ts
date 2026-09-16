import { createNode } from './tree.js';
import type { UiNode } from './schema.js';

export function gridDimensions(node: UiNode) {
  const columns = node.style.gridColumns ?? 2;
  return {
    columns,
    rows: Math.max(node.style.gridRows ?? 1, Math.ceil(node.children.length / columns), 1),
  };
}

function cell(index: number): UiNode {
  const node = createNode('container', true);
  node.name = `영역 ${index + 1}`;
  node.style = {
    direction: 'column',
    padding: 16,
    gap: 12,
    minHeight: '120px',
    borderWidth: 1,
    borderColor: 'theme:border',
    radius: 8,
  };
  return node;
}

export function createGrid(): UiNode {
  const node = createNode('grid', true);
  node.style = { ...node.style, width: '100%', padding: 0, gap: 16, gridColumns: 2, gridRows: 2 };
  node.responsive.mobile = { gridColumns: 1, gridRows: 1 };
  node.children = Array.from({ length: 4 }, (_, index) => cell(index));
  return node;
}

/** Resize the basic structure without silently removing content or locked cells. */
export function resizeGrid(node: UiNode, columns: number, rows: number) {
  if (node.type !== 'grid' || node.locked) throw new Error('잠긴 그리드는 변경할 수 없습니다.');
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 1 ||
    columns > 12 ||
    rows < 1 ||
    rows > 50
  )
    throw new Error('그리드는 1~12열, 1~50행으로 설정하세요.');
  const previous = gridDimensions(node);
  const kept: UiNode[] = [];
  const names = new Set(node.children.map((child) => child.name));
  let nextNumber = 1;
  const emptyCell = () => {
    while (names.has(`영역 ${nextNumber}`)) nextNumber++;
    const child = cell(nextNumber++ - 1);
    names.add(child.name);
    return child;
  };
  for (let r = 0; r < previous.rows; r++) {
    for (let c = 0; c < previous.columns; c++) {
      const child = node.children[r * previous.columns + c];
      if (
        child &&
        (r >= rows || c >= columns) &&
        (child.locked ||
          child.type !== 'container' ||
          child.children.length > 0 ||
          child.props.text ||
          child.props.attachment)
      )
        throw new Error(
          '줄일 영역에 요소가 있거나 잠겨 있습니다. 내용을 옮기거나 비운 뒤 줄여 주세요.',
        );
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      kept.push(
        c < previous.columns && r < previous.rows
          ? (node.children[r * previous.columns + c] ?? emptyCell())
          : emptyCell(),
      );
    }
  }
  node.children = kept;
  node.style.gridColumns = columns;
  node.style.gridRows = rows;
}
