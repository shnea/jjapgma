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
} as const;

export const horizontalTypes = ['grid'];
