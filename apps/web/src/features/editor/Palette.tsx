import { useState } from 'react';
import {
  Search,
  Plus,
  Square,
  Type,
  Heading,
  MousePointer2,
  Columns3,
  TextCursorInput,
  AlignLeft,
  SquareCheck,
  Minus,
  PanelTop,
} from 'lucide-react';
import { componentTypes, registry, type ComponentType } from '@jjapgma/ui-spec';
const icons: Partial<Record<ComponentType, typeof Square>> = {
  container: Square,
  stack: Columns3,
  heading: Heading,
  text: Type,
  button: MousePointer2,
  input: TextCursorInput,
  textarea: AlignLeft,
  checkbox: SquareCheck,
  divider: Minus,
  card: PanelTop,
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
      {['배치', '기본', '입력', '동작', '탐색', '데이터', '피드백', '고급'].map((category) => (
        <section key={category}>
          <h3>{category}</h3>
          <div className="palette-grid">
            {componentTypes
              .filter(
                (type) =>
                  registry[type].category === category &&
                  `${registry[type].name} ${type}`.toLowerCase().includes(search.toLowerCase()),
              )
              .map((type) => {
                const Icon = icons[type] ?? Square;
                return (
                  <button
                    key={type}
                    disabled={disabled}
                    draggable={!disabled}
                    onDragStart={(e) =>
                      e.dataTransfer.setData('application/jjapgma', JSON.stringify({ type }))
                    }
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
      ))}
      <p className="panel-help">끌어서 배치하거나 클릭해 선택한 영역에 추가하세요.</p>
    </div>
  );
}
