import { registry, type ComponentType } from './registry.js';
import { nodeId } from './id.js';
import { validateSpec, type UiNode, type UiSpec, type Breakpoint } from './schema.js';
export function createNode(type: ComponentType): UiNode {
  return {
    id: nodeId(),
    type,
    name: registry[type].name,
    locked: false,
    props: {
      text: registry[type].text,
      ...(['input', 'textarea'].includes(type) ? { placeholder: '입력해 주세요' } : {}),
    },
    style: registry[type].children
      ? {
          direction: type === 'stack' ? 'row' : 'column',
          gap: 16,
          padding: 24,
          ...(type === 'card' ? { background: '#ffffff', radius: 12 } : {}),
        }
      : {},
    responsive: {},
    children: [],
  };
}
export function createSpec(): UiSpec {
  const root = createNode('container');
  root.name = '화면';
  root.style = { direction: 'column', padding: 40, gap: 24, background: '#ffffff' };
  return { schemaVersion: 1, root };
}
export function findNode(root: UiNode, id: string): UiNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
}
export function effectiveStyle(node: UiNode, breakpoint: Breakpoint) {
  return { ...node.style, ...node.responsive[breakpoint] };
}
export function isLocked(root: UiNode, id: string, ancestorLocked = false): boolean {
  const locked = ancestorLocked || root.locked;
  if (root.id === id) return locked;
  for (const child of root.children) if (findNode(child, id)) return isLocked(child, id, locked);
  return false;
}
export function editSpec(spec: UiSpec, edit: (root: UiNode) => void): UiSpec {
  const next = structuredClone(spec);
  edit(next.root);
  return validateSpec(next);
}
export function insertNode(spec: UiSpec, parentId: string, node: UiNode): UiSpec {
  if (isLocked(spec.root, parentId)) throw new Error('잠긴 영역에는 추가할 수 없습니다.');
  return editSpec(spec, (root) => {
    const parent = findNode(root, parentId);
    if (!parent || !registry[parent.type].children)
      throw new Error('요소를 넣을 영역을 선택하세요.');
    parent.children.push(node);
  });
}
export function removeNode(spec: UiSpec, id: string): UiSpec {
  if (id === spec.root.id || isLocked(spec.root, id))
    throw new Error('화면 또는 잠긴 요소는 삭제할 수 없습니다.');
  return editSpec(spec, (root) => {
    const parent = findParent(root, id);
    if (parent) parent.children = parent.children.filter((n) => n.id !== id);
  });
}
export function findParent(root: UiNode, id: string): UiNode | undefined {
  if (root.children.some((n) => n.id === id)) return root;
  for (const child of root.children) {
    const found = findParent(child, id);
    if (found) return found;
  }
}
export function cloneNode(node: UiNode): UiNode {
  return {
    ...structuredClone(node),
    id: nodeId(),
    children: node.children.map(cloneNode),
  };
}
export function moveNode(spec: UiSpec, id: string, parentId: string, index?: number): UiSpec {
  const node = findNode(spec.root, id);
  if (!node || id === spec.root.id || findNode(node, parentId))
    throw new Error('자신의 하위로 이동할 수 없습니다.');
  if (isLocked(spec.root, id) || isLocked(spec.root, parentId))
    throw new Error('잠긴 요소는 이동할 수 없습니다.');
  return editSpec(spec, (root) => {
    const oldParent = findParent(root, id)!;
    const parent = findNode(root, parentId);
    if (!parent || !registry[parent.type].children) throw new Error('이동할 영역을 선택하세요.');
    const moving = oldParent.children.find((n) => n.id === id)!;
    oldParent.children = oldParent.children.filter((n) => n.id !== id);
    parent.children.splice(index ?? parent.children.length, 0, moving);
  });
}
