import { Fragment, useMemo, useState } from 'react';
import { createTemplate, pageTemplates } from '@jjapgma/ui-spec';
import { PagePreview } from './PagePreview';
import { TemplateFilters } from './TemplateFilters';
export function TemplatePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const preview = useMemo(() => (value ? createTemplate(value) : undefined), [value]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const search = query.trim().toLocaleLowerCase();
  const items = pageTemplates.filter(
    (item) =>
      (category === '전체' || item.category === category) &&
      `${item.id} ${item.name} ${item.category} ${item.description}`
        .toLocaleLowerCase()
        .includes(search),
  );
  return (
    <div className="template-picker">
      <div>
        <TemplateFilters
          query={query}
          category={category}
          onQuery={setQuery}
          onCategory={setCategory}
        />
        <fieldset disabled={disabled} className="template-picker-list">
          <legend>시작 템플릿</legend>
          {[
            {
              id: '',
              name: '빈 페이지',
              category: '기본',
              description: '직접 요소를 배치해 시작합니다.',
            },
            ...items,
          ].map((item, index, all) => (
            <Fragment key={item.id}>
              {(index === 0 || all[index - 1].category !== item.category) && (
                <h3 className="template-group-title">{item.category}</h3>
              )}
              <label key={item.id} className={value === item.id ? 'selected' : ''}>
                <input
                  type="radio"
                  name="page-template"
                  value={item.id}
                  checked={value === item.id}
                  onChange={() => onChange(item.id)}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.category} · {item.description}
                  </small>
                </span>
              </label>
            </Fragment>
          ))}
          {!items.length && <p className="template-help">검색 결과가 없습니다.</p>}
        </fieldset>
      </div>
      <section>
        <h3>{pageTemplates.find((item) => item.id === value)?.name ?? '빈 페이지'} 미리보기</h3>
        {preview ? (
          <PagePreview spec={preview} />
        ) : (
          <div className="template-blank">빈 캔버스에서 시작합니다.</div>
        )}
        <p className="library-note">
          템플릿으로 새 페이지를 만듭니다. 입력·버튼은 화면 예시이며 실제 로그인·제출·결제 서비스는
          연결되어 있지 않습니다.
        </p>
      </section>
    </div>
  );
}
