import { z } from 'zod';
import {
  registry,
  propertySchema,
  propsSchema,
  styleSchema,
  createNode,
  type ComponentType,
} from '@jjapgma/ui-spec';
import { templateCatalog } from './template-context.js';

const extras: Partial<Record<ComponentType, (keyof z.infer<typeof propsSchema>)[]>> = {
  navbar: ['menuItems', 'activeMenuId'],
  searchBox: ['searchTargetId'],
  button: ['iconPosition', 'iconGap', 'overlayAction'],
  link: ['overlayAction'],
  input: ['description', 'errorText', 'prefix', 'suffix', 'clearable', 'searchTargetId'],
  textarea: ['description', 'errorText'],
  table: ['table'],
  image: ['attachment'],
  fileUpload: ['attachment'],
  modal: ['showFooter', 'closeOnBackdrop'],
  dialog: ['isOpen', 'showFooter', 'closeOnBackdrop'],
  nonModal: ['showFooter', 'closeOnBackdrop'],
};

const json = (schema: z.ZodType) => z.toJSONSchema(schema, { unrepresentable: 'any' });
export const componentTypeInput = z.enum(
  Object.keys(registry) as [ComponentType, ...ComponentType[]],
);
export const designContextInput = z
  .object({
    types: z
      .array(componentTypeInput)
      .min(1)
      .optional()
      .describe(
        '필요한 등록 컴포넌트 종류. 12종 제한 없이 모든 등록 종류를 함께 조회할 수 있으며 중복은 한 번만 반환합니다. 생략하면 기본 6종을 반환합니다.',
      ),
    pageId: z.uuid().optional(),
  })
  .strict();

export function componentCatalog() {
  return Object.fromEntries(
    Object.entries(registry).map(([type, item]) => [
      type,
      {
        name: item.name,
        category: item.category,
        children: item.children,
      },
    ]),
  );
}

export function componentSchema(type: ComponentType) {
  const node = createNode(type);
  const keys = new Set([
    'collapseVisibility',
    ...Object.keys(node.props),
    ...propertySchema
      .filter((p) => (p.types as readonly string[]).includes(type))
      .map((p) => p.key),
    ...(extras[type] ?? []),
  ]);
  const shape = Object.fromEntries(
    Object.entries(propsSchema.shape).filter(([key]) => keys.has(key) && key !== 'customCss'),
  );
  return { node, props: json(z.object(shape).partial().strict()) };
}

export const operationGuide = {
  rules: [
    'navbar.menuItems는 최대 3단계입니다. 메인 화면은 루트 minHeight=100dvh, 모바일 메뉴 버튼은 헤더의 일반 button.overlayAction으로 sidePanel에 연결하고 mobileTrigger=external을 사용합니다. carouselVariant는 controls/arrows/regions이며 크기는 carouselSizing과 carouselRatio/carouselHeight로 지정합니다. chart는 chartData=[{label,value}], chartVariant=bar/line/donut을 사용합니다. wizard는 직계 자식 컨테이너 하나가 한 단계이며 자식 name이 단계 이름입니다. input(controlType=search)의 searchTargetId로 table을 검색할 수 있습니다.',
    'operations는 HTML/CSS가 아닌 아래 작업 형식입니다. op=create와 componentType은 없습니다. 추가는 op=add, type, id, parentId가 필수입니다.',
    '새 페이지의 page-root는 이미 존재합니다. 루트를 만들지 말고 update하세요. 부모를 먼저 add하고 자식의 parentId로 연결하세요. 기본 노드의 예시 UUID는 실제 페이지 요소 ID가 아닙니다.',
    'style.padding은 0~160 정수입니다. 네 방향은 paddingTop/Right/Bottom/Left 정수로 지정하세요. flex/flexGrow는 지원하지 않습니다. 조회한 style의 허용 속성만 사용하세요.',
    'create_page 인자는 name, summary, 선택적 templateId/operations/blank입니다. 호출 메타데이터 id/tool은 인자에 넣지 마세요. 아래 예시는 문법이며 요청한 화면 전체를 구성해야 합니다.',
  ],
  examples: {
    add: {
      op: 'add',
      parentId: 'page-root',
      id: 'content',
      type: 'container',
      style: { padding: 24 },
    },
    update: { op: 'update', nodeId: 'page-root', style: { direction: 'column', gap: 0 } },
    mobile: { op: 'update', nodeId: 'content', breakpoint: 'mobile', style: { width: '100%' } },
    move: { op: 'move', nodeId: 'existing-node', parentId: 'content', index: 0 },
    remove: { op: 'remove', nodeId: 'existing-node' },
    template: { op: 'template', parentId: 'content', templateId: 'login' },
  },
};

