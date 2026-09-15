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
            {propertySchema
              .filter((p) => (p.types as readonly string[]).includes(node.type))
              .map((property) => (
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
                  정렬
                  <select
                    value={style.align ?? 'stretch'}
                    onChange={(e) => changeStyle('align', e.target.value)}
                  >
                    <option value="stretch">가득 채우기</option>
                    <option value="flex-start">시작</option>
                    <option value="center">가운데</option>
                    <option value="flex-end">끝</option>
                  </select>
                </label>
              </>
            )}
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
              </label>
              <label>
                글자색
                <input
                  type="color"
                  value={style.color === 'transparent' ? '#202520' : (style.color ?? '#202520')}
                  onChange={(e) => changeStyle('color', e.target.value)}
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
