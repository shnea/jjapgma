const item = (name: string, category: string, text: string, icon = 'square', children = false) => ({
  name,
  category,
  text,
  children,
  icon,
});

export const contentComponents = {
  // 기본 (Basic)
  heading: item('제목', '기본', '새로운 제목', 'heading'),
  text: item('본문 텍스트', '기본', '여기에 내용을 입력하세요.', 'type'),
  button: item('버튼', '기본', '시작하기', 'mouse-pointer-2'),
  link: item('링크', '기본', '자세히 보기', 'link'),
  icon: item('아이콘', '기본', '★', 'star'),
  image: item('이미지', '기본', '이미지 설명', 'image'),
  divider: item('구분선', '기본', '', 'minus'),
  spacer: item('여백', '기본', '', 'move-vertical'),

  // 탐색 (Navigation)
  navbar: item('내비게이션 바', '탐색', '메인 메뉴', 'panel-top'),
  tabs: item('탭', '탐색', '탭 콘텐츠', 'folder-kanban'),
  breadcrumb: item('경로 표시', '탐색', '현재 위치', 'chevron-right'),
  pagination: item('페이지 번호', '탐색', '페이지', 'hash'),
  stepper: item('단계 표시', '탐색', '진행 단계', 'list-ordered'),

  // 데이터 (Data)
  table: item('테이블', '데이터', '목록', 'table'),
  list: item('목록', '데이터', '목록', 'list'),
  descriptionList: item('설명 목록 (키와 값)', '데이터', '상세 정보', 'file-text'),
  badge: item('배지', '데이터', '새 소식', 'tag'),
  avatar: item('아바타', '데이터', '사용자', 'user'),
  accordion: item('아코디언', '데이터', '내용을 여기에 입력하세요.', 'chevrons-up-down'),

  // 피드백 (Feedback)
  alert: item('알림', '피드백', '변경 사항이 저장되었습니다.', 'alert-circle'),
  progress: item('진행률', '피드백', '처리 진행률', 'loader-2'),
  spinner: item('로딩 표시', '피드백', '불러오는 중', 'loader'),
  skeleton: item('스켈레톤', '피드백', '콘텐츠를 불러오는 중', 'box'),
  emptyState: item('상태 화면', '피드백', '아직 항목이 없습니다.', 'inbox'),

  // 고급 (Advanced)
  jsonViewer: item('JSON 보기', '고급', '{\n  "title": "새 프로젝트",\n  "enabled": true\n}', 'code-2'),
} as const;
