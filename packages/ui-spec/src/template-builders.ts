import type { UiSpec, UiNode } from './schema.js';
import {
  element as e,
  group as g,
  heading as h,
  text as t,
  button as b,
  input as i,
  muted,
  row,
  section,
} from './template-parts.js';

function title(spec: UiSpec, name: string, description: string) {
  spec.root.children = [e('badge', 'WORKSPACE'), h(name, 36), muted(description)];
}
function auth(spec: UiSpec, name: string, description: string, fields: UiNode[]) {
  spec.root.style = {
    direction: 'column',
    align: 'center',
    justify: 'center',
    minHeight: '100dvh',
    padding: 40,
    gap: 24,
  };
  spec.root.children = [
    e('text', 'STUDIO', { fontSize: 20, fontWeight: '700', color: 'theme:primary' }),
    g('card', [h(name, 28), muted(description), ...fields], {
      width: '460px',
      padding: 32,
      gap: 20,
      borderWidth: 1,
      borderColor: 'theme:border',
    }),
  ];
}
export function signup(spec: UiSpec) {
  auth(spec, '새로운 시작을 함께해요', '계정을 만들고 팀과 함께 작업을 시작하세요.', [
    i('이름'),
    i('이메일', 'email'),
    i('비밀번호', 'password'),
    i('비밀번호 확인', 'password'),
    e('checkbox', '이용약관 및 개인정보 처리에 동의합니다'),
    b('계정 만들기'),
    e('link', '이미 계정이 있으신가요? 로그인', {}, { href: '#' }),
  ]);
}
export function passwordReset(spec: UiSpec) {
  auth(spec, '비밀번호를 잊으셨나요?', '가입한 이메일로 비밀번호 재설정 안내를 보내드립니다.', [
    i('이메일', 'email'),
    b('재설정 안내 받기'),
    e('link', '로그인으로 돌아가기', {}, { href: '#' }),
  ]);
}
export function detail(spec: UiSpec) {
  title(spec, '홈페이지 개편 프로젝트', '프로젝트의 기본 정보와 진행 상황을 확인하세요.');
  spec.root.children.push(
    row([
      e('breadcrumb', '현재 위치', {}, { items: '프로젝트\n상세 조회' }),
      e('button', '정보 수정', {}, { variant: 'outline', iconName: 'pencil' }),
    ]),
    g(
      'grid',
      [
        section('기본 정보', [
          e(
            'descriptionList',
            '프로젝트 정보',
            {},
            {
              items:
                '프로젝트 번호|PRJ-2026-001\n담당자|김민수\n시작일|2026.09.01\n완료 예정일|2026.10.15',
            },
          ),
        ]),
        section('진행 현황', [
          e('badge', '진행 중'),
          h('65%', 40),
          e('progress', '프로젝트 진행률', {}, { value: 65 }),
          muted('총 20개 작업 중 13개를 완료했습니다.'),
        ]),
      ],
      { gridColumns: 2, padding: 0, gap: 24 },
    ),
    section('상세 설명', [
      t(
        '고객이 필요한 정보를 더 빠르게 찾을 수 있도록 서비스의 탐색 구조와 주요 화면을 개선합니다.',
      ),
      t('주요 범위: 메인 화면 개편, 모바일 사용성 개선, 공통 디자인 정리'),
    ]),
    section('최근 변경', [
      e(
        'list',
        '변경 내역',
        {},
        {
          items:
            '오늘 · 디자인 시안 검토 완료\n어제 · 주요 화면 구성 업데이트\n9월 1일 · 프로젝트 시작',
        },
      ),
    ]),
  );
}
export function settings(spec: UiSpec) {
  title(spec, '워크스페이스 설정', '프로필, 알림과 작업 환경을 관리하세요.');
  const navigation = e(
    'navbar',
    '설정 메뉴',
    { direction: 'column' },
    {
      menuItems: [
        { id: 'profile', label: '프로필', icon: 'user' },
        { id: 'notifications', label: '알림', icon: 'bell' },
        { id: 'preferences', label: '작업 환경', icon: 'settings' },
      ],
      activeMenuId: 'profile',
    },
  );
  const menu = g('card', [h('설정', 18), navigation], {
    width: '220px',
    shrink: false,
    padding: 20,
    alignSelf: 'flex-start',
  });
  menu.responsive.mobile = { width: '100%', alignSelf: 'stretch' };
  const forms = g(
    'container',
    [
      section('프로필', [i('표시 이름'), i('이메일', 'email'), e('textarea', '소개')]),
      section('알림', [e('switch', '이메일 알림 받기'), e('switch', '프로젝트 활동 알림 받기')]),
      section('작업 환경', [
        e('select', '언어', {}, { items: '한국어\nEnglish' }),
        e('select', '시간대', {}, { items: 'Asia/Seoul\nUTC' }),
      ]),
      row([muted('변경한 설정을 확인하고 저장하세요.'), b('변경 사항 저장')]),
    ],
    { padding: 0, gap: 24, grow: true, minWidth: '0px' },
  );
  forms.responsive.mobile = { grow: false, shrink: false };
  spec.root.children.push(
    g('container', [menu, forms], {
      direction: 'row',
      padding: 0,
      gap: 24,
      align: 'flex-start',
      controlAlignment: 'layout',
    }),
  );
}
export function pricing(spec: UiSpec) {
  title(spec, '팀의 성장에 맞는 플랜', '필요한 기능부터 시작하고, 팀이 커지면 확장하세요.');
  const plans = [
    ['Starter', '₩0', '개인 프로젝트를 시작하는 분', '프로젝트 3개\n기본 템플릿\n개인 작업 공간'],
    ['Team', '₩19,000', '함께 만드는 작은 팀', '프로젝트 무제한\n팀 공유와 권한\n버전 기록과 복원'],
    [
      'Business',
      '별도 문의',
      '체계적인 협업이 필요한 조직',
      'Team의 모든 기능\n조직 관리\n우선 기술 지원',
    ],
  ];
  spec.root.children.push(
    g(
      'grid',
      plans.map(([name, price, caption, features], index) =>
        g(
          'card',
          [
            e('badge', index === 1 ? '가장 많이 선택하는 플랜' : name),
            h(name, 24),
            muted(caption),
            h(price, 38),
            muted(index === 1 ? '사용자당 / 월' : index === 0 ? '무료로 시작' : '조직에 맞춘 요금'),
            e('divider'),
            e('list', '제공 기능', {}, { items: features }),
            e(
              'button',
              index === 2 ? '도입 문의' : '이 플랜 선택',
              { width: '100%', marginTop: 16 },
              { variant: index === 1 ? 'default' : 'outline' },
            ),
          ],
          {
            padding: 28,
            gap: 20,
            borderWidth: index === 1 ? 2 : 1,
            borderColor: index === 1 ? 'theme:primary' : 'theme:border',
          },
        ),
      ),
      { gridColumns: 3, gap: 24, padding: 0 },
    ),
    section('자주 묻는 질문', [
      e(
        'accordion',
        '플랜은 필요에 따라 변경할 수 있습니다. 이용 중인 서비스의 실제 요금 정책을 확인해 주세요.',
        {},
        {
          items: '플랜을 변경할 수 있나요?\n팀원을 추가할 수 있나요?\n어떤 결제수단을 지원하나요?',
        },
      ),
    ]),
  );
}
export function checkout(spec: UiSpec) {
  title(spec, '주문 확인 및 결제', '선택한 상품과 결제 정보를 확인하세요.');
  const fields = g(
    'container',
    [
      section('주문 정보', [i('주문자 이름'), i('이메일', 'email'), i('연락처', 'tel')]),
      section('결제수단', [
        e(
          'radio',
          '결제수단 선택',
          {},
          { items: '신용 / 체크카드\n간편결제\n계좌이체', optionDirection: 'column' },
        ),
        muted('결제에 필요한 정보는 선택한 결제사의 화면에서 입력합니다.'),
      ]),
      e('checkbox', '주문 내용 및 결제 조건을 확인했습니다'),
    ],
    { padding: 0, gap: 24, grow: true, minWidth: '0px' },
  );
  fields.responsive.mobile = { grow: false, shrink: false };
  const summary = section('금액 요약', [
    e('badge', 'TEAM PLAN'),
    h('Team · 월간 이용권', 22),
    muted('1명 · 1개월'),
    e('divider'),
    e('descriptionList', '주문 금액', {}, { items: '상품 금액|₩19,000\n할인|₩0\n추가 비용|₩0' }),
    e('divider'),
    row([t('결제 예정 금액'), h('₩19,000', 30)]),
    e('button', '결제하기', { width: '100%' }),
  ]);
  summary.style.width = '360px';
  summary.style.shrink = false;
  summary.style.alignSelf = 'flex-start';
  summary.responsive.mobile = { width: '100%', alignSelf: 'stretch' };
  summary.responsive.tablet = { width: '300px' };
  spec.root.children.push(
    g('container', [fields, summary], {
      direction: 'row',
      align: 'flex-start',
      gap: 24,
      padding: 0,
      controlAlignment: 'layout',
    }),
  );
}
export function contentList(spec: UiSpec) {
  title(spec, '소식과 이야기', '서비스의 새로운 소식과 유용한 활용 방법을 만나보세요.');
  spec.root.children.push(
    e(
      'table',
      '게시글 목록',
      {},
      {
        pageSize: 5,
        paginationMode: 'pagination',
        table: {
          columns: [
            { id: 'category', title: '분류', type: 'badge', width: 100 },
            { id: 'title', title: '제목', type: 'text', sortable: true, wrap: true },
            { id: 'date', title: '등록일', type: 'date', hidden: { mobile: true }, sortable: true },
          ],
          rows: [
            '새로운 워크스페이스를 소개합니다',
            '더 편리해진 모바일 화면',
            '팀과 함께 시작하는 첫 프로젝트',
            '9월 업데이트 안내',
            '자주 묻는 질문을 모았습니다',
            '새로운 템플릿으로 빠르게 시작하기',
          ].map((title, index) => ({
            id: `post-${index}`,
            cells: {
              category: index % 2 ? '가이드' : '공지',
              title,
              date: `2026-09-${16 - index}`,
            },
          })),
          searchable: true,
          filterable: true,
          striped: true,
          hover: true,
          mobileLayout: 'cards',
        },
      },
    ),
  );
}
export function contentDetail(spec: UiSpec) {
  spec.root.style.align = 'center';
  spec.root.children = [
    g(
      'container',
      [
        e('breadcrumb', '현재 위치', {}, { items: '소식\n공지사항' }),
        e('badge', '서비스 소식'),
        h('함께 만드는 더 나은 작업 공간', 40),
        muted('2026.09.16 · STUDIO 팀 · 읽는 시간 3분'),
        e('divider'),
        e('image', '새롭게 정리된 작업 공간', {
          width: '100%',
          height: '280px',
          radius: 16,
          objectFit: 'cover',
        }),
        h('아이디어를 화면으로 옮기는 방법', 24),
        t(
          '처음부터 모든 것을 만들 필요는 없습니다. 잘 정리된 템플릿을 출발점으로 삼아 필요한 요소를 추가하고, 팀의 방식에 맞게 화면을 조정해 보세요.',
        ),
        h('이번 업데이트에서 달라진 점', 24),
        e(
          'list',
          '주요 업데이트',
          {},
          {
            items:
              '용도별로 정리된 공식 템플릿\n다양한 화면 크기에 맞는 반응형 구성\n개별 요소를 자유롭게 편집하는 작업 방식',
          },
        ),
        t('작은 개선을 함께 쌓아 더 나은 경험을 만들어 갑니다. 여러분의 의견을 기다립니다.'),
        e('divider'),
        row([e('link', '목록으로', {}, { href: '#' }), e('badge', '업데이트')]),
      ],
      { width: '100%', maxWidth: '800px', padding: 0, gap: 24 },
    ),
  ];
}
function statePage(
  spec: UiSpec,
  code: string,
  title: string,
  description: string,
  state: 'empty' | 'success' | 'error',
  action: string,
) {
  spec.root.style = {
    direction: 'column',
    align: 'center',
    justify: 'center',
    minHeight: '100dvh',
    padding: 40,
    gap: 24,
  };
  spec.root.children = [
    g(
      'card',
      [
        e('text', code, {
          color: 'theme:primary',
          fontSize: code.length > 3 ? 32 : 56,
          fontWeight: '700',
          textAlign: 'center',
        }),
        e('emptyState', title, {}, { stateType: state }),
        muted(description),
        e('button', action, { alignSelf: 'center' }, { variant: 'default' }),
      ],
      {
        width: '600px',
        padding: 40,
        gap: 24,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: 'theme:border',
      },
    ),
  ];
}
export const notFound = (spec: UiSpec) =>
  statePage(
    spec,
    '404',
    '페이지를 찾을 수 없습니다',
    '주소가 변경되었거나 더 이상 제공되지 않는 페이지입니다.',
    'error',
    '홈으로 돌아가기',
  );
