import { templateCategories } from '@jjapgma/ui-spec';
export function TemplateFilters({
  query,
  category,
  onQuery,
  onCategory,
}: {
  query: string;
  category: string;
  onQuery: (value: string) => void;
  onCategory: (value: string) => void;
}) {
  return (
    <div className="template-filters">
      <input
        type="search"
        aria-label="템플릿 검색"
        placeholder="이름·용도로 검색"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      <div className="template-categories" role="group" aria-label="템플릿 분류">
        {['전체', ...templateCategories].map((label) => (
          <button
            type="button"
            key={label}
            aria-pressed={category === label}
            onClick={() => onCategory(label)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
