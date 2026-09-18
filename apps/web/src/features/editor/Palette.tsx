import { useState } from 'react';
import {
  Search,
  Plus,
  Square,
  Type,
  Heading,
  MousePointer2,
  LayoutGrid,
  TextCursorInput,
  AlignLeft,
  SquareCheck,
  Minus,
  PanelTop,
  Link as LinkIcon,
  Star,
  Image as ImageIcon,
  MoveVertical,
  ListFilter,
  CircleDot,
  ToggleLeft,
  Calendar,
  Upload,
  FolderKanban,
  ChevronRight,
  Hash,
  ListOrdered,
  Table,
  List,
  FileText,
  Tag,
  User,
  ChevronsUpDown,
  AlertCircle,
  Loader2,
  Loader,
  Box,
  Inbox,
  Code2,
  MessageSquare,
  PanelLeft,
  PanelRight,
  GalleryHorizontal,
  ChartColumn,
} from 'lucide-react';
import { componentTypes, registry, type ComponentType } from '@jjapgma/ui-spec';

const icons: Record<ComponentType, typeof Square> = {
  // 배치
  container: Square,
  grid: LayoutGrid,
  card: PanelTop,
  modal: PanelTop,
  dialog: PanelTop,
  nonModal: PanelTop,
  sidePanel: PanelLeft,
  drawer: PanelRight,
  carousel: GalleryHorizontal,
  wizard: ListOrdered,
  searchBox: Search,
  // 기본
  heading: Heading,
  text: Type,
  richText: FileText,
  button: MousePointer2,
  link: LinkIcon,
  icon: Star,
  image: ImageIcon,
  divider: Minus,
  spacer: MoveVertical,
  // 입력
  input: TextCursorInput,
  textarea: AlignLeft,
  select: ListFilter,
  checkbox: SquareCheck,
  radio: CircleDot,
  switch: ToggleLeft,
  dateRange: Calendar,
  fileUpload: Upload,
  // 탐색
  navbar: PanelTop,
  tabs: FolderKanban,
  breadcrumb: ChevronRight,
  pagination: Hash,
  stepper: ListOrdered,
  // 데이터
  table: Table,
  list: List,
  descriptionList: FileText,
  badge: Tag,
  avatar: User,
  accordion: ChevronsUpDown,
  chat: MessageSquare,
  chart: ChartColumn,
  // 피드백
  alert: AlertCircle,
  progress: Loader2,
  spinner: Loader,
  skeleton: Box,
  emptyState: Inbox,
  // 고급
  jsonViewer: Code2,
};

export function Palette({
  onAdd,
  disabled,
}: {
  onAdd: (type: ComponentType) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState('');
  return (
    <div className="palette">
      <label className="search-box">
        <Search size={14} />
        <input
          aria-label="요소 검색"
          placeholder="요소 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <p className="palette-count">{componentTypes.length}개 요소</p>
      {['배치', '기본', '입력', '탐색', '데이터', '피드백', '고급'].map((category) => {
        const filtered = componentTypes.filter(
          (type) =>
            registry[type].category === category &&
            `${registry[type].name} ${type}`.toLowerCase().includes(search.toLowerCase()),
        );
        if (filtered.length === 0) return null;
        return (
          <section key={category}>
            <h3>{category}</h3>
            <div className="palette-grid">
              {filtered.map((type) => {
                const Icon = icons[type] ?? Square;
                return (
                  <button
                    key={type}
                    disabled={disabled}
                    draggable={!disabled}
                    onDragStart={(e) => {
                      const data = JSON.stringify({ type });
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData('application/jjapgma', data);
                      e.dataTransfer.setData('text/plain', data);
                    }}
                    onClick={() => onAdd(type)}
                    title={`${registry[type].name} 추가`}
                  >
                    <Icon size={21} />
                    <span>{registry[type].name}</span>
                    <Plus className="palette-plus" size={12} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="panel-help">끌어서 배치하거나 클릭해 선택한 영역에 추가하세요.</p>
    </div>
  );
}
