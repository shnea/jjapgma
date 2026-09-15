import { registry, type ComponentType } from './registry.js';
import { createNode, findNode, findParent, insertNode, moveNode } from './tree.js';
import type { UiSpec } from './schema.js';
export type DropPosition = 'before' | 'inside' | 'after';
export function dropElement(
  spec: UiSpec,
  targetId: string,
  data: string,
  position: DropPosition = 'inside',
): UiSpec {
  const value: { id?: string; type?: ComponentType } = JSON.parse(data);
  const target = findNode(spec.root, targetId);
  if (!target) throw new Error('이동할 위치를 찾을 수 없습니다.');
  if (value.id === targetId) return spec;
  const parent = position === 'inside' ? target : findParent(spec.root, targetId);
  if (!parent || !registry[parent.type].children) throw new Error('요소를 넣을 영역을 선택하세요.');
  let index =
    position === 'inside'
      ? parent.children.length
      : parent.children.findIndex((n) => n.id === targetId) + (position === 'after' ? 1 : 0);
  if (typeof value.id === 'string') {
    const oldIndex = parent.children.findIndex((n) => n.id === value.id);
    if (oldIndex >= 0 && oldIndex < index) index--;
    return moveNode(spec, value.id, parent.id, index);
  }
  if (!value.type || !Object.hasOwn(registry, value.type))
    throw new Error('지원하지 않는 요소입니다.');
  const node = createNode(value.type);
  const next = insertNode(spec, parent.id, node);
  return moveNode(next, node.id, parent.id, index);
}
