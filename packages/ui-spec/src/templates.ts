import { createNode, createSpec } from './tree.js';
import { validateSpec, type UiSpec } from './schema.js';
import { themePresets } from './theme.js';
import { element, group, heading, text, button, input } from './template-parts.js';
import {
  signup,
  passwordReset,
  detail,
  settings,
  pricing,
  checkout,
  contentList,
  contentDetail,
  notFound,
  forbidden,
  empty,
  success,
  failure,
  onboarding,
  analytics,
} from './template-builders.js';

export const templateCategories = [
  '시작·계정',
  '업무·관리',
  '콘텐츠',
  '요금·결제',
  '상태·결과',
] as const;

const templateDefinitions = [
  {
    id: 'main',
    build: main,
    themeIndex: 1,
    name: '워크스페이스 메인',
    category: '업무·관리',
    description: '로고·메뉴 검색·접이식 사이드바와 모바일 서랍을 갖춘 메인 화면',
  },
  {
    id: 'chat',
    build: chat,
    themeIndex: 0,
    name: 'AI 대화 화면',
    category: '업무·관리',
    description: '좌우 메시지·Markdown·시간·응답 대기와 하단 입력창을 갖춘 채팅 화면',
  },
  {
    id: 'landing',
    build: landing,
    themeIndex: 0,
    name: '랜딩 페이지',
    category: '시작·계정',
    description: '서비스 소개, 주요 기능과 시작 버튼을 담은 첫 화면',
  },
  {
    id: 'dashboard',
    build: dashboard,
    themeIndex: 1,
    name: '대시보드',
    category: '업무·관리',
    description: 'KPI 카드·추이 차트·최근 활동을 한눈에 보는 화면',
  },
  {
    id: 'management',
    build: management,
    themeIndex: 1,
    name: '목록 관리',
    category: '업무·관리',
    description: '검색·필터·행 선택·정렬·페이징을 갖춘 CRUD 목록',
  },
  {
    id: 'analytics',
    build: analytics,
    themeIndex: 1,
    name: '데이터 분석',
    category: '업무·관리',
    description: 'KPI·영역 추이·가로 막대 비교·유입 비중을 담은 차트/그래프 대시보드',
  },
  {
    id: 'form',
    build: form,
    themeIndex: 0,
    name: '입력 폼',
    category: '업무·관리',
    description: '이름·이메일·분류·상세 내용의 입력 폼. 등록·수정·문의에 활용',
  },
  {
    id: 'login',
    build: login,
    themeIndex: 0,
    name: '로그인 화면',
    category: '시작·계정',
    description: '이메일·비밀번호 입력과 로그인 버튼의 화면 구성',
  },
  {
    id: 'signup',
    build: signup,
    themeIndex: 0,
    name: '회원가입',
    category: '시작·계정',
    description: '이름·이메일·비밀번호 확인과 약관 동의',
  },
  {
    id: 'password-reset',
    build: passwordReset,
    themeIndex: 0,
    name: '비밀번호 찾기',
    category: '시작·계정',
    description: '이메일로 비밀번호 재설정을 요청하는 화면',
  },
  {
    id: 'onboarding',
    build: onboarding,
    themeIndex: 1,
    name: '단계별 시작 안내',
    category: '시작·계정',
    description: '이전·다음 이동이 가능한 초기 설정 / 신청 Wizard',
  },
  {
    id: 'detail',
    build: detail,
    themeIndex: 1,
    name: '상세 조회',
    category: '업무·관리',
    description: '기본 정보·진행 현황·상세 설명·최근 변경',
  },
  {
    id: 'settings',
    build: settings,
    themeIndex: 1,
    name: '설정 화면',
    category: '업무·관리',
    description: '좌측 메뉴와 프로필·알림·작업 환경 설정 폼',
  },
  {
    id: 'content-list',
    build: contentList,
    themeIndex: 0,
    name: '콘텐츠 목록',
    category: '콘텐츠',
    description: '공지·블로그·게시글의 검색·분류·목록·페이지 이동',
  },
  {
    id: 'content-detail',
    build: contentDetail,
    themeIndex: 0,
    name: '콘텐츠 상세',
    category: '콘텐츠',
    description: '제목·작성 정보·대표 이미지·본문·목록 이동',
  },
  {
    id: 'pricing',
    build: pricing,
    themeIndex: 0,
    name: '요금제 비교',
    category: '요금·결제',
    description: '3단계 상품 플랜·기능 비교·선택 버튼·FAQ',
  },
  {
    id: 'checkout',
    build: checkout,
    themeIndex: 0,
    name: '주문·결제',
    category: '요금·결제',
    description: '주문자 정보·결제수단·약관·금액 요약의 화면 구성',
  },
  {
    id: 'result-success',
    build: success,
    themeIndex: 0,
    name: '완료 안내',
    category: '상태·결과',
    description: '가입 완료·결제 완료·신청 완료를 공통으로 표현',
  },
  {
    id: 'result-failure',
    build: failure,
    themeIndex: 0,
    name: '실패 안내',
    category: '상태·결과',
    description: '처리 실패 이유와 재시도 안내',
  },
  {
    id: 'empty',
    build: empty,
    themeIndex: 0,
    name: '데이터 없음',
    category: '상태·결과',
    description: '등록 전 빈 상태와 첫 항목 추가 안내',
  },
  {
    id: 'error-404',
    build: notFound,
    themeIndex: 0,
    name: '404 · 페이지 없음',
    category: '상태·결과',
    description: '잘못된 주소·삭제된 페이지와 복귀 안내',
  },
  {
    id: 'error-403',
    build: forbidden,
    themeIndex: 0,
    name: '403 · 접근 제한',
    category: '상태·결과',
    description: '접근 권한이 없는 화면의 안내',
  },
] as const;
const templateOrder = [
  'landing',
  'login',
  'signup',
  'password-reset',
  'onboarding',
  'main',
  'dashboard',
  'analytics',
  'management',
  'detail',
  'form',
  'settings',
  'chat',
  'content-list',
  'content-detail',
  'pricing',
  'checkout',
  'result-success',
  'result-failure',
  'empty',
  'error-404',
  'error-403',
];
export const pageTemplates = templateDefinitions
  .map(({ id, name, category, description }) => ({
    id,
    name,
    category,
    description,
  }))
  .sort((a, b) => templateOrder.indexOf(a.id) - templateOrder.indexOf(b.id));