export function designContext(
  types: ComponentType[] = ['container', 'navbar', 'heading', 'text', 'button', 'card'],
) {
  return {
    rootId: 'page-root',
    operationGuide,
    workflow:
      '요청한 화면 구성부터 파악하세요. 새 페이지는 현재 페이지 조회가 필요 없습니다. 템플릿은 선택 가능한 재료이며 이름이 비슷하다는 이유로 그대로 반환하지 마세요. 부족한 영역은 기본 컴포넌트로 직접 구성하세요. 템플릿을 수정할 때는 get_template에서 받은 ID로 추가/수정/이동/삭제 operations를 만들고 create_page에 templateId와 함께 한 번에 전달하세요. 템플릿 없이도 전체 요소와 모바일 update를 한 배열에 묶어 create_page로 제안할 수 있습니다. 기존 화면 수정만 pageId로 최신 명세/revision을 조회하세요. 이미 받은 명세를 반복 조회하지 마세요.',
    components: Object.fromEntries(
      [...new Set(types)].map((type) => [type, componentSchema(type)]),
    ),
    style: json(styleSchema),
    templates: templateCatalog(),
    availableComponents: componentCatalog(),
    notes:
      'props는 선택한 요소별 속성, style은 모든 요소가 공유합니다. 헤더는 container, 접기/모바일 서랍이 필요한 사이드바는 sidePanel을 사용하고 안에 navbar를 넣으세요. navbar.menuItems는 아이콘/하위 메뉴를, searchBox.searchTargetId는 검색할 navbar ID를 받습니다. 독립 서랍은 drawer, 슬라이드마다 자유롭게 자식을 넣는 요소는 carousel입니다. carousel의 직계 자식 하나가 슬라이드 하나입니다. 남은 공간 채우기는 style.grow=true이며 CSS flex 문자열을 보내지 마세요. children=false 요소 안에 자식을 추가하지 마세요. 지원하지 않는 속성이나 customCss는 전송하지 마세요.',
  };
}

// Advertise the operation structure once without repeating the entire component property union.
// The write tool still validates every argument with the original patchSchema before execution.
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const values = z.record(z.string(), z.unknown());
export const compactPatchInput = z
  .array(
    z.discriminatedUnion('op', [
      z
        .object({
          op: z.literal('add'),
          parentId: id,
          id,
          type: componentTypeInput,
          props: values.optional(),
          style: values.optional(),
        })
        .strict(),
      z
        .object({
          op: z.literal('update'),
          nodeId: id,
          props: values.optional(),
          style: values.optional(),
          breakpoint: z.enum(['desktop', 'tablet', 'mobile']).optional(),
        })
        .strict(),
      z
        .object({
          op: z.literal('move'),
          nodeId: id,
          parentId: id,
          index: z.number().int().min(0).max(500).optional(),
        })
        .strict(),
      z.object({ op: z.literal('remove'), nodeId: id }).strict(),
      z
        .object({ op: z.literal('template'), parentId: id, templateId: z.string().min(1).max(60) })
        .strict(),
    ]),
  )
  .min(1)
  .max(100)
  .describe(
    '추가 형식: {op:"add",parentId:"page-root",id:"header",type:"container"}. create/componentType은 사용하지 않습니다. 부모부터 add하고 기존 루트 page-root는 update합니다. props/style은 get_design_context 명세를 따릅니다. padding은 정수이며 flex는 없습니다.',
  );
