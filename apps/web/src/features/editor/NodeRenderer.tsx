import type { CSSProperties } from 'react';
import { effectiveStyle, registry, type Breakpoint, type UiNode } from '@jjapgma/ui-spec';
export function NodeRenderer({
  node,
  breakpoint,
  selectedId,
  onSelect,
  onDrop,
  preview = false,
}: {
  node: UiNode;
  breakpoint: Breakpoint;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onDrop?: (id: string, data: string) => void;
  preview?: boolean;
}) {
  const value = effectiveStyle(node, breakpoint);
  const container = registry[node.type].children;
  const style: CSSProperties = {
    width: value.width,
    height: value.height,
    padding: value.padding,
    gap: value.gap,
    borderRadius: value.radius,
    fontSize: value.fontSize,
    background: value.background,
    color: value.color,
    flexDirection: value.direction,
    alignItems: value.align,
    justifyContent: value.justify,
    ...(container ? { display: 'flex' } : {}),
    ...(value.hidden ? { display: preview ? 'none' : undefined, opacity: 0.3 } : {}),
  };
  let content: React.ReactNode;
  switch (node.type) {
    case 'heading':
      content = <h2>{node.props.text}</h2>;
      break;
    case 'text':
      content = <p>{node.props.text}</p>;
      break;
    case 'button':
      content = (
        <button type="button" disabled={node.props.disabled}>
          {node.props.text}
        </button>
      );
      break;
    case 'input':
      content = (
        <label>
          {node.props.text}
          {node.props.required && ' *'}
          <input
            placeholder={node.props.placeholder}
            required={node.props.required}
            disabled={node.props.disabled}
          />
        </label>
      );
      break;
    case 'textarea':
      content = (
        <label>
          {node.props.text}
          {node.props.required && ' *'}
          <textarea
            placeholder={node.props.placeholder}
            required={node.props.required}
            disabled={node.props.disabled}
          />
        </label>
      );
      break;
    case 'checkbox':
      content = (
        <label className="render-checkbox">
          <input type="checkbox" required={node.props.required} disabled={node.props.disabled} />
          {node.props.text}
        </label>
      );
      break;
    case 'divider':
      content = <hr />;
      break;
    default:
      content = node.children.length ? (
        node.children.map((child) => (
          <NodeRenderer
            key={child.id}
            node={child}
            breakpoint={breakpoint}
            selectedId={selectedId}
            onSelect={onSelect}
            onDrop={onDrop}
            preview={preview}
          />
        ))
      ) : !preview ? (
        <span className="drop-hint">요소를 여기로 끌어오세요</span>
      ) : null;
  }
  return (
    <div
      data-node-id={node.id}
      data-testid={`node-${node.type}`}
      className={`render-node render-${node.type} ${selectedId === node.id && !preview ? 'node-selected' : ''}`}
      style={style}
      onClick={
        preview
          ? undefined
          : (event) => {
              event.stopPropagation();
              onSelect?.(node.id);
            }
      }
      onDragOver={
        preview
          ? undefined
          : (event) => {
              if (container) {
                event.preventDefault();
                event.stopPropagation();
              }
            }
      }
      onDrop={
        preview
          ? undefined
          : (event) => {
              if (container) {
                event.preventDefault();
                event.stopPropagation();
                onDrop?.(node.id, event.dataTransfer.getData('application/jjapgma'));
              }
            }
      }
    >
      {selectedId === node.id && !preview && <span className="node-label">{node.name}</span>}
      {container || preview ? (
        content
      ) : (
        <div
          className="render-content"
          inert={!preview && ['button', 'input', 'textarea', 'checkbox'].includes(node.type)}
        >
          {content}
        </div>
      )}
    </div>
  );
}
