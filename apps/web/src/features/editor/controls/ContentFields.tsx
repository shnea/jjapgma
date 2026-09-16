import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowRight,
  ArrowDown,
  PanelTop,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { propertySchema, type UiNode } from '@jjapgma/ui-spec';
import { ChoiceField } from './ChoiceField';
import { IconPicker } from './IconPicker';
import { AddressField } from '../AddressField';
import { FileUploadControl } from '../files/FileAssets';
import { ChartControls } from './ChartControls';
const visual = new Set([
  'labelPosition',
  'optionDirection',
  'optionAlign',
  'variant',
  'shape',
  'stateType',
  'titleLevel',
]);
function optionIcon(key: string, value: string) {
  if (key === 'labelPosition')
    return value === 'top' ? (
      <PanelTop size={20} />
    ) : value === 'left' ? (
      <PanelLeft size={20} />
    ) : (
      <PanelRight size={20} />
    );
  if (key === 'optionDirection')
    return value === 'row' ? <ArrowRight size={20} /> : <ArrowDown size={20} />;
  if (key === 'optionAlign')
    return value === 'left' ? (
      <AlignLeft size={20} />
    ) : value === 'center' ? (
      <AlignCenter size={20} />
    ) : value === 'right' ? (
      <AlignRight size={20} />
    ) : (
      <AlignJustify size={20} />
    );
  if (key === 'variant')
    return (
      <span className={`variant-sample sample-${value}`}>
        {value === 'icon' ? '★' : value === 'fab' ? '+' : '버튼'}
      </span>
    );
  if (key === 'shape') return <span className={`shape-sample shape-${value}`} />;
  if (key === 'stateType') return <span className={`state-sample state-${value}`}>●</span>;
}
export function ContentFields({
  node,
  pageRoot,
  onUpdate,
}: {
  node: UiNode;
  pageRoot?: UiNode;
  onUpdate: (edit: (node: UiNode) => void) => void;
}) {
  const update = (key: string, value: unknown) =>
    onUpdate((n) => Object.assign(n.props, { [key]: value }));
  const overlays: UiNode[] = [];
  const collect = (n: UiNode) => {
    if (['modal', 'dialog', 'nonModal', 'sidePanel', 'drawer'].includes(n.type)) overlays.push(n);
    n.children.forEach(collect);
  };
  if (pageRoot) collect(pageRoot);
  const searchTargets: UiNode[] = [];
  const collectTargets = (n: UiNode) => {
    if (n.type === 'table' || n.type === 'navbar') searchTargets.push(n);
    n.children.forEach(collectTargets);
  };
  if (pageRoot) collectTargets(pageRoot);
  return (
    <>
      {node.type === 'input' && node.props.controlType === 'search' && (
        <label>
          검색 대상
          <select
            value={node.props.searchTargetId ?? ''}
            onChange={(event) => update('searchTargetId', event.target.value || undefined)}
          >
            <option value="">연결 안 함</option>
            {searchTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name} · {target.props.text}
              </option>
            ))}
          </select>
        </label>
      )}
      {node.type === 'wizard' && (
        <p className="panel-help">
          직계 자식 컨테이너 하나가 한 단계입니다. 레이어에서 단계 이름과 순서를 바꾸고 내부에 입력
          요소를 추가하세요.
        </p>
      )}
      {['modal', 'dialog', 'nonModal'].includes(node.type) && (
        <>
          <p className="panel-help">
            부모 영역에서 현재 보이는 부분의 중앙에 표시됩니다. 편집 중에는 닫힌 창도 표시합니다.
          </p>
          {(['isOpen', 'showHeader', 'showFooter', 'closeOnBackdrop'] as const).map((key, i) =>
            key === 'closeOnBackdrop' && node.type !== 'modal' ? null : (
              <label className="check-field" key={key}>
                <input
                  type="checkbox"
                  checked={
                    node.props[key] ??
                    (key === 'showFooter' ? node.type === 'dialog' : key !== 'closeOnBackdrop')
                  }
                  onChange={(e) => update(key, e.target.checked)}
                />
                {
                  [
                    '처음부터 열기',
                    '제목과 닫기 버튼',
                    '기본 확인·취소 버튼',
                    '배경 클릭으로 닫기',
                  ][i]
                }
              </label>
            ),
          )}
        </>
      )}
      {['button', 'icon', 'iconButton', 'fab'].includes(node.type) && (
        <>
          <label>
            클릭 동작
            <select
              aria-label="클릭 동작"
              value={node.props.overlayAction?.type ?? ''}
              onChange={(e) =>
                onUpdate((n) => {
                  if (!e.target.value) delete n.props.overlayAction;
                  else
                    n.props.overlayAction = {
                      type: e.target.value as 'open' | 'close' | 'toggle',
                      targetId: n.props.overlayAction?.targetId,
                    };
                })
              }
            >
              <option value="">기본</option>
              <option value="open">창 열기</option>
              <option value="close">창 닫기</option>
              <option value="toggle">창 열기/닫기</option>
            </select>
          </label>
          {node.props.overlayAction && (
            <label>
              대상 창
              <select
                aria-label="대상 창"
                value={node.props.overlayAction.targetId ?? ''}
                onChange={(e) =>
                  update('overlayAction', {
                    ...node.props.overlayAction,
                    targetId: e.target.value || undefined,
                  })
                }
              >
                <option value="">현재 요소가 들어 있는 창</option>
                {overlays.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} · {n.props.text}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      {['image', 'fileUpload'].includes(node.type) && (
        <FileUploadControl key={node.id} node={node} />
      )}
      {node.type === 'chart' && <ChartControls node={node} onUpdate={onUpdate} />}
      {propertySchema
        .filter((p) => (p.types as readonly string[]).includes(node.type))
        .filter((p) => !(p.key === 'items' && node.type === 'navbar' && node.props.menuItems))
        .filter((p) => !(p.key === 'isOpen' && ['modal', 'dialog', 'nonModal'].includes(node.type)))
        .filter(
          (p) =>
            !(
              node.type === 'table' &&
              ['items', 'rowCount', 'columnCount'].includes(p.key) &&
              node.props.table
            ),
        )
        .filter(
          (p) =>
            p.key !== 'includeTime' ||
            node.type === 'dateRange' ||
            ['date', 'datetime-local'].includes(node.props.controlType ?? 'text'),
        )
        .filter((p) => p.key !== 'pageSize' || node.props.paginationMode === 'pagination')
        .map((p) => {
          const value = node.props[p.key];
          if (p.key === 'iconName')
            return (
              <IconPicker
                key={p.key}
                value={node.props.iconName}
                onChange={(v) => update(p.key, v)}
              />
            );
          if (p.editor === 'select' && visual.has(p.key) && 'options' in p) {
            const fallback =
              p.key === 'labelPosition' && node.type === 'checkbox'
                ? 'right'
                : p.key === 'shape' && node.type === 'progress'
                  ? 'bar'
                  : p.key === 'stateType' && node.type === 'alert'
                    ? 'info'
                    : p.options[0][0];
            const options = p.options.filter(
              ([v]) =>
                p.key !== 'shape' ||
                node.type === 'skeleton' ||
                (node.type === 'progress'
                  ? ['bar', 'circle'].includes(v)
                  : ['rounded', 'pill'].includes(v)),
            );
            return (
              <ChoiceField
                key={p.key}
                label={p.label}
                value={String(value ?? fallback)}
                options={options.map(([v, label]) => ({
                  value: v,
                  label: label.replace(/\s*\(.+\)/, ''),
                  icon: optionIcon(p.key, v),
                }))}
                onChange={(v) => update(p.key, v)}
              />
            );
          }
          if (p.key === 'href' || p.key === 'src')
            return (
              <AddressField
                key={`${node.id}-${p.key}`}
                field={p.key}
                label={p.label}
                value={String(value ?? '')}
                onCommit={(v) => update(p.key, v)}
              />
            );
          if (p.editor === 'checkbox')
            return (
              <label className="check-field" key={p.key}>
                <input
                  type="checkbox"
                  checked={Boolean(
                    value ??
                    (p.key === 'labelVisible' || (p.key === 'showHeader' && node.type === 'table')),
                  )}
                  onChange={(e) => update(p.key, e.target.checked)}
                />
                {p.label}
              </label>
            );
          if (p.editor === 'select' && 'options' in p)
            return (
              <label key={p.key}>
                {p.label}
                <select
                  aria-label={p.label}
                  value={String(
                    value ??
                      (p.key === 'includeTime' && node.props.controlType === 'datetime-local'
                        ? 'true'
                        : p.options[0][0]),
                  )}
                  onChange={(e) =>
                    update(
                      p.key,
                      p.key === 'includeTime' ? e.target.value === 'true' : e.target.value,
                    )
                  }
                >
                  {p.options.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            );
          if (p.editor === 'number') {
            const fallback =
              p.key === 'rowCount'
                ? Math.max(1, (node.props.items ?? '').split('\n').filter(Boolean).length - 1)
                : p.key === 'columnCount'
                  ? Math.max(
                      1,
                      ...(node.props.items ?? '').split('\n').map((row) => row.split('|').length),
                    )
                  : p.key === 'pageSize' && node.type === 'list'
                    ? 4
                    : 'defaultValue' in p
                      ? p.defaultValue
                      : 60;
            return (
              <label key={p.key}>
                {p.label}
                <input
                  type="number"
                  min={'min' in p ? p.min : 0}
                  max={'max' in p ? p.max : 100}
                  value={Number(value ?? fallback)}
                  onChange={(e) =>
                    update(
                      p.key,
                      Math.max(
                        'min' in p ? p.min : 0,
                        Math.min('max' in p ? p.max : 100, Number(e.target.value)),
                      ),
                    )
                  }
                />
              </label>
            );
          }
          if (p.editor === 'textarea')
            return (
              <details key={p.key} className="property-details">
                <summary>{p.label}</summary>
                <textarea
                  aria-label={p.label}
                  rows={5}
                  maxLength={5000}
                  value={String(value ?? '')}
                  onChange={(e) => update(p.key, e.target.value)}
                />
              </details>
            );
          return (
            <label key={p.key}>
              {p.label}
              <input
                maxLength={p.key === 'text' ? 5000 : 300}
                value={String(value ?? '')}
                onChange={(e) => update(p.key, e.target.value)}
              />
            </label>
          );
        })}
      {node.type === 'button' && node.props.iconName && node.props.iconName !== 'none' && (
        <>
          <ChoiceField
            label="아이콘 위치"
            value={node.props.iconPosition ?? 'start'}
            options={[
              { value: 'start', label: '글자 앞', icon: <PanelLeft size={18} /> },
              { value: 'end', label: '글자 뒤', icon: <PanelRight size={18} /> },
            ]}
            onChange={(v) => update('iconPosition', v)}
          />
          <label>
            아이콘 간격
            <input
              type="number"
              min={0}
              max={40}
              value={node.props.iconGap ?? 8}
              onChange={(e) => update('iconGap', Math.max(0, Math.min(40, Number(e.target.value))))}
            />
          </label>
        </>
      )}
      {(['textarea', 'select'].includes(node.type) ||
        (node.type === 'input' &&
          ['text', 'password', 'search', 'email', 'tel', 'url', 'number', 'otp'].includes(
            node.props.controlType ?? 'text',
          ))) && (
        <details className="property-details">
          <summary>설명·오류·입력 보조</summary>
          {(['description', 'errorText', 'prefix', 'suffix'] as const)
            .filter((key) => node.type === 'input' || ['description', 'errorText'].includes(key))
            .map((key) => (
              <label key={key}>
                {
                  {
                    description: '설명 문구',
                    errorText: '오류 문구',
                    prefix: '앞쪽 단위',
                    suffix: '뒤쪽 단위',
                  }[key]
                }
                <input
                  maxLength={['prefix', 'suffix'].includes(key) ? 30 : 300}
                  value={node.props[key] ?? ''}
                  onChange={(e) => update(key, e.target.value)}
                />
              </label>
            ))}
          {node.type === 'input' && (
            <label className="check-field">
              <input
                type="checkbox"
                checked={node.props.clearable ?? false}
                onChange={(e) => update('clearable', e.target.checked)}
              />
              지우기 버튼
            </label>
          )}
        </details>
      )}
    </>
  );
}
