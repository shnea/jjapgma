import { formComponents, inputTypes, optionTypes } from './catalog/forms.js';
import { layoutComponents } from './catalog/layout.js';
import { contentComponents } from './catalog/content.js';

export const registry = {
  ...layoutComponents,
  ...contentComponents,
  ...formComponents,
} as const;

export type ComponentType = keyof typeof registry;
export const componentTypes = Object.keys(registry) as ComponentType[];

export const legacyTypeAliases: Record<
  string,
  {
    type: ComponentType;
    props?: Record<string, unknown>;
    style?: Record<string, unknown>;
  }
> = {
  row: { type: 'container', style: { direction: 'row' } },
  column: { type: 'container', style: { direction: 'column' } },
  stack: { type: 'container', style: { direction: 'row' } },
  section: { type: 'container' },
  scrollArea: { type: 'container', style: { height: '320px', overflow: 'auto' } },
  splitPane: { type: 'container', style: { direction: 'row' } },
  buttonGroup: { type: 'container', style: { direction: 'row' } },
  header: { type: 'navbar' },
  sidebar: { type: 'navbar', style: { direction: 'column' } },
  password: { type: 'input', props: { controlType: 'password' } },
  number: { type: 'input', props: { controlType: 'number' } },
  search: { type: 'input', props: { controlType: 'search' } },
  date: { type: 'input', props: { controlType: 'date' } },
  time: { type: 'input', props: { controlType: 'time' } },
  colorPicker: { type: 'input', props: { controlType: 'color' } },
  slider: { type: 'input', props: { controlType: 'range' } },
  otp: { type: 'input', props: { controlType: 'otp' } },
  multiSelect: { type: 'select', props: { multiple: true } },
  label: { type: 'text' },
  iconButton: { type: 'button', props: { variant: 'icon' } },
  toggleButton: { type: 'button', props: { variant: 'outline' } },
  fab: { type: 'button', props: { variant: 'fab' } },
  dropdownButton: { type: 'select' },
  menu: { type: 'navbar', style: { direction: 'column' } },
  bottomNavigation: { type: 'navbar' },
  keyValue: { type: 'descriptionList' },
  chip: { type: 'badge', props: { shape: 'pill' } },
  errorState: { type: 'emptyState', props: { stateType: 'error' } },
};

export const propertySchema = [
  { key: 'value', label: '진행률 (0–100)', editor: 'number', types: ['progress'] },
  {
    key: 'text',
    label: '내용',
    editor: 'text',
    types: [
      'heading',
      'text',
      'button',
      'link',
      'icon',
      'input',
      'textarea',
      'select',
      'checkbox',
      'radio',
      'switch',
      'dateRange',
      'fileUpload',
      'alert',
      'progress',
      'spinner',
      'skeleton',
      'emptyState',
      'badge',
      'avatar',
      'jsonViewer',
      'table',
    ],
  },
  {
    key: 'placeholder',
    label: '입력 안내',
    editor: 'text',
    types: ['input', 'textarea'],
  },
  {
    key: 'controlType',
    label: '입력 종류',
    editor: 'select',
    options: [
      ['text', '일반 텍스트'],
      ['password', '비밀번호'],
      ['number', '숫자'],
      ['search', '검색'],
      ['email', '이메일'],
      ['tel', '전화번호'],
      ['url', 'URL'],
      ['date', '날짜'],
      ['time', '시간'],
      ['color', '색상'],
      ['range', '슬라이더 (범위)'],
      ['otp', '인증번호 (OTP)'],
    ],
    types: ['input'],
  },
  {
    key: 'multiple',
    label: '다중 선택 허용',
    editor: 'checkbox',
    types: ['select'],
  },
  {
    key: 'shape',
    label: '배지 모양',
    editor: 'select',
    options: [
      ['rounded', '기본 (사각 라운드)'],
      ['pill', '알약형 (Chip)'],
    ],
    types: ['badge'],
  },
  {
    key: 'stateType',
    label: '화면 상태',
    editor: 'select',
    options: [
      ['empty', '빈 상태 (기본)'],
      ['error', '오류 상태'],
      ['success', '완료 상태'],
    ],
    types: ['emptyState'],
  },
  {
    key: 'variant',
    label: '스타일 변형',
    editor: 'select',
    options: [
      ['default', '기본'],
      ['outline', '아웃라인'],
      ['ghost', '고스트'],
      ['icon', '아이콘 전용'],
      ['fab', '플로팅 (FAB)'],
    ],
    types: ['button'],
  },
  {
    key: 'titleLevel',
    label: '제목 단계',
    editor: 'select',
    options: [
      ['h1', 'H1'],
      ['h2', 'H2'],
      ['h3', 'H3'],
      ['h4', 'H4'],
      ['h5', 'H5'],
      ['h6', 'H6'],
    ],
    types: ['heading'],
  },
  {
    key: 'items',
    label: '항목 (한 줄에 하나, 표/설명목록은 |로 구분)',
    editor: 'textarea',
    types: optionTypes,
  },
  { key: 'href', label: '이동 주소', editor: 'text', types: ['link'] },
  { key: 'src', label: '이미지 경로 (같은 사이트)', editor: 'text', types: ['image'] },
  {
    key: 'labelPosition',
    label: '라벨 위치',
    editor: 'select',
    options: [
      ['top', '위'],
      ['left', '왼쪽'],
      ['right', '오른쪽'],
    ],
    types: inputTypes,
  },
  {
    key: 'optionDirection',
    label: '항목 배치',
    editor: 'select',
    options: [
      ['column', '세로'],
      ['row', '가로'],
    ],
    types: ['checkbox', 'radio'],
  },
  {
    key: 'optionAlign',
    label: '항목 정렬',
    editor: 'select',
    options: [
      ['left', '왼쪽'],
      ['center', '가운데'],
      ['right', '오른쪽'],
    ],
    types: ['checkbox', 'radio'],
  },
  {
    key: 'iconName',
    label: '아이콘',
    editor: 'select',
    options: [
      ['plus', '플러스'],
      ['star', '별'],
      ['heart', '하트'],
      ['search', '검색'],
      ['settings', '설정'],
      ['check', '체크'],
      ['x', '닫기'],
    ],
    types: ['icon', 'button'],
  },
  { key: 'labelVisible', label: '라벨 표시', editor: 'checkbox', types: inputTypes },
  {
    key: 'required',
    label: '필수 입력',
    editor: 'checkbox',
    types: inputTypes,
  },
  {
    key: 'disabled',
    label: '사용 안 함',
    editor: 'checkbox',
    types: ['button', ...inputTypes],
  },
] as const;
