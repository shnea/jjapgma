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
  Share2,
  Upload,
  ExternalLink,
  Clipboard,
  Printer,
  FileText,
  FileCode,
  FileJson,
  Image,
  Paperclip,
  Send,
  Users,
  UserPlus,
  LogIn,
  LogOut,
  Lock,
  Unlock,
  ShieldCheck,
  RefreshCw,
  Undo2,
  Redo2,
  History,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  Info,
  CircleHelp,
  TriangleAlert,
  CircleCheck,
  CircleX,
  Bookmark,
  Globe,
  MapPin,
  Phone,
  ShoppingCart,
  CreditCard,
  Play,
  Pause,
  Maximize,
  Minimize,
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
  share: { label: '공유', Icon: Share2 },
  export: { label: '내보내기', Icon: Download },
  upload: { label: '업로드', Icon: Upload },
  'external-link': { label: '새 창 열기', Icon: ExternalLink },
  clipboard: { label: '붙여넣기', Icon: Clipboard },
  printer: { label: '인쇄', Icon: Printer },
  'file-text': { label: '문서', Icon: FileText },
  'file-code': { label: '코드 파일', Icon: FileCode },
  'file-json': { label: 'JSON 파일', Icon: FileJson },
  image: { label: '이미지', Icon: Image },
  paperclip: { label: '파일 첨부', Icon: Paperclip },
  send: { label: '보내기', Icon: Send },
  users: { label: '사용자 그룹', Icon: Users },
  'user-plus': { label: '사용자 초대', Icon: UserPlus },
  'log-in': { label: '로그인', Icon: LogIn },
  'log-out': { label: '로그아웃', Icon: LogOut },
  lock: { label: '잠금', Icon: Lock },
  unlock: { label: '잠금 해제', Icon: Unlock },
  'shield-check': { label: '보안 확인', Icon: ShieldCheck },
  refresh: { label: '새로고침', Icon: RefreshCw },
  undo: { label: '실행 취소', Icon: Undo2 },
  redo: { label: '다시 실행', Icon: Redo2 },
  history: { label: '기록', Icon: History },
  filter: { label: '필터', Icon: Filter },
  sort: { label: '정렬', Icon: ArrowUpDown },
  sliders: { label: '옵션 조절', Icon: SlidersHorizontal },
  info: { label: '정보', Icon: Info },
  help: { label: '도움말', Icon: CircleHelp },
  warning: { label: '경고', Icon: TriangleAlert },
  success: { label: '성공', Icon: CircleCheck },
  error: { label: '오류', Icon: CircleX },
  bookmark: { label: '북마크', Icon: Bookmark },
  globe: { label: '웹사이트', Icon: Globe },
  'map-pin': { label: '위치', Icon: MapPin },
  phone: { label: '전화', Icon: Phone },
  'shopping-cart': { label: '장바구니', Icon: ShoppingCart },
  'credit-card': { label: '결제', Icon: CreditCard },
  play: { label: '재생', Icon: Play },
  pause: { label: '일시 정지', Icon: Pause },
  maximize: { label: '전체 화면', Icon: Maximize },
  minimize: { label: '화면 축소', Icon: Minimize },
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