export const forbidden = (spec: UiSpec) =>
  statePage(
    spec,
    '403',
    '접근 권한이 없습니다',
    '이 페이지에 접근할 수 있는 계정인지 확인하거나 관리자에게 문의해 주세요.',
    'error',
    '이전 화면으로',
  );
export const empty = (spec: UiSpec) =>
  statePage(
    spec,
    '시작해 보세요',
    '아직 등록된 데이터가 없습니다',
    '첫 항목을 추가하면 이곳에서 목록과 진행 상황을 확인할 수 있습니다.',
    'empty',
    '첫 항목 추가',
  );
export const success = (spec: UiSpec) =>
  statePage(
    spec,
    '완료',
    '요청이 완료되었습니다',
    '정상적으로 처리되었습니다. 자세한 내용은 내역에서 확인할 수 있습니다.',
    'success',
    '확인',
  );
export const failure = (spec: UiSpec) =>
  statePage(
    spec,
    '다시 확인',
    '요청을 완료하지 못했습니다',
    '입력 정보와 연결 상태를 확인한 뒤 다시 시도해 주세요.',
    'error',
    '다시 시도',
  );
export function onboarding(spec: UiSpec) {
  title(spec, '우리 팀의 작업 공간 만들기', '세 단계로 필요한 정보를 입력하고 시작하세요.');
  const wizard = e('wizard', '초기 설정', {
    width: '100%',
    maxWidth: '800px',
    alignSelf: 'center',
  });
  wizard.children = [
    section('기본 정보', [
      i('워크스페이스 이름'),
      i('관리자 이메일', 'email'),
      e('select', '팀 규모', {}, { items: '1명\n2~10명\n11~50명\n51명 이상' }),
    ]),
    section('작업 환경', [
      e('radio', '주요 사용 목적', {}, { items: '프로젝트 관리\n디자인 협업\n콘텐츠 운영' }),
      e('switch', '팀 활동 알림 받기'),
    ]),
    section('시작 준비', [
      e('alert', '입력한 정보를 확인한 뒤 설정을 마무리하세요.', {}, { stateType: 'info' }),
      e('checkbox', '서비스 이용 조건을 확인했습니다'),
      muted('이전 버튼으로 앞 단계의 입력을 다시 확인할 수 있습니다.'),
    ]),
  ];
  wizard.children.forEach((node, index) => {
    node.name = ['기본 정보', '작업 환경', '시작 준비'][index];
  });
  spec.root.children.push(wizard);
}
