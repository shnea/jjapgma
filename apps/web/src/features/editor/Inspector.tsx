import { Copy, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import {
  registry,
  effectiveStyle,
  mergeCss,
  type UiNode,
  type Breakpoint,
  type PageTheme,
} from '@jjapgma/ui-spec';
import { Button } from '../../components/ui/Button';
import { ContentFields } from './controls/ContentFields';
import { TableEditor } from './controls/TableEditor';
import { StyleControls } from './controls/StyleControls';
import { ChatControls } from './controls/ChatControls';
import { MainLayoutControls } from './controls/MainLayoutControls';
export function Inspector({
  node,
  parent,
  pageRoot,
  theme,
  breakpoint,
  disabled,
  root,
  onUpdate,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  node: UiNode;
  parent?: UiNode;
  pageRoot?: UiNode;
  theme?: PageTheme;
  breakpoint: Breakpoint;
  disabled: boolean;
  root: boolean;
  onUpdate: (change: (node: UiNode) => void) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (direction: number) => void;
}) {
  return (
    <div className="inspector">
      <div className="inspector-title">
        <span>{registry[node.type].name}</span>
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
            <ContentFields node={node} pageRoot={pageRoot} onUpdate={onUpdate} />
            <MainLayoutControls node={node} pageRoot={pageRoot} onUpdate={onUpdate} />
            {node.type === 'chat' && <ChatControls node={node} onUpdate={onUpdate} />}
            {node.type === 'table' && (
              <TableEditor
                key={node.id}
                node={node}
                onUpdate={onUpdate}
                disabled={disabled || node.locked}
              />
            )}
            {registry[node.type].children && (
              <p className="panel-help">안에 요소를 추가해 화면을 구성하세요.</p>
            )}
          </section>
          <StyleControls
            key={`${node.id}-${breakpoint}`}
            node={node}
            parent={parent}
            theme={theme}
            breakpoint={breakpoint}
            root={root}
            onUpdate={onUpdate}
          />
          <section>
            <details className="property-details">
              <summary>고급 스타일</summary>
              {Object.entries(effectiveStyle(node, breakpoint).css ?? {}).map(
                ([property, value]) => (
                  <label key={property}>
                    CSS {property}
                    <input
                      value={
                        typeof value === 'number' && !CSS.supports(property, String(value))
                          ? `${value}px`
                          : String(value)
                      }
                      onChange={(event) =>
                        onUpdate((n) => {
                          const target =
                            breakpoint === 'desktop' ? n.style : (n.responsive[breakpoint] ??= {});
                          target.css = mergeCss(target.css, { [property]: event.target.value });
                        })
                      }
                    />
                  </label>
                ),
              )}
              <label>
                커스텀 스타일 (CSS)
                <textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="예: border-style: dashed;"
                  value={node.props.customCss ?? ''}
                  onChange={(e) =>
                    onUpdate((n) => {
                      n.props.customCss = e.target.value;
                    })
                  }
                />
              </label>
            </details>
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
