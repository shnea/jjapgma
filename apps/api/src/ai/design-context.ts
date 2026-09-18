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
  richText: [
    'documentJson',
    'richTextFiles',
    'richTextMode',
    'richTextFont',
    'richTextImageModal',
    'disabled',
  ],
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
    'customCss',
    'collapseVisibility',
    ...Object.keys(node.props),
    ...propertySchema
      .filter((p) => (p.types as readonly string[]).includes(type))
      .map((p) => p.key),
    ...(extras[type] ?? []),
  ]);
  const shape = Object.fromEntries(
    Object.entries(propsSchema.shape).filter(([key]) => keys.has(key)),
  );
  return { node, props: json(z.object(shape).partial().strict()) };
}

export const operationGuide = {
  rules: [
    'richText는 @shnea/blocknote 서식 본문입니다. 문서 작성은 document-editor, 읽기 전용 공지는 notice-document 템플릿을 활용할 수 있습니다. documentJson은 BlockNote 블록 배열의 JSON 문자열이며 빈 본문은 빈 문자열, 최대 UTF-8 128 KiB입니다. richTextMode=editor/viewer, richTextFont=sans/serif/mono, richTextImageModal은 뷰어 이미지 확대 설정입니다. HTML·Markdown 원문·data URL을 저장하지 마세요.',
    'richText 첨부는 현재 프로젝트에서 권한이 확인된 richTextFiles(fileId/name/mimeType)와 jjapgma-file:파일ID URL을 함께 보존하세요. 파일 ID나 메타데이터를 만들지 말고 첨부가 없으면 텍스트 안내로 남기세요. 작성용 업로드는 tmp, 실제 소비 서비스의 새 업로드는 category 생략으로 default를 사용하지만 업로드 연동은 앱 책임입니다. category는 UI Spec 속성이 아니며 기존 tmp 파일은 자동 승격되지 않습니다. 입력 체험·템플릿·내보내기를 실제 업로드·업무 저장 API 연결로 설명하지 마세요.',
    'src/placeholder/searchWidth/mobileSearch/searchTargetId는 props에 넣으세요. 기본 style의 width/height/minWidth/maxWidth/minHeight/maxHeight는 "120px"/"100%"/"auto" 같은 문자열입니다. 숫자 정수 0~9999는 px로 정리합니다.',
    '일반 CSS는 style.css에 camelCase/kebab-case 속성과 문자열/숫자로 전달하세요. 한쪽 테두리·calc()·flex·필터·변형·그라데이션 등도 지원합니다. props.customCss 선언 문자열도 허용합니다. 같은 CSS를 중복 지정하지 마세요.',
    '반응형은 별도의 {op:"update",nodeId:"대상ID",breakpoint:"mobile",style:{css:{borderBottomColor:"#000000"}}} 작업입니다. 모바일 CSS는 기본 CSS에 속성별로 병합합니다. operations는 반응형 작업 포함 최대 100개입니다.',
    '캡처는 UI 배치와 버튼·메뉴 라벨을 우선하세요. 사진·제목·본문·작성자·날짜·수치는 기본 이미지나 비슷한 길이의 예시로 대체하고 영역은 유지하세요. 작은 글자·그림은 복원하지 마세요. 원문·자산 사용을 명시한 요청은 따르고 대체 사실을 알리세요.',
    'navbar.menuItems는 최대 3단계입니다. 메인 화면은 루트 minHeight=100dvh, 모바일 메뉴 버튼은 헤더의 일반 button.overlayAction으로 sidePanel에 연결하고 mobileTrigger=external을 사용합니다. carouselVariant는 controls/arrows/regions이며 크기는 carouselSizing과 carouselRatio/carouselHeight로 지정합니다. chart는 chartData=[{label,value}], chartVariant=bar/line/donut/area/horizontalBar을 사용합니다. wizard는 직계 자식 컨테이너 하나가 한 단계이며 자식 name이 단계 이름입니다. input(controlType=search)의 searchTargetId로 table을 검색할 수 있습니다.',
    '칸별 요소를 넣을 그리드는 grid 아래 container를 하나씩 추가하고 각 container에 borderWidth:1,borderColor:theme:border,minHeight:120px를 지정합니다. gridColumns/gridRows로 기본 배치를 지정하고 모바일은 gridColumns:1로 바꿀 수 있습니다. 셀 안에 실제 요소를 추가하세요.',
    'operations는 HTML/CSS가 아닌 아래 작업 형식입니다. op=create와 componentType은 없습니다. 추가는 op=add, type, id, parentId가 필수입니다.',
    '새 페이지의 page-root는 이미 존재합니다. 루트를 만들지 말고 update하세요. 부모를 먼저 add하고 자식의 parentId로 연결하세요. 기본 노드의 예시 UUID는 실제 페이지 요소 ID가 아닙니다.',
    '앱 컨트롤의 style.padding은 0~160 정수이며 네 방향은 paddingTop/Right/Bottom/Left입니다. CSS 단위·calc()·다른 CSS 값은 style.css에 담으세요. style의 추가 CSS 속성은 MCP가 style.css로 정리합니다. 내용·동작 속성은 props에 넣으세요.',
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
    css: {
      op: 'update',
      nodeId: 'content',
      style: { css: { borderBottom: '1px solid #dddddd', width: 'calc(100% - 24px)' } },
    },
    search: {
      op: 'add',
      parentId: 'content',
      id: 'search',
      type: 'searchBox',
      props: { placeholder: '검색', searchWidth: 240, mobileSearch: 'icon' },
      style: { minWidth: '120px', height: '40px' },
    },
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
      '새 페이지는 현재 페이지 조회를 생략하세요. 템플릿은 선택 재료이며 요청한 영역을 모두 구성해야 합니다. 템플릿 수정은 get_template의 실제 ID로 operations를 만들고 templateId와 함께 전달하세요. 전체 요소와 모바일 update를 한 번의 create_page로 제안하세요. 기존 화면 수정만 pageId로 최신 명세/revision을 조회하며 이미 받은 명세는 반복 조회하지 마세요.',
    components: Object.fromEntries(
      [...new Set(types)].map((type) => [type, componentSchema(type)]),
    ),
    style: json(styleSchema),
    templates: templateCatalog(),
    availableComponents: componentCatalog(),
    notes:
      '헤더는 container, 접기/모바일 서랍은 sidePanel 안에 navbar를 사용합니다. children=false 요소에는 자식을 추가하지 마세요.',
  };
}

