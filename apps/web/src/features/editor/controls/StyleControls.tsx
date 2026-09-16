import { useState } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowDown,
  ArrowRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  StretchHorizontal,
  StretchVertical,
  Columns2,
  Rows2,
  RotateCcw,
} from 'lucide-react';
import {
  effectiveStyle,
  gridDimensions,
  resizeGrid,
  registry,
  type UiNode,
  type NodeStyle,
  type PageTheme,
  type Breakpoint,
} from '@jjapgma/ui-spec';
import { ChoiceField } from './ChoiceField';
type Change = (key: keyof NodeStyle, value: string | number | boolean | undefined) => void;
function ColorField({
  label,
  value,
  onChange,
  theme,
  inherited,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  theme?: PageTheme;
  inherited?: boolean;
}) {
  const [draft, setDraft] = useState<string>();
  const themed = value.startsWith('theme:') ? theme?.[value.slice(6) as keyof PageTheme] : value;
  const display = typeof themed === 'string' ? themed : '#ffffff';
  return (
    <div className="color-field">
      <label>
        {label}
        <div>
          <input
            type="color"
            aria-label={label}
            value={/^#[0-9a-f]{6}$/i.test(display) ? display : '#ffffff'}
            onChange={(e) => {
              setDraft(undefined);
              onChange(e.target.value);
            }}
          />
          <input
            aria-label={`${label} 코드`}
            value={draft ?? display}
            onChange={(e) => {
              setDraft(e.target.value);
              if (/^(#[0-9a-f]{6}|transparent)$/i.test(e.target.value)) onChange(e.target.value);
            }}
            onBlur={() => setDraft(undefined)}
          />
          <button
            type="button"
            aria-label={`${label} 기본값`}
            title="기본값으로"
            onClick={() => {
              setDraft(undefined);
              onChange(undefined);
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </label>
      <label>
        {label} 연결
        <select
          aria-label={`${label} 연결`}
          value={inherited ? 'default' : value.startsWith('theme:') ? value : 'custom'}
          onChange={(e) => {
            setDraft(undefined);
            onChange(
              e.target.value === 'default'
                ? undefined
                : e.target.value === 'custom'
                  ? display
                  : e.target.value,
            );
          }}
        >
          <option value="default">요소 기본값</option>
          <option value="custom">직접 지정</option>
          {[
            ['primary', '강조'],
            ['onPrimary', '강조 위 글자'],
            ['background', '화면 배경'],
            ['surface', '표면'],
            ['text', '글자'],
            ['muted', '보조 글자'],
            ['border', '테두리'],
          ].map(([key, text]) => (
            <option key={key} value={'theme:' + key}>
              테마 · {text}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
function SizeField({
  name,
  value,
  change,
}: {
  name: 'width' | 'height';
  value: string | undefined;
  change: Change;
}) {
  const label = name === 'width' ? '너비' : '높이';
  const mode =
    !value || value === 'auto'
      ? 'auto'
      : value === '100%'
        ? 'fill'
        : value.endsWith('%')
          ? 'percent'
          : 'fixed';
  return (
    <div className="dimension-field">
      <ChoiceField
        label={label}
        value={mode}
        options={[
          { value: 'auto', label: '내용' },
          { value: 'fill', label: '채움' },
          { value: 'fixed', label: '고정' },
          { value: 'percent', label: '비율' },
        ]}
        onChange={(v) =>
          change(
            name,
            v === 'auto' ? 'auto' : v === 'fill' ? '100%' : v === 'fixed' ? '240px' : '50%',
          )
        }
      />
      {['fixed', 'percent'].includes(mode) && (
        <label className="unit-field">
          {label} 값
          <input
            type="number"
            min={0}
            max={mode === 'percent' ? 100 : 9999}
            value={parseInt(value ?? '0')}
            onChange={(e) =>
              change(
                name,
                `${Math.round(Math.max(0, Math.min(mode === 'percent' ? 100 : 9999, Number(e.target.value))))}${mode === 'percent' ? '%' : 'px'}`,
              )
            }
          />
          <span>{mode === 'percent' ? '%' : 'px'}</span>
        </label>
      )}
    </div>
  );
}
export function StyleControls({
  node,
  parent,
  theme,
  breakpoint,
  root,
  onUpdate,
}: {
  node: UiNode;
  parent?: UiNode;
  theme?: PageTheme;
  breakpoint: Breakpoint;
  root: boolean;
  onUpdate: (edit: (node: UiNode) => void) => void;
}) {
  const style = effectiveStyle(node, breakpoint),
    container = !!registry[node.type].children;
  const row = style.direction === 'row',
    parentRow = parent && effectiveStyle(parent, breakpoint).direction === 'row';
  const change: Change = (key, value) =>
    onUpdate((n) => {
      if (
        n.type === 'grid' &&
        breakpoint === 'desktop' &&
        typeof value === 'number' &&
        (key === 'gridColumns' || key === 'gridRows')
      ) {
        const current = gridDimensions(n);
        resizeGrid(
          n,
          key === 'gridColumns' ? value : current.columns,
          key === 'gridRows' ? value : current.rows,
        );
        return;
      }
      const target = breakpoint === 'desktop' ? n.style : (n.responsive[breakpoint] ??= {});
      if (value === undefined) delete target[key];
      else Object.assign(target, { [key]: value });
    });
  const numeric = (
    key: keyof NodeStyle,
    label: string,
    fallback: number,
    max = 160,
    min = 0,
    step = 1,
  ) => (
    <label key={key} className="unit-field">
      {label}
      {key.startsWith('margin') && (
        <button
          className="reset-property"
          type="button"
          aria-label={`${label} 바깥 여백 초기화`}
          title="직접 지정한 여백 지우기"
          disabled={style[key] === undefined}
          onClick={() => change(key, undefined)}
        >
          <RotateCcw size={12} />
        </button>
      )}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number(style[key] ?? fallback)}
        onChange={(e) =>
          change(
            key,
            Math.max(min, Math.min(max, Math.round(Number(e.target.value) / step) * step)),
          )
        }
      />
    </label>
  );
  const alignment = (vertical: boolean, stretch = false) => [
    ...(stretch
      ? [
          {
            value: 'stretch',
            label: '채움',
            icon: vertical ? <StretchVertical size={18} /> : <StretchHorizontal size={18} />,
          },
        ]
      : []),
    {
      value: 'flex-start',
      label: vertical ? '위' : '왼쪽',
      icon: vertical ? <AlignStartHorizontal size={18} /> : <AlignStartVertical size={18} />,
    },
    {
      value: 'center',
      label: '가운데',
      icon: vertical ? <AlignCenterHorizontal size={18} /> : <AlignCenterVertical size={18} />,
    },
    {
      value: 'flex-end',
      label: vertical ? '아래' : '오른쪽',
      icon: vertical ? <AlignEndHorizontal size={18} /> : <AlignEndVertical size={18} />,
    },
  ];
  const baseSpace = container ? (theme?.spacing ?? 24) : 0;
  const baseRadius = ['card', 'modal', 'dialog'].includes(node.type)
    ? (theme?.radius ?? 12)
    : node.type === 'button'
      ? (theme?.radius ?? 6)
      : 0;
  const button = node.type === 'button',
    outlined = ['outline', 'ghost'].includes(node.props.variant ?? '');
  return (
    <>
      <section>
        <div className="property-heading">
          <h3>배치와 크기</h3>
          <span className="breakpoint-tag">
            {{ desktop: '기본', tablet: '태블릿', mobile: '모바일' }[breakpoint]}
          </span>
        </div>
        <p className="panel-help">
          {breakpoint === 'desktop'
            ? '모든 화면의 기본값입니다.'
            : '현재 화면 크기에만 적용합니다. 설정 초기화 시 기본값을 따릅니다.'}
        </p>
        <SizeField name="width" value={style.width} change={change} />
        <SizeField name="height" value={style.height} change={change} />
        {root && (
          <label className="check-field">
            <input
              type="checkbox"
              checked={
                style.minHeight === '100dvh' ||
                style.minHeight === '100vh' ||
                style.minHeight === undefined
              }
              onChange={(e) => change('minHeight', e.target.checked ? '100dvh' : '0px')}
            />
            화면 높이 이상 채우기
          </label>
        )}
        <label className="check-field">
          <input
            type="checkbox"
            checked={style.grow ?? false}
            onChange={(e) => change('grow', e.target.checked)}
          />
          부모의 남은 공간 채우기
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={style.shrink === false}
            onChange={(e) => change('shrink', !e.target.checked)}
          />
          공간이 좁아도 크기 유지
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={style.sticky ?? false}
            onChange={(e) => change('sticky', e.target.checked)}
          />
          스크롤 시 상단 고정
        </label>
        <details className="property-details">
          <summary>최소·최대 크기</summary>
          {(['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const).map((key, i) => (
            <label key={key}>
              {['최소 너비', '최대 너비', '최소 높이', '최대 높이'][i]}
              <input
                type="number"
                min={0}
                max={9999}
                placeholder="제한 없음"
                value={style[key]?.endsWith('px') ? parseInt(style[key]) : ''}
                onChange={(e) =>
                  change(
                    key,
                    e.target.value === ''
                      ? undefined
                      : `${Math.max(0, Math.min(9999, Math.round(Number(e.target.value))))}px`,
                  )
                }
              />
            </label>
          ))}
        </details>
        {container && node.type !== 'grid' && (
          <>
            <ChoiceField
              label="배치 방향"
              value={style.direction ?? 'column'}
              options={[
                { value: 'column', label: '세로', icon: <ArrowDown size={18} /> },
                { value: 'row', label: '가로', icon: <ArrowRight size={18} /> },
              ]}
              onChange={(v) => change('direction', v)}
            />
            <ChoiceField
              label={row ? '세로 정렬' : '가로 정렬'}
              value={style.align ?? 'stretch'}
              options={alignment(row, true)}
              onChange={(v) => change('align', v)}
            />
            {row && (
              <>
                <ChoiceField
                  label="폼·버튼 정렬"
                  value={style.controlAlignment ?? 'input'}
                  options={[
                    { value: 'input', label: '입력칸에 맞춤' },
                    { value: 'layout', label: '일반 배치' },
                  ]}
                  onChange={(value) => change('controlAlignment', value)}
                />
                <p className="panel-help">
                  입력칸에 맞춤은 라벨·설명을 제외한 입력 영역의 중앙에 버튼을 맞춥니다. 일반 배치는
                  위의 세로 정렬을 따릅니다.
                </p>
              </>
            )}
            <ChoiceField
              label={row ? '가로 배분' : '세로 배분'}
              value={style.justify ?? 'flex-start'}
              options={[
                ...alignment(!row),
                {
                  value: 'space-between',
                  label: '균등 간격',
                  icon: row ? <Columns2 size={18} /> : <Rows2 size={18} />,
                },
              ]}
              onChange={(v) => change('justify', v)}
            />
            {row && (
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={style.wrap ?? false}
                  onChange={(e) => change('wrap', e.target.checked)}
                />
                공간이 부족하면 줄바꿈
              </label>
            )}
          </>
        )}
        {node.type === 'grid' && (
          <div className="field-grid">
            {numeric('gridColumns', '그리드 열 수', 2, 12, 1)}
            {numeric('gridRows', '그리드 행 수', gridDimensions(node).rows, 50, 1)}
            <p className="panel-help">
              기본 행·열 조절은 실제 영역을 추가하거나 줄입니다. 내용이 있는 영역은 먼저 비워
              주세요. 모바일 열 설정은 배치만 바꿉니다.
            </p>
          </div>
        )}
        {parent && !root && (
          <>
            <ChoiceField
              label={
                parent.type === 'grid'
                  ? '셀 안 세로 위치'
                  : parentRow
                    ? '이 요소의 세로 위치'
                    : '이 요소의 가로 위치'
              }
              value={style.alignSelf ?? 'auto'}
              options={[
                { value: 'auto', label: '부모 따름' },
                ...alignment(!!parentRow || parent.type === 'grid', true),
              ]}
              onChange={(v) => change('alignSelf', v)}
            />
            {parent.type === 'grid' ? (
              <ChoiceField
                label="셀 안 가로 위치"
                value={style.justifySelf ?? 'auto'}
                options={[
                  { value: 'auto', label: '부모 따름' },
                  { value: 'start', label: '왼쪽' },
                  { value: 'center', label: '가운데' },
                  { value: 'end', label: '오른쪽' },
                  { value: 'stretch', label: '채움' },
                ]}
                onChange={(v) => change('justifySelf', v)}
              />
            ) : (
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={style.pushEnd ?? false}
                  onChange={(e) => change('pushEnd', e.target.checked)}
                />
                {parentRow ? '남은 공간을 앞에 두고 오른쪽으로' : '남은 공간을 위에 두고 아래로'}
              </label>
            )}
          </>
        )}
        <ChoiceField
          label="내용 정렬"
          value={style.textAlign ?? 'left'}
          options={[
            { value: 'left', label: '왼쪽', icon: <AlignLeft size={18} /> },
            { value: 'center', label: '가운데', icon: <AlignCenter size={18} /> },
            { value: 'right', label: '오른쪽', icon: <AlignRight size={18} /> },
            { value: 'justify', label: '양끝', icon: <AlignJustify size={18} /> },
          ]}
          onChange={(v) => change('textAlign', v)}
        />
        {container && (
          <>
            {(['overflowX', 'overflowY'] as const).map((axis) => (
              <ChoiceField
                key={axis}
                label={axis === 'overflowX' ? '가로 스크롤' : '세로 스크롤'}
                value={style[axis] ?? style.overflow ?? 'visible'}
                options={[
                  { value: 'visible', label: '영역 밖 표시' },
                  { value: 'auto', label: '자동' },
                  { value: 'scroll', label: '항상' },
                  { value: 'hidden', label: '숨김' },
                ]}
                onChange={(v) => change(axis, v)}
              />
            ))}
            <p className="panel-help">
              세로 스크롤은 높이 또는 최대 높이를 지정해야 생깁니다. 한 방향을 스크롤로 설정하면
              반대 방향의 ‘영역 밖 표시’는 브라우저에서 자동 스크롤로 처리됩니다.
            </p>
            {numeric('gap', '요소 간격 (px)', theme?.spacing ?? 16)}
          </>
        )}
        <label className="check-field">
          <input
            type="checkbox"
            checked={style.hidden ?? false}
            onChange={(e) => change('hidden', e.target.checked)}
          />
          이 화면에서 숨기기
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={node.responsive.mobile?.hidden ?? false}
            onChange={(e) =>
              onUpdate((n) => {
                (n.responsive.mobile ??= {}).hidden = e.target.checked;
              })
            }
          />
          모바일에서 숨기기
        </label>
      </section>
      <section>
        <h3>여백</h3>
        {numeric('padding', '전체 안쪽 여백 (px)', baseSpace)}
        <details className="property-details">
          <summary>방향별 안쪽 여백</summary>
          <div className="spacing-diagram">
            <span>내용</span>
            {(['Top', 'Right', 'Bottom', 'Left'] as const).map((side, i) => (
              <div className={`side-${side.toLowerCase()}`} key={side}>
                {numeric(
                  `padding${side}`,
                  ['위', '오른쪽', '아래', '왼쪽'][i],
                  style.padding ?? baseSpace,
                )}
              </div>
            ))}
          </div>
        </details>
        <details className="property-details">
          <summary>바깥 여백</summary>
          <div className="spacing-diagram">
            <span>요소</span>
            {(['Top', 'Right', 'Bottom', 'Left'] as const).map((side, i) => (
              <div className={`side-${side.toLowerCase()}`} key={side}>
                {numeric(`margin${side}`, ['위', '오른쪽', '아래', '왼쪽'][i], 0)}
              </div>
            ))}
          </div>
        </details>
      </section>
      <section>
        <h3>모양</h3>
        <div className="field-grid">
          <ColorField
            label="배경색"
            theme={theme}
            inherited={style.background === undefined}
            value={
              style.background ??
              (root
                ? (theme?.background ?? '#ffffff')
                : button
                  ? outlined
                    ? 'transparent'
                    : (theme?.primary ?? '#28312a')
                  : ['card', 'modal', 'dialog'].includes(node.type)
                    ? (theme?.surface ?? '#ffffff')
                    : 'transparent')
            }
            onChange={(v) => change('background', v)}
          />
          <ColorField
            label="글자색"
            theme={theme}
            inherited={style.color === undefined}
            value={
              style.color ??
              (button
                ? outlined
                  ? (theme?.primary ?? '#28312a')
                  : (theme?.onPrimary ?? '#ffffff')
                : (theme?.text ?? '#202520'))
            }
            onChange={(v) => change('color', v)}
          />
        </div>
        <div className="radius-preview" style={{ borderRadius: style.radius ?? baseRadius }}>
          모서리 미리보기
        </div>
        <ChoiceField
          label="모서리 모양"
          value={String(style.radius ?? baseRadius)}
          options={[
            { value: '0', label: '직각' },
            { value: '6', label: '살짝' },
            { value: '16', label: '둥글게' },
            { value: '100', label: '최대로' },
          ]}
          onChange={(v) => change('radius', Number(v))}
        />
        {numeric('radius', '모서리 (px)', baseRadius, 100)}
        <details className="property-details">
          <summary>모서리별 설정</summary>
          <div className="field-grid">
            {(['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'] as const).map((key, i) =>
              numeric(
                `radius${key}`,
                ['왼쪽 위', '오른쪽 위', '왼쪽 아래', '오른쪽 아래'][i],
                style.radius ?? baseRadius,
                100,
              ),
            )}
          </div>
        </details>
        <div className="field-grid">
          {numeric(
            'fontSize',
            '글자 크기 (px)',
            button || node.type === 'table' ? 14 : node.type === 'heading' ? 30 : 16,
            120,
            8,
          )}
          {numeric(
            'lineHeight',
            '줄 높이',
            button ? 1 : node.type === 'heading' ? 1.3 : 1.7,
            3,
            1,
            0.1,
          )}
        </div>
        <ChoiceField
          label="글자 굵기"
          value={style.fontWeight ?? (node.type === 'heading' ? '700' : '400')}
          options={[
            { value: '400', label: '보통' },
            { value: '500', label: '중간' },
            { value: '600', label: '굵게' },
            { value: '700', label: '더 굵게' },
          ]}
          onChange={(v) => change('fontWeight', v)}
        />
        <details className="property-details">
          <summary>테두리·그림자·투명도</summary>
          {numeric('borderWidth', '테두리 (px)', 0, 12)}
          <ColorField
            label="테두리색"
            theme={theme}
            inherited={style.borderColor === undefined}
            value={style.borderColor ?? theme?.border ?? '#dce3dc'}
            onChange={(v) => change('borderColor', v)}
          />
          <ChoiceField
            label="그림자"
            value={style.shadow ?? 'none'}
            options={[
              { value: 'none', label: '없음' },
              { value: 'small', label: '약하게' },
              { value: 'medium', label: '보통' },
              { value: 'large', label: '강하게' },
            ]}
            onChange={(v) => change('shadow', v)}
          />
          {numeric('opacity', '불투명도', 1, 1, 0, 0.05)}
        </details>
        {node.type === 'image' && (
          <>
            <ChoiceField
              label="이미지 맞춤"
              value={style.objectFit ?? 'cover'}
              options={[
                { value: 'cover', label: '영역 채움' },
                { value: 'contain', label: '전체 보기' },
              ]}
              onChange={(v) => change('objectFit', v)}
            />
            <ChoiceField
              label="이미지 기준점"
              value={style.objectPosition ?? 'center'}
              options={['left', 'top', 'center', 'bottom', 'right'].map((value, i) => ({
                value,
                label: ['왼쪽', '위', '가운데', '아래', '오른쪽'][i],
              }))}
              onChange={(v) => change('objectPosition', v)}
            />
          </>
        )}
      </section>
    </>
  );
}
