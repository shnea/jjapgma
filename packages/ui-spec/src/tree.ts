import { registry, legacyTypeAliases, type ComponentType } from './registry.js';
import { nodeId } from './id.js';
import { inputTypes, optionTypes } from './catalog/forms.js';
import { horizontalTypes } from './catalog/layout.js';
import { validateSpec, type UiNode, type UiSpec, type Breakpoint } from './schema.js';
export function createNode(typeOrLegacy: string): UiNode {
  const legacy = legacyTypeAliases[typeOrLegacy];
  const type = (legacy ? legacy.type : typeOrLegacy) as ComponentType;
  if (!registry[type]) {
    throw new Error(`지원하지 않는 요소 종류: ${typeOrLegacy}`);
  }
  return {
    id: nodeId(),
    type,
    name: registry[type].name,
    locked: false,
    props: {
      text: registry[type].text,
      ...(inputTypes.includes(type) ? { placeholder: '입력해 주세요' } : {}),
      ...(inputTypes.includes(type)
        ? {
            labelVisible: true,
            labelPosition: type === 'checkbox' ? ('right' as const) : ('top' as const),
          }
        : {}),
      ...(type === 'input' ? { controlType: 'text' as const } : {}),
      ...(['checkbox', 'radio'].includes(type)
        ? { optionDirection: 'column' as const, optionAlign: 'left' as const }
        : {}),
      ...(type === 'heading' ? { titleLevel: 'h2' as const } : {}),
      ...(optionTypes.includes(type)
        ? {
            items:
              type === 'table'
                ? '이름|상태|역할\n홍길동|활성|편집자\n김민수|활성|뷰어'
                : type === 'descriptionList'
                  ? '이름|홍길동\n이메일|user@example.com\n상태|활성'
                  : '첫 번째 항목\n두 번째 항목\n세 번째 항목',
          }
        : {}),
      ...(type === 'image' ? { src: '/placeholder.svg' } : {}),
      ...(type === 'table'
        ? {
            showHeader: true,
            paginationMode: 'none' as const,
            paginationDesign: 'numbered' as const,
          }
        : {}),
      ...(type === 'list'
        ? {
            showHeader: false,
            paginationMode: 'none' as const,
            paginationDesign: 'numbered' as const,
          }
        : {}),
      ...(type === 'link' ? { href: '#details' } : {}),
      ...(type === 'badge' ? { shape: 'rounded' as const } : {}),
      ...(type === 'progress' ? { shape: 'bar' as const, value: 65 } : {}),
      ...(type === 'skeleton' ? { shape: 'lines' as const } : {}),
      ...(type === 'emptyState' ? { stateType: 'empty' as const } : {}),
      ...(type === 'alert' ? { stateType: 'info' as const, text: '알림 메시지입니다.' } : {}),
      ...(type === 'modal' ? { isOpen: true, text: '모달 대화상자' } : {}),
      ...(type === 'dialog' ? { text: '다이얼로그 메시지입니다.', titleLevel: 'h3' as const } : {}),
      ...(type === 'button' ? { variant: 'default' as const } : {}),
      ...(legacy?.props),
    },
    style: registry[type].children
      ? {
          direction: horizontalTypes.includes(type) ? 'row' : 'column',
          gap: 16,
          padding: 24,
          ...(type === 'card' ? { background: '#ffffff', radius: 12 } : {}),
          ...(type === 'grid' ? { gridColumns: 2, gridRows: 1 } : {}),
          ...(type === 'modal' ? { background: '#ffffff', radius: 12, width: '480px' } : {}),
          ...(type === 'dialog' ? { background: '#ffffff', radius: 12, width: '400px' } : {}),
          ...(legacy?.style),
        }
      : type === 'spacer'
        ? { height: '48px' }
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