// Advertise the operation structure once without repeating the entire component property union.
// The write tool still validates every argument with the original patchSchema before execution.
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const values = z.record(z.string(), z.unknown());
const propValues = values.describe(
  '내용·동작 속성: text, src, placeholder, searchWidth, mobileSearch, searchTargetId 등. get_design_context의 components[type].props를 따르세요. style 안에 넣지 않습니다.',
);
const styleValues = values.describe(
  '배치·외형만 지정. 앱 크기는 "120px", padding/gap은 정수. 앱 명세 밖의 CSS는 css:{borderBottom:"1px solid #dddddd",width:"calc(100% - 24px)"}처럼 일반 CSS 속성(문자열/숫자)을 전달. src/placeholder/searchWidth/mobileSearch/searchTargetId는 props로, 반응형 CSS는 별도 update.breakpoint의 style.css로.',
);
export const compactPatchInput = z
  .array(
    z.discriminatedUnion('op', [
      z
        .object({
          op: z.literal('add'),
          parentId: id,
          id,
          type: componentTypeInput,
          props: propValues.optional(),
          style: styleValues.optional(),
        })
        .strict(),
      z
        .object({
          op: z.literal('update'),
          nodeId: id,
          props: propValues.optional(),
          style: styleValues.optional(),
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
    '추가 형식: {op:"add",parentId:"page-root",id:"header",type:"container"}. 부모부터 add하고 기존 루트 page-root는 update합니다. props는 내용, style은 배치입니다. 앱 컨트롤 이외의 일반 CSS는 style.css 객체로 전달하세요.',
  );
