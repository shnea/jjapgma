const layout = (name: string, category = '배치', icon = 'square') => ({
  name,
  category,
  children: true,
  text: '',
  icon,
});
export const layoutComponents = {
  row: layout('행', '배치', 'columns'),
  column: layout('열'),
  grid: layout('그리드'),
  section: layout('섹션'),
  scrollArea: layout('스크롤 영역'),
  splitPane: layout('분할 영역'),
  buttonGroup: layout('버튼 그룹', '동작'),
  header: layout('헤더', '탐색'),
  sidebar: layout('사이드바', '탐색'),
} as const;
export const horizontalTypes = ['stack', 'row', 'grid', 'splitPane', 'header', 'buttonGroup'];
