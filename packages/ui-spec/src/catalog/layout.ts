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
} as const;

export const horizontalTypes = ['grid'];
