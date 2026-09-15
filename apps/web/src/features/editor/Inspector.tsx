import { Copy, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import {
  effectiveStyle,
  propertySchema,
  registry,
  type UiNode,
  type NodeStyle,
  type Breakpoint,
} from '@jjapgma/ui-spec';
import { Button } from '../../components/ui/Button';
import { AddressField } from './AddressField';
import { FileUploadControl } from './files/FileAssets';
export function Inspector({
  node,
  breakpoint,
  disabled,
  root,
  onUpdate,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  node: UiNode;
  breakpoint: Breakpoint;
  disabled: boolean;
  root: boolean;
  onUpdate: (change: (node: UiNode) => void) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (direction: number) => void;
}) {
  const style = effectiveStyle(node, breakpoint);
  function changeStyle(key: keyof NodeStyle, value: string | number | boolean | undefined) {
    onUpdate((n) => {
      const target = breakpoint === 'desktop' ? n.style : (n.responsive[breakpoint] ??= {});
      if (value === undefined) delete target[key];
      else Object.assign(target, { [key]: value });
    });
  }
  function changeMobileHidden(hidden: boolean) {
    onUpdate((n) => {
      n.responsive.mobile = { hidden };
    });
  }
  return (
    <div className="inspector">
      <div className="inspector-title">
        <span>{registry[node.type].name}</span>
        <span className="spec-tag">{node.type}</span>
      </div>
      <fieldset disabled={disabled}>
        <section>
          <label>
            레이어 이름
            <input
              maxLength={100}
              value={node.name}
              onChange={(e) => {
                if (e.target.value.trim())
                  onUpdate((n) => {
                    n.name = e.target.value;
                  });
              }}
            />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={node.locked}
              onChange={(e) =>
                onUpdate((n) => {
                  n.locked = e.target.checked;
                })
              }
            />
            잠금
          </label>
        </section>
        <fieldset disabled={node.locked}>
          <section>
            <h3>내용</h3>
            {['image', 'fileUpload'].includes(node.type) && (
              <FileUploadControl key={node.id} node={node} />
            )}
            {propertySchema
              .filter((p) => (p.types as readonly string[]).includes(node.type))
              .map((property) => (
                // Keep the property catalog declarative while allowing select-only metadata.
                <label
                  key={property.key}
                  className={property.editor === 'checkbox' ? 'check-field' : ''}
                >
                  {property.editor === 'checkbox' ? (
                    <>
                      <input
                        type="checkbox"
                        checked={Boolean(node.props[property.key])}
                        onChange={(e) =>
                          onUpdate((n) => {
                            Object.assign(n.props, { [property.key]: e.target.checked });
                          })
                        }
                      />
                      {property.label}
                    </>
                  ) : property.editor === 'select' ? (
                    <>
                      {property.label}
                      <select
                        value={String(
                          node.props[property.key] ??
                            ('options' in property ? property.options[0]?.[0] : '') ??
                            '',
                        )}
                        onChange={(e) =>
                          onUpdate((n) =>
                            Object.assign(n.props, { [property.key]: e.target.value }),
                          )
                        }
                      >
                        {'options' in property &&
                          property.options.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                      </select>
                    </>
                  ) : property.key === 'href' || property.key === 'src' ? (
                    <AddressField
                      key={`${node.id}-${property.key}`}
                      field={property.key}
                      label={property.label}
                      value={node.props[property.key] ?? ''}
                      onCommit={(value) =>
                        onUpdate((n) => {
                          Object.assign(n.props, { [property.key]: value });
                        })
                      }
                    />
                  ) : property.editor === 'textarea' ? (
                    <>
                      {property.label}
                      <textarea
                        rows={5}
                        maxLength={5000}
                        value={String(node.props[property.key] ?? '')}
                        onChange={(e) =>
                          onUpdate((n) => {
                            Object.assign(n.props, { [property.key]: e.target.value });
                          })
                        }
                      />
                    </>
                  ) : property.editor === 'number' ? (
                    <>
                      {property.label}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={node.props.value ?? 60}
                        onChange={(e) =>
                          onUpdate((n) => {
                            n.props.value = Math.min(100, Math.max(0, Number(e.target.value)));
                          })
                        }
                      />
                    </>
                  ) : (
                    <>
                      {property.label}
                      <input
                        maxLength={property.key === 'text' ? 5000 : 300}
                        value={String(node.props[property.key] ?? '')}
                        onChange={(e) =>
                          onUpdate((n) => {
                            Object.assign(n.props, { [property.key]: e.target.value });
                          })
                        }
                      />
                    </>
                  )}
                </label>
              ))}
            {registry[node.type].children && (
              <p className="panel-help">안에 요소를 추가해 화면을 구성하세요.</p>
            )}
          </section>
          <section>
            <div className="property-heading">
              <h3>배치와 크기</h3>
              <span className="breakpoint-tag">
                {breakpoint === 'desktop' ? '기본' : breakpoint === 'tablet' ? '태블릿' : '모바일'}
              </span>
            </div>
            <p className="panel-help">
              {breakpoint === 'desktop'
                ? '모든 화면의 기본값입니다.'
                : '이 화면 크기에만 적용합니다.'}
            </p>
            <div className="field-grid">
              {(['width', 'height'] as const).map((key) => (
                <label key={key}>
                  {key === 'width' ? '너비' : '높이'}
                  <select
                    value={style[key] ?? 'auto'}
                    onChange={(e) => changeStyle(key, e.target.value)}
                  >
                    {['auto', '100%', '75%', '50%', '25%', '120px', '240px', '360px', '480px'].map(
                      (value) => (
                        <option key={value} value={value}>
                          {value === 'auto' ? '내용에 맞춤' : value}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ))}
            </div>
            {registry[node.type].children && (
              <>
                <label>
                  배치 방향
                  <select
                    value={style.direction ?? 'column'}
                    onChange={(e) => changeStyle('direction', e.target.value)}
                  >
                    <option value="column">세로 배치</option>
                    <option value="row">가로 배치</option>
                  </select>
                </label>
                <label>
                  스크롤
                  <select
                    value={style.overflow ?? 'visible'}
                    onChange={(e) => changeStyle('overflow', e.target.value)}
                  >
                    <option value="visible">내용에 맞춤 (기본)</option>
                    <option value="auto">넘칠 때 스크롤</option>
                    <option value="hidden">넘침 숨김</option>
                  </select>
                </label>
                <label>
                  정렬
                  <select
                    value={style.align ?? 'stretch'}
                    onChange={(e) => changeStyle('align', e.target.value)}
                  >
                    <option value="stretch">가득 채우기</option>
                    <option value="flex-start">왼쪽 / 시작</option>
                    <option value="center">가운데</option>
                    <option value="flex-end">오른쪽 / 끝</option>
                  </select>
                </label>
              </>
            )}
            <label>
              내용 정렬
              <select
                value={style.textAlign ?? 'left'}
                onChange={(e) => changeStyle('textAlign', e.target.value)}
              >
                <option value="left">왼쪽 정렬</option>
                <option value="center">가운데 정렬</option>
                <option value="right">오른쪽 정렬</option>
                <option value="justify">양끝 정렬</option>
              </select>
            </label>
            <div className="field-grid">
              {(['padding', 'gap'] as const).map((key) => (
                <label key={key}>
                  {key === 'padding' ? '안쪽 여백' : '요소 간격'}
                  <input
                    type="number"
                    min={0}
                    max={160}
                    value={style[key] ?? 0}
                    onChange={(e) =>
                      changeStyle(key, Math.max(0, Math.min(160, Number(e.target.value))))
                    }
                  />
                </label>
              ))}
            </div>
            <label className="check-field">
              <input
                type="checkbox"
                checked={style.hidden ?? false}
                onChange={(e) => changeStyle('hidden', e.target.checked)}
              />
              이 화면에서 숨기기
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={
                  Boolean(style.hidden && breakpoint === 'mobile') ||
                  Boolean(node.responsive.mobile?.hidden)
                }
                onChange={(e) => changeMobileHidden(e.target.checked)}
              />
              모바일에서 숨기기
            </label>
            {registry[node.type].children && (
              <label>
                그리드 열 수
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={style.gridColumns ?? 2}
                  onChange={(e) =>
                    changeStyle('gridColumns', Math.max(1, Math.min(12, Number(e.target.value))))
                  }
                />
              </label>
            )}
            {node.type === 'grid' && (
              <label>
                그리드 행 수
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={style.gridRows ?? 1}
                  onChange={(e) =>
                    changeStyle('gridRows', Math.max(1, Math.min(50, Number(e.target.value))))
                  }
                />
              </label>
            )}
          </section>
          <section>
            <h3>모양</h3>
            <div className="field-grid">
              <label>
                배경색
                <input
                  type="color"
                  value={
                    style.background === 'transparent' ? '#ffffff' : (style.background ?? '#ffffff')
                  }
                  onChange={(e) => changeStyle('background', e.target.value)}
                />
                <input
                  aria-label="배경색 코드"
                  value={style.background ?? '#ffffff'}
                  onChange={(e) => {
                    if (/^(#[0-9a-f]{6}|transparent)$/i.test(e.target.value))
                      changeStyle('background', e.target.value);
                  }}
                />
              </label>
              <label>
                글자색
                <input
                  type="color"
                  value={style.color === 'transparent' ? '#202520' : (style.color ?? '#202520')}
                  onChange={(e) => changeStyle('color', e.target.value)}
                />
                <input
                  aria-label="글자색 코드"
                  value={style.color ?? '#202520'}
                  onChange={(e) => {
                    if (/^(#[0-9a-f]{6}|transparent)$/i.test(e.target.value))
                      changeStyle('color', e.target.value);
                  }}
                />
              </label>
              <label>
                모서리
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={style.radius ?? 0}
                  onChange={(e) =>
                    changeStyle('radius', Math.max(0, Math.min(100, Number(e.target.value))))
                  }
                />
              </label>
              <label>
                글자 크기
                <input
                  type="number"
                  min={8}
                  max={120}
                  value={style.fontSize ?? 16}
                  onChange={(e) =>
                    changeStyle('fontSize', Math.max(8, Math.min(120, Number(e.target.value))))
                  }
                />
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <label>
                커스텀 스타일 (CSS)
                <textarea
                  placeholder="예: box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-style: dashed;"
                  value={node.props.customCss ?? ''}
                  onChange={(e) =>
                    onUpdate((n) => {
                      n.props.customCss = e.target.value;
                    })
                  }
                  rows={2}
                  style={{ width: '100%', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', marginTop: 4 }}
                />
              </label>
              <p className="panel-help">임의의 CSS 속성을 세미콜론(;)으로 구분하여 추가할 수 있습니다.</p>
            </div>
            {breakpoint !== 'desktop' && (
              <Button
                variant="ghost"
                onClick={() =>
                  onUpdate((n) => {
                    delete n.responsive[breakpoint];
                  })
                }
              >
                <RotateCcw size={13} />이 화면 설정 초기화
              </Button>
            )}
          </section>
          {!root && (
            <section className="node-actions">
              <Button variant="secondary" onClick={onDuplicate}>
                <Copy size={14} />
                복제
              </Button>
              <Button variant="danger" onClick={onDelete}>
                <Trash2 size={14} />
                삭제
              </Button>
              <Button variant="ghost" aria-label="위로 이동" onClick={() => onReorder(-1)}>
                <ArrowUp size={15} />
              </Button>
              <Button variant="ghost" aria-label="아래로 이동" onClick={() => onReorder(1)}>
                <ArrowDown size={15} />
              </Button>
            </section>
          )}
        </fieldset>
      </fieldset>
    </div>
  );
}