export function createTemplate(id: string): UiSpec {
  const definition = templateDefinitions.find((item) => item.id === id);
  if (!definition) throw new Error('Unknown template');
  const spec = createSpec();
  spec.theme = structuredClone(themePresets[definition.themeIndex].theme);
  spec.root.style = { direction: 'column', padding: 40, gap: 24 };
  spec.root.responsive.mobile = { padding: 20, gap: 16 };
  definition.build(spec);
  return validateSpec(spec);
}
const table = () =>
  element(
    'table',
    '',
    {},
    {
      items:
        '이름|상태|담당자\n홈페이지 개편|진행 중|김민수\n서비스 소개|검토 중|이지은\n고객 문의|완료|박서준',
      paginationMode: 'pagination',
      pageSize: 3,
    },
  );
function main(spec: UiSpec) {
  spec.theme = {
    ...spec.theme!,
    primary: '#4f46e5',
    text: '#334155',
    background: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    radius: 8,
  };
  const logo = element('text', 'W', {
    background: 'theme:primary',
    color: 'theme:onPrimary',
    fontSize: 20,
    fontWeight: '700',
    padding: 4,
    radius: 9,
    width: '34px',
    height: '34px',
    textAlign: 'center',
    shrink: false,
  });
  const brand = group(
    'container',
    [logo, element('heading', 'Workspace', { fontSize: 17 }, { titleLevel: 'h1' })],
    { direction: 'row', align: 'center', gap: 12, padding: 0, shrink: false },
  );
  brand.responsive.mobile = { direction: 'row', gap: 8 };
  const menu = element(
    'navbar',
    '메인 메뉴',
    {},
    {
      menuItems: [
        { id: 'menu-label', label: 'MENU', kind: 'group' },
        { id: 'home', label: '홈', icon: 'home' },
        { id: 'projects', label: '프로젝트', icon: 'folder' },
        { id: 'board', label: '게시판', icon: 'message-square' },
        { id: 'settings', label: '설정', icon: 'settings' },
      ],
      activeMenuId: 'home',
    },
  );
  const search = element(
    'searchBox',
    '메뉴 검색',
    { grow: true, minWidth: '0px' },
    { searchTargetId: menu.id, searchWidth: 240, searchAlign: 'right', mobileSearch: 'icon' },
  );
  const header = group(
    'container',
    [brand, search, element('avatar', '사용자', { width: '36px', shrink: false })],
    {
      direction: 'row',
      align: 'center',
      gap: 20,
      padding: 20,
      height: '72px',
      shrink: false,
      background: 'theme:surface',
      borderWidth: 1,
      borderColor: 'theme:border',
      sticky: true,
      controlAlignment: 'layout',
    },
  );
  header.name = '상단 헤더';
  header.responsive.mobile = { direction: 'row', align: 'center', padding: 12, gap: 8 };
  const panel = createNode('sidePanel');
  panel.name = '메뉴 사이드바';
  panel.props.mobileTrigger = 'external';
  panel.props.drawerScope = 'page';
  const menuToggle = element(
    'button',
    '메뉴 열기',
    {
      width: '36px',
      height: '36px',
      padding: 0,
      shrink: false,
      hidden: true,
      background: 'transparent',
      color: 'theme:text',
    },
    { variant: 'icon', iconName: 'menu', overlayAction: { type: 'toggle', targetId: panel.id } },
  );
  menuToggle.responsive.mobile = { hidden: false };
  brand.children.unshift(menuToggle);
  const footer = element(
    'text',
    '나만의 작업 공간',
    { fontSize: 12, color: 'theme:muted' },
    { collapseVisibility: 'expanded' },
  );
  panel.children = [menu, element('divider', '', {}, { collapseVisibility: 'expanded' }), footer];
  panel.style = { ...panel.style, borderWidth: 1, borderColor: 'theme:border' };
  const content = group(
    'container',
    [element('breadcrumb', '현재 위치', {}, { items: 'Workspace\n홈' })],
    { grow: true, minWidth: '0px', padding: 28, overflow: 'auto', background: 'theme:background' },
  );
  content.name = '메인 콘텐츠';
  content.responsive.mobile = { padding: 20 };
  const body = group('container', [panel, content], {
    direction: 'row',
    grow: true,
    gap: 0,
    padding: 0,
    minHeight: '0px',
    controlAlignment: 'layout',
  });
  body.name = '메뉴와 본문';
  body.responsive.mobile = { direction: 'row' };
  const edge = {
    padding: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    gap: 0,
  };
  spec.root.style = { direction: 'column', ...edge, minHeight: '100dvh', width: '100%' };
  spec.root.responsive.tablet = { ...edge };
  spec.root.responsive.mobile = { ...edge };
  spec.root.children = [header, body];
}
function chat(spec: UiSpec) {
  const conversation = createNode('chat');
  conversation.props.text = '디자인 어시스턴트';
  conversation.style = { width: '100%', height: '640px' };
  conversation.responsive.mobile = { height: '520px' };
  spec.root.children = [
    heading('함께 만드는 화면', 28),
    text('아이디어를 대화로 정리해 보세요.'),
    conversation,
  ];
}
function landing(spec: UiSpec) {
  spec.root.children = [
    group(
      'container',
      [heading('STUDIO', 22), element('link', '서비스 알아보기', {}, { href: '#features' })],
      { direction: 'row', justify: 'space-between', padding: 0 },
    ),
    group(
      'card',
      [
        element('badge', '작은 아이디어의 시작'),
        heading('아이디어를 멋진 경험으로', 44),
        text('우리의 서비스가 일상의 문제를 어떻게 해결하는지 소개해 보세요.'),
        button('지금 시작하기'),
      ],
      { padding: 40, gap: 24 },
    ),
    group(
      'grid',
      ['간편한 시작', '함께하는 작업', '일관된 경험'].map((title) =>
        group('card', [
          heading(title, 22),
          text('고객에게 전달할 핵심 가치를 짧고 명확하게 설명해 주세요.'),
        ]),
      ),
      { gridColumns: 3, padding: 0 },
    ),
    text('© 2026 STUDIO. 함께 더 나은 경험을 만듭니다.'),
  ];
}
function dashboard(spec: UiSpec) {
  spec.root.children = [
    heading('워크스페이스 대시보드'),
    text('오늘의 업무 현황을 확인하세요.'),
    group(
      'grid',
      [
        ['전체 프로젝트', '24'],
        ['진행 중', '8'],
        ['이번 주 완료', '12'],
      ].map(([label, value]) => group('card', [text(label), heading(value, 38)])),
      { gridColumns: 3, padding: 0 },
    ),
    group('card', [heading('최근 활동', 22), table()]),
    group('card', [element('chart', '최근 6개월 프로젝트 완료 추이')]),
  ];
}
function management(spec: UiSpec) {
  const records = table();
  records.props.table = {
    columns: [
      { id: 'name', title: '이름', type: 'text', sortable: true, wrap: true },
      { id: 'status', title: '상태', type: 'badge', sortable: true },
      { id: 'owner', title: '담당자', type: 'text', hidden: { mobile: true } },
    ],
    rows: [
      '홈페이지 개편',
      '서비스 소개',
      '고객 문의',
      '모바일 화면',
      '요금제 안내',
      '초기 설정',
    ].map((name, index) => ({
      id: `project-${index}`,
      cells: {
        name,
        status: ['진행 중', '검토 중', '완료'][index % 3],
        owner: ['김민수', '이지은', '박서준'][index % 3],
      },
    })),
    filterable: true,
    striped: true,
    hover: true,
    firstColumn: 'number-select',
    mobileLayout: 'cards',
  };
  const searchInput = input('항목 검색', 'search');
  searchInput.props.searchTargetId = records.id;
  spec.root.children = [
    heading('프로젝트 관리'),
    text('등록된 항목을 확인하고 새 항목을 추가하세요.'),
    group('container', [searchInput, button('새 항목 추가')], {
      direction: 'row',
      align: 'flex-end',
      padding: 0,
    }),
    group('card', [records]),
  ];
}
function form(spec: UiSpec) {
  spec.root.style.width = '100%';
  spec.root.style.align = 'stretch';
  spec.root.children = [
    heading('문의하기'),
    text('필요한 내용을 남겨 주세요.'),
    group(
      'card',
      [
        group(
          'grid',
          [
            input('이름'),
            input('이메일', 'email'),
            element('select', '문의 유형', {}, { items: '일반 문의\n도입 상담\n기술 지원' }),
            input('제목'),
          ],
          { gridColumns: 2, padding: 0, gap: 24, width: '100%' },
        ),
        element('textarea', '상세 내용'),
        element('checkbox', '개인정보 처리에 동의합니다'),
        button('문의 제출'),
      ],
      { width: '100%', gap: 20 },
    ),
  ];
}
function login(spec: UiSpec) {
  spec.root.style.align = 'center';
  spec.root.children = [
    group(
      'card',
      [
        heading('다시 만나 반가워요', 28),
        text('계정으로 로그인해 작업을 이어가세요.'),
        input('이메일', 'email'),
        input('비밀번호', 'password'),
        button('로그인'),
        element('link', '비밀번호를 잊으셨나요?', {}, { href: '#' }),
      ],
      { width: '440px', padding: 32, gap: 20 },
    ),
  ];
}
