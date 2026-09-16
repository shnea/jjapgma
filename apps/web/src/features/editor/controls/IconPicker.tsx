import { useState } from 'react';
import {
  Plus,
  Star,
  Heart,
  Search,
  Settings,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Download,
  Eye,
  User,
  Mail,
  Calendar,
  Link,
  Copy,
  Save,
  MoreHorizontal,
  Home,
  Folder,
  MessageSquare,
  Menu,
  Bell,
  type LucideIcon,
} from 'lucide-react';
export const iconCatalog: Record<string, { label: string; Icon: LucideIcon }> = {
  home: { label: '홈', Icon: Home },
  folder: { label: '폴더', Icon: Folder },
  'message-square': { label: '게시판', Icon: MessageSquare },
  menu: { label: '메뉴', Icon: Menu },
  bell: { label: '알림', Icon: Bell },
  plus: { label: '추가', Icon: Plus },
  star: { label: '별', Icon: Star },
  heart: { label: '하트', Icon: Heart },
  search: { label: '검색', Icon: Search },
  settings: { label: '설정', Icon: Settings },
  check: { label: '체크', Icon: Check },
  x: { label: '닫기', Icon: X },
  'arrow-left': { label: '왼쪽 화살표', Icon: ArrowLeft },
  'arrow-right': { label: '오른쪽 화살표', Icon: ArrowRight },
  'arrow-up': { label: '위쪽 화살표', Icon: ArrowUp },
  'arrow-down': { label: '아래쪽 화살표', Icon: ArrowDown },
  'chevron-left': { label: '이전', Icon: ChevronLeft },
  'chevron-right': { label: '다음', Icon: ChevronRight },
  pencil: { label: '수정', Icon: Pencil },
  trash: { label: '삭제', Icon: Trash2 },
  download: { label: '다운로드', Icon: Download },
  eye: { label: '보기', Icon: Eye },
  user: { label: '사용자', Icon: User },
  mail: { label: '메일', Icon: Mail },
  calendar: { label: '달력', Icon: Calendar },
  link: { label: '링크', Icon: Link },
  copy: { label: '복사', Icon: Copy },
  save: { label: '저장', Icon: Save },
  more: { label: '더 보기', Icon: MoreHorizontal },
};
export function ElementIcon({ name, size = 18 }: { name?: string; size?: number }) {
  const Icon = iconCatalog[name ?? '']?.Icon;
  return Icon ? <Icon size={size} aria-hidden="true" /> : null;
}
export function IconPicker({
  value,
  onChange,
  label = '아이콘',
}: {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [query, setQuery] = useState('');
  return (
    <fieldset className="icon-picker">
      <legend>{label}</legend>
      <input
        type="search"
        aria-label={`${label} 검색`}
        placeholder="아이콘 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="icon-grid" role="group" aria-label={`${label} 선택`}>
        <button
          type="button"
          title="아이콘 없음"
          aria-label="아이콘 없음"
          aria-pressed={!value || value === 'none'}
          onClick={() => onChange('none')}
        >
          <X size={17} />
          <span>없음</span>
        </button>
        {Object.entries(iconCatalog)
          .filter(([id, item]) => `${id} ${item.label}`.includes(query.trim().toLowerCase()))
          .map(([id, { label, Icon }]) => (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={`${label} 아이콘`}
              aria-pressed={value === id}
              onClick={() => onChange(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
      </div>
    </fieldset>
  );
}
