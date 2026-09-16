const layout = (name: string, icon = 'square') => ({
  name,
  category: '배치',
  children: true,
  text: '',
  icon,
});

export const layoutComponents = {
  container: layout('컨테이너', 'square'),
  grid: layout('그리드', 'layout-grid'),
  card: layout('카드', 'panel-top'),
  modal: layout('모달', 'layers'),
  dialog: layout('다이얼로그', 'message-square'),
  nonModal: layout('Non-modal', 'panel-top'),
  sidePanel: layout('사이드 패널', 'panel-left'),
  drawer: layout('서랍', 'panel-right'),
  carousel: layout('캐러셀', 'gallery-horizontal'),
  wizard: layout('단계별 입력', 'list-ordered'),
} as const;

export const horizontalTypes = ['grid'];
