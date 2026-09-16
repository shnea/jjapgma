import { themePresets, type PageTheme } from '@jjapgma/ui-spec';
import { Button } from '../../components/ui/Button';

export function ThemeEditor({
  theme,
  disabled,
  onChange,
  onUseDefaults,
}: {
  theme?: PageTheme;
  disabled: boolean;
  onChange: (theme?: PageTheme) => void;
  onUseDefaults?: () => void;
}) {
  const preset =
    theme &&
    themePresets.find((item) =>
      Object.entries(item.theme).every(([key, value]) => theme[key as keyof PageTheme] === value),
    );
  return (
    <fieldset className="page-theme-editor" disabled={disabled}>
      <legend>화면 테마</legend>
      <label>
        테마 프리셋
        <select
          aria-label="테마 프리셋"
          value={!theme ? '' : (preset?.id ?? 'custom')}
          onChange={(event) => {
            const selected = themePresets.find((item) => item.id === event.target.value);
            onChange(selected ? structuredClone(selected.theme) : undefined);
          }}
        >
          <option value="">기존 스타일</option>
          {themePresets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          {theme && !preset && <option value="custom">사용자 지정</option>}
        </select>
      </label>
      {theme && (
        <>
          <div className="theme-colors">
            {(
              [
                ['primary', '강조색'],
                ['onPrimary', '강조 글자색'],
                ['background', '화면 배경'],
                ['surface', '카드 배경'],
                ['text', '기본 글자색'],
                ['muted', '보조 글자색'],
                ['border', '테두리색'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  aria-label={label}
                  type="color"
                  value={theme[key]}
                  onChange={(event) => onChange({ ...theme, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
          <label>
            기본 글꼴
            <select
              aria-label="기본 글꼴"
              value={theme.font}
              onChange={(event) =>
                onChange({ ...theme, font: event.target.value as PageTheme['font'] })
              }
            >
              <option value="sans">고딕</option>
              <option value="serif">명조</option>
              <option value="mono">고정폭</option>
            </select>
          </label>
          <label>
            기본 모서리
            <input
              aria-label="기본 모서리"
              type="number"
              min={0}
              max={32}
              value={theme.radius}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (Number.isInteger(value) && value >= 0 && value <= 32)
                  onChange({ ...theme, radius: value });
              }}
            />
          </label>
          <label>
            기본 간격
            <input
              aria-label="기본 간격"
              type="number"
              min={4}
              max={48}
              value={theme.spacing}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (Number.isInteger(value) && value >= 4 && value <= 48)
                  onChange({ ...theme, spacing: value });
              }}
            />
          </label>
        </>
      )}
      <p>페이지 전체에 적용됩니다. 요소에 직접 지정한 배경·색상·간격은 우선 유지됩니다.</p>
      {theme && onUseDefaults && (
        <Button variant="ghost" onClick={onUseDefaults}>
          화면의 테마 기본값 사용
        </Button>
      )}
    </fieldset>
  );
}
