const form = (name: string, text = '입력해 주세요', icon = 'text-cursor-input') => ({
  name,
  category: '입력',
  children: false,
  text,
  icon,
});

export const formComponents = {
  input: form('입력창', '이름', 'text-cursor-input'),
  textarea: form('여러 줄 입력', '메시지', 'align-left'),
  select: form('선택 목록', '옵션 선택', 'list-filter'),
  checkbox: form('체크박스', '동의합니다', 'check-square'),
  radio: form('라디오 그룹', '선택 항목', 'circle-dot'),
  switch: form('스위치', '알림 받기', 'toggle-left'),
  dateRange: form('날짜 범위', '기간', 'calendar'),
  fileUpload: form('파일 업로드', '파일', 'upload'),
} as const;

export const inputTypes = [
  'input',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'switch',
  'dateRange',
  'fileUpload',
];

export const optionTypes = [
  'select',
  'radio',
  'navbar',
  'tabs',
  'breadcrumb',
  'stepper',
  'table',
  'list',
  'descriptionList',
  'accordion',
];
