export const registry = {
  container: { name: '영역', category: '배치', children: true, text: '', icon: 'square' },
  stack: { name: '가로 배치', category: '배치', children: true, text: '', icon: 'columns' },
  heading: {
    name: '제목',
    category: '기본',
    children: false,
    text: '새로운 제목',
    icon: 'heading',
  },
  text: {
    name: '텍스트',
    category: '기본',
    children: false,
    text: '여기에 내용을 입력하세요.',
    icon: 'text',
  },
  button: {
    name: '버튼',
    category: '기본',
    children: false,
    text: '시작하기',
    icon: 'mouse-pointer',
  },
  input: {
    name: '입력창',
    category: '입력',
    children: false,
    text: '이름',
    icon: 'text-cursor-input',
  },
  textarea: {
    name: '여러 줄 입력',
    category: '입력',
    children: false,
    text: '메시지',
    icon: 'align-left',
  },
  checkbox: {
    name: '체크박스',
    category: '입력',
    children: false,
    text: '동의합니다',
    icon: 'check-square',
  },
  divider: { name: '구분선', category: '기본', children: false, text: '', icon: 'minus' },
  card: { name: '카드', category: '배치', children: true, text: '', icon: 'panel-top' },
} as const;
export type ComponentType = keyof typeof registry;
export const componentTypes = Object.keys(registry) as ComponentType[];
export const propertySchema = [
  {
    key: 'text',
    label: '내용',
    editor: 'text',
    types: ['heading', 'text', 'button', 'input', 'textarea', 'checkbox'],
  },
  { key: 'placeholder', label: '입력 안내', editor: 'text', types: ['input', 'textarea'] },
  {
    key: 'required',
    label: '필수 입력',
    editor: 'checkbox',
    types: ['input', 'textarea', 'checkbox'],
  },
  {
    key: 'disabled',
    label: '사용 안 함',
    editor: 'checkbox',
    types: ['button', 'input', 'textarea', 'checkbox'],
  },
] as const;
