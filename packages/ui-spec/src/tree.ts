import { registry, legacyTypeAliases, type ComponentType } from './registry.js';
import { nodeId } from './id.js';
import { richTextExample } from './rich-text.js';
import { mergeCss } from './css.js';
import { inputTypes, optionTypes } from './catalog/forms.js';
import { horizontalTypes } from './catalog/layout.js';
import { validateSpec, type UiNode, type UiSpec, type Breakpoint } from './schema.js';
export function createNode(typeOrLegacy: string, inheritTheme = false): UiNode {
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
      ...(type === 'richText'
        ? {
            documentJson: richTextExample,
            richTextMode: 'editor' as const,
            richTextFont: 'sans' as const,
            richTextImageModal: true,
          }
        : {}),
      ...(type === 'chart'
        ? {
            chartVariant: 'bar' as const,
            chartUnit: '건',
            chartData: [
              { label: '4월', value: 18 },
              { label: '5월', value: 24 },
              { label: '6월', value: 20 },
              { label: '7월', value: 32 },
              { label: '8월', value: 28 },
              { label: '9월', value: 42 },
            ],
          }
        : {}),
      ...(type === 'wizard'
        ? { text: '단계별 입력', wizardCompletionText: '입력 단계를 모두 확인했습니다.' }
        : {}),
      ...(type === 'sidePanel'
        ? {
            panelSide: 'left' as const,
            panelMode: 'collapsible' as const,
            collapseMode: 'rail' as const,
            collapsedWidth: 64,
            defaultCollapsed: false,
            mobileDrawer: true,
            mobileTrigger: 'auto' as const,
            drawerScope: 'parent' as const,
          }
        : {}),
      ...(type === 'drawer'
        ? {
            isOpen: false,
            panelSide: 'left' as const,
            drawerScope: 'parent' as const,
            closeOnBackdrop: true,
          }
        : {}),
      ...(type === 'carousel'
        ? {
            carouselLoop: true,
            carouselAutoplay: false,
            carouselInterval: 5000,
            carouselArrows: true,
            carouselDots: true,
            carouselCounter: true,
            carouselVariant: 'controls' as const,
            carouselSizing: 'ratio' as const,
            carouselRatio: '16/9' as const,
            carouselHeight: 320,
            carouselFit: 'cover' as const,
          }
        : {}),
      ...(type === 'searchBox'
        ? {
            placeholder: '메뉴 검색',
            mobileSearch: 'icon' as const,
            searchAlign: 'right' as const,
            searchWidth: 240,
          }
        : {}),
      ...(type === 'chat'
        ? {
            placeholder: '메시지를 입력하세요',
            showTimestamps: true,
            chatLoading: false,
            chatMessages: [
              {
                role: 'user' as const,
                content: '새로운 화면을 함께 만들어 볼까요?',
                time: '오후 2:30',
              },
              {
                role: 'assistant' as const,
                content:
                  '좋아요! **어떤 화면**이 필요한지 알려주세요.\n\n- 필요한 기능\n- 원하는 분위기',
                time: '오후 2:31',
              },
            ],
          }
        : {}),
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
      ...(type === 'nonModal' ? { isOpen: true, text: 'Non-modal 창' } : {}),
      ...(type === 'dialog' ? { text: '다이얼로그 메시지입니다.', titleLevel: 'h3' as const } : {}),
      ...(type === 'button' ? { variant: 'default' as const } : {}),
      ...legacy?.props,
    },
    style: registry[type].children
      ? {
          direction: horizontalTypes.includes(type) ? 'row' : 'column',
          ...(!inheritTheme ? { gap: 16, padding: 24 } : {}),
          ...(type === 'card' && !inheritTheme ? { background: '#ffffff', radius: 12 } : {}),
          ...(type === 'grid' ? { gridColumns: 2, gridRows: 1 } : {}),
          ...(type === 'sidePanel'
            ? { width: '240px', padding: 16, gap: 16, background: 'theme:surface' }
            : {}),
          ...(type === 'drawer'
            ? { width: '300px', padding: 20, background: 'theme:surface' }
            : {}),
          ...(type === 'carousel' ? { width: '100%', padding: 0, gap: 0 } : {}),
          ...(type === 'modal' || type === 'nonModal'
            ? { ...(!inheritTheme ? { background: '#ffffff', radius: 12 } : {}), width: '480px' }
            : {}),
          ...(type === 'dialog'
            ? { ...(!inheritTheme ? { background: '#ffffff', radius: 12 } : {}), width: '400px' }
            : {}),
          ...legacy?.style,
        }
      : type === 'richText'
        ? {
            width: '100%',
            minHeight: '240px',
            fontSize: 16,
            lineHeight: 1.7,
            padding: 24,
            background: 'theme:surface',
            color: 'theme:text',
            borderWidth: 1,
            borderColor: 'theme:border',
            radius: 12,
          }
        : type === 'chat'
          ? { height: '560px', width: '100%' }
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
  root.style = { direction: 'column', padding: 40, gap: 24 };
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
  const override = node.responsive[breakpoint];
  const style = { ...node.style, ...override };
  if (node.style.css || override?.css) style.css = mergeCss(node.style.css, override?.css);
  if (breakpoint === 'mobile') {
    const layout = ['container', 'card', 'grid'].includes(node.type);
    const scrolling = ['auto', 'scroll'].includes(style.overflowX ?? style.overflow ?? '');
    if (node.type === 'grid' && !scrolling) {
      if (override?.gridColumns === undefined) style.gridColumns = 1;
      if (override?.gridRows === undefined) style.gridRows = 1;
    }
    if (layout && !scrolling && override?.direction === undefined && style.direction === 'row') {
      const sections = node.children.some((child) =>
        ['container', 'card', 'grid', 'image', 'table', 'chart'].includes(child.type),
      );
      if (sections) style.direction = 'column';
    }
    if (layout && !scrolling && style.direction === 'row' && override?.wrap === undefined)
      style.wrap = true;
    if (
      layout &&
      override?.width === undefined &&
      (!node.style.width || node.style.width === 'auto')
    )
      style.width = '100%';
    if (override?.minWidth === undefined) style.minWidth = '0px';
    if (node.style.maxWidth && node.style.maxWidth !== 'auto' && override?.maxWidth === undefined)
      style.maxWidth = `min(100%, ${node.style.maxWidth})`;
    if (
      node.style.direction === 'row' &&
      style.direction === 'column' &&
      override?.align === undefined
    )
      style.align = 'stretch';
  }
  // A row's bottom alignment must not become right alignment when stacked.
  // Explicit per-device alignment remains authoritative, including old saved pages.
  if (
    breakpoint !== 'desktop' &&
    node.style.direction === 'row' &&
    override?.direction === 'column' &&
    override.align === undefined &&
    node.style.align === 'flex-end'
  )
    style.align = 'stretch';
  return style;
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
  const copy = structuredClone(node),
    ids = new Map<string, string>();
  const visit = (n: UiNode) => {
    const id = nodeId();
    ids.set(n.id, id);
    n.id = id;
    n.children.forEach(visit);
  };
  visit(copy);
  const remap = (n: UiNode) => {
    const action = n.props.overlayAction;
    if (n.props.searchTargetId && ids.has(n.props.searchTargetId))
      n.props.searchTargetId = ids.get(n.props.searchTargetId);
    if (action?.targetId && ids.has(action.targetId)) action.targetId = ids.get(action.targetId);
    n.children.forEach(remap);
  };
  remap(copy);
  return copy;
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
