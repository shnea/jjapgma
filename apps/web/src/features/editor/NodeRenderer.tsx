import { useContext, useState, type CSSProperties, type DragEvent } from 'react';
import { OverlayContext, OverlayProvider, ScopedOverlay, OverlayChrome } from './ScopedOverlay';
import { GripVertical } from 'lucide-react';
import { effectiveStyle, registry, type Breakpoint, type UiNode } from '@jjapgma/ui-spec';
import { ElementContent } from './elements/ElementContent';
import type { PageTheme } from '@jjapgma/ui-spec';
import { themeStyle, resolveColor } from './themeStyle';
import { useControlRowAlignment } from './useControlRowAlignment';
import { SidePanel } from './SidePanel';
import { Carousel } from './Carousel';
import { Wizard } from './Wizard';
import { GridControls } from './GridControls';

const builderDragTypes = (types: DOMStringList | readonly string[]) =>
  Array.from(types).some((type) => type === 'application/jjapgma' || type === 'text/plain');
const builderDragData = (dataTransfer: DataTransfer) =>
  dataTransfer.getData('application/jjapgma') || dataTransfer.getData('text/plain');

function RenderNode({
  node,
  breakpoint,
  selectedId,
  onSelect,
  onDrop,
  onResize,
  onGridResize,
  preview = false,
  root = false,
  ancestorLocked = false,
  horizontal = false,
  theme,
}: {
  node: UiNode;
  breakpoint: Breakpoint;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onDrop?: (id: string, data: string, position?: 'before' | 'inside' | 'after') => void;
  onResize?: (id: string, width: number, height: number) => void;
  onGridResize?: (id: string, columns: number, rows: number) => void;
  preview?: boolean;
  root?: boolean;
  ancestorLocked?: boolean;
  horizontal?: boolean;
  theme?: PageTheme;
}) {
  const [dropPosition, setDropPosition] = useState<'before' | 'inside' | 'after' | undefined>();
  const container = Boolean(registry[node.type].children);
  const value = effectiveStyle(node, breakpoint);
  const locked = ancestorLocked || node.locked;
  const controlRow = useControlRowAlignment(
    container &&
      node.type !== 'grid' &&
      value.direction === 'row' &&
      value.controlAlignment !== 'layout',
    node,
    breakpoint,
  );

  function position(event: DragEvent<HTMLDivElement>): 'before' | 'inside' | 'after' {
    if (root) return 'inside';
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = horizontal
      ? (event.clientX - bounds.left) / bounds.width
      : (event.clientY - bounds.top) / bounds.height;
    if (container && fraction > 0.22 && fraction < 0.78) return 'inside';
    return fraction < 0.5 ? 'before' : 'after';
  }
  function parseCustomCss(cssStr?: string): CSSProperties {
    if (!cssStr) return {};
    const custom: Record<string, string> = {};
    cssStr.split(';').forEach((statement) => {
      const [key, ...values] = statement.split(':');
      if (key && values.length) {
        const camelKey = key.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        custom[camelKey] = values.join(':').trim();
      }
    });
    return custom as CSSProperties;
  }
  const style: CSSProperties = {
    width:
      value.alignSelf === 'stretch' && (!value.width || value.width === 'auto')
        ? 'auto'
        : value.width,
    height:
      value.height === '100dvh' || value.height === '100vh'
        ? 'var(--page-viewport-height, 100dvh)'
        : value.height,
    minWidth: value.minWidth,
    maxWidth: value.maxWidth,
    minHeight:
      value.minHeight === '100dvh' ||
      value.minHeight === '100vh' ||
      (root && value.minHeight === undefined)
        ? 'var(--page-viewport-height, 100dvh)'
        : value.minHeight,
    maxHeight: value.maxHeight,
    flexGrow: value.grow ? 1 : undefined,
    flexBasis: value.grow ? 0 : undefined,
    flexShrink: value.shrink === false ? 0 : undefined,
    position: value.sticky ? 'sticky' : undefined,
    top: value.sticky ? 0 : undefined,
    zIndex: value.sticky ? 5 : undefined,
    padding: value.padding,
    gap: value.gap,
    borderRadius: value.radius,
    fontSize: value.fontSize,
    fontWeight: value.fontWeight,
    lineHeight: value.lineHeight,
    alignSelf: value.alignSelf === 'auto' ? undefined : value.alignSelf,
    justifySelf: value.justifySelf,
    flexWrap: value.wrap ? 'wrap' : undefined,
    paddingTop: value.paddingTop,
    paddingRight: value.paddingRight,
    paddingBottom: value.paddingBottom,
    paddingLeft: value.paddingLeft,
    marginTop: value.pushEnd && !horizontal ? 'auto' : value.marginTop,
    marginRight: value.marginRight,
    marginBottom: value.marginBottom,
    marginLeft: value.pushEnd && horizontal ? 'auto' : value.marginLeft,
    borderTopLeftRadius: value.radiusTopLeft,
    borderTopRightRadius: value.radiusTopRight,
    borderBottomLeftRadius: value.radiusBottomLeft,
    borderBottomRightRadius: value.radiusBottomRight,
    borderWidth: value.borderWidth,
    borderStyle: value.borderWidth ? 'solid' : undefined,
    borderColor: resolveColor(value.borderColor),
    boxShadow: value.shadow
      ? {
          none: 'none',
          small: '0 2px 6px #00000014',
          medium: '0 6px 18px #00000020',
          large: '0 12px 32px #00000028',
        }[value.shadow]
      : undefined,
    opacity: value.opacity,
    background: resolveColor(value.background),
    color: resolveColor(value.color),
    flexDirection: value.direction,
    alignItems: value.align,
    justifyContent: value.justify,
    textAlign: value.textAlign,
    overflow: value.overflow,
    overflowX: value.overflowX,
    overflowY: value.overflowY,
    ...(container ? { display: 'flex' } : {}),
    ...(node.type === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${value.gridColumns ?? 2}, minmax(0, 1fr))`,
          gridTemplateRows: value.gridRows
            ? `repeat(${value.gridRows}, minmax(0, auto))`
            : undefined,
        }
      : {}),
    ...(value.hidden ? { ...(preview ? { display: 'none' } : {}), opacity: 0.3 } : {}),
    ...({
      '--element-font-size': value.fontSize ? `${value.fontSize}px` : undefined,
      '--element-font-weight': value.fontWeight,
      '--element-line-height': value.lineHeight,
      '--element-object-fit': value.objectFit ?? 'cover',
      '--element-object-position': value.objectPosition ?? 'center',
      ...(node.type === 'button'
        ? {
            '--button-height': value.height && value.height !== 'auto' ? value.height : undefined,
            '--button-font-size': `${value.fontSize ?? 14}px`,
            '--button-font-weight': value.fontWeight,
            '--button-line-height': value.lineHeight ?? 1,
            '--button-gap': `${node.props.iconGap ?? 8}px`,
            '--button-padding': `${value.paddingTop ?? value.padding ?? 0}px ${value.paddingRight ?? value.padding ?? 16}px ${value.paddingBottom ?? value.padding ?? 0}px ${value.paddingLeft ?? value.padding ?? 16}px`,
            '--button-radius': `${value.radiusTopLeft ?? value.radius ?? theme?.radius ?? 6}px ${value.radiusTopRight ?? value.radius ?? theme?.radius ?? 6}px ${value.radiusBottomRight ?? value.radius ?? theme?.radius ?? 6}px ${value.radiusBottomLeft ?? value.radius ?? theme?.radius ?? 6}px`,
            '--button-background': resolveColor(value.background),
            '--button-color': resolveColor(value.color),
            '--button-border-width':
              value.borderWidth === undefined ? undefined : `${value.borderWidth}px`,
            '--button-border-color': resolveColor(value.borderColor),
            padding: 0,
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            background: 'transparent',
            borderWidth: 0,
          }
        : {}),
    } as CSSProperties),
    ...parseCustomCss(node.props.customCss),
  };
  const themedStyle = {
    ...themeStyle(theme, node, value, root),
    ...Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined)),
  };

  const innerContent = container ? (
    node.children.length ? (
      node.children.map((child) => (
        <NodeRenderer
          key={child.id}
          node={child}
          theme={theme}
          breakpoint={breakpoint}
          selectedId={selectedId}
          onSelect={onSelect}
          onDrop={onDrop}
          onResize={onResize}
          onGridResize={onGridResize}
          preview={preview}
          root={false}
          ancestorLocked={locked}
          horizontal={value.direction === 'row'}
        />
      ))
    ) : !preview ? (
      <span className="drop-hint">요소를 여기로 끌어오세요</span>
    ) : null
  ) : (
    <ElementContent node={node} breakpoint={breakpoint} />
  );

  const overlay = ['modal', 'dialog', 'nonModal', 'drawer'].includes(node.type);
  const content =
    node.type === 'wizard' ? (
      <Wizard key={node.id} node={node} preview={preview} selectedId={selectedId}>
        {innerContent}
      </Wizard>
    ) : node.type === 'carousel' ? (
      <Carousel node={node} preview={preview} selectedId={selectedId}>
        {innerContent}
      </Carousel>
    ) : overlay && node.type !== 'drawer' ? (
      <OverlayChrome
        node={node}
        breakpoint={breakpoint}
        preview={preview}
        contentStyle={{
          display: 'flex',
          flexDirection: value.direction ?? 'column',
          gap: themedStyle.gap,
          padding: themedStyle.padding,
          paddingTop: value.paddingTop,
          paddingRight: value.paddingRight,
          paddingBottom: value.paddingBottom,
          paddingLeft: value.paddingLeft,
          flexWrap: value.wrap ? 'wrap' : undefined,
          alignItems: value.align,
          justifyContent: value.justify,
        }}
      >
        {innerContent}
      </OverlayChrome>
    ) : (
      innerContent
    );
  const rendered = (
    <div
      ref={controlRow}
      data-node-id={node.id}
      data-collapse-visibility={node.props.collapseVisibility}
      data-page-root={root ? 'true' : undefined}
      data-carousel-fixed-height={
        node.type === 'carousel' && value.height && value.height !== 'auto' ? 'true' : undefined
      }
      data-image-fixed-height={
        node.type === 'image' && value.height && value.height !== 'auto' ? 'true' : undefined
      }
      data-self-stretch={value.alignSelf === 'stretch' ? 'true' : undefined}
      data-overflow-x={value.overflowX ?? value.overflow}
      data-page-theme={(root || overlay) && theme ? 'true' : undefined}
      data-testid={`node-${node.type}`}
      data-drop-position={dropPosition}
      data-drop-axis={horizontal ? 'horizontal' : 'vertical'}
      data-preview={preview ? 'true' : undefined}
      draggable={!preview && !!onDrop && !root && !locked}
      onDragStart={(event) => {
        if (preview || !onDrop || root || locked) return;
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        const data = JSON.stringify({ id: node.id });
        event.dataTransfer.setData('application/jjapgma', data);
        event.dataTransfer.setData('text/plain', data);
      }}
      onDragEnd={() => setDropPosition(undefined)}
      className={`render-node render-${node.type} ${value.width === undefined || value.width === 'auto' ? 'render-size-auto' : 'render-size-fixed'} ${preview ? 'preview-mode' : ''} ${selectedId === node.id && !preview ? 'node-selected' : ''}`}
      style={
        node.type === 'drawer'
          ? { ...themedStyle, width: '100%', flexShrink: 0 }
          : overlay
            ? {
                ...themedStyle,
                padding: 0,
                paddingTop: 0,
                paddingRight: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                gap: 0,
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                maxWidth: '100%',
                maxHeight: '100%',
                margin: 0,
                flexShrink: 1,
                overflow: 'hidden',
              }
            : node.type === 'sidePanel'
              ? {
                  ...themedStyle,
                  width: '100%',
                  height: '100%',
                  minHeight: 0,
                  boxSizing: 'border-box',
                }
              : themedStyle
      }
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
              if (onDrop && builderDragTypes(event.dataTransfer.types)) {
                event.stopPropagation();
                if (locked) return;
                event.preventDefault();
                setDropPosition(position(event));
              }
            }
      }
      onDrop={
        preview
          ? undefined
          : (event) => {
              setDropPosition(undefined);
              if (onDrop && builderDragTypes(event.dataTransfer.types)) {
                event.stopPropagation();
                if (locked) return;
                event.preventDefault();
                onDrop(node.id, builderDragData(event.dataTransfer), position(event));
              }
            }
      }
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDropPosition(undefined);
      }}
    >
      {selectedId === node.id && !preview && (
        <span className="node-label">
          {!root && !locked && (
            <GripVertical
              size={11}
              style={{ marginRight: 3, verticalAlign: 'middle', cursor: 'grab' }}
            />
          )}
          {node.name}
        </span>
      )}
      {node.type === 'grid' && selectedId === node.id && !preview && !locked && onGridResize && (
        <GridControls node={node} onResize={onGridResize} />
      )}
      {container || preview ? (
        content
      ) : (
        <div
          className="render-content"
          style={{
            pointerEvents: preview ? 'auto' : 'none',
            width: '100%',
            ...(node.type === 'chat' ? { height: '100%' } : {}),
          }}
        >
          {content}
        </div>
      )}
      {selectedId === node.id && !preview && !root && !locked && onResize && (
        <span
          className="resize-handle resize-handle-se"
          role="button"
          aria-label="크기 조절"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const startX = event.clientX;
            const startY = event.clientY;
            const bounds = event.currentTarget.parentElement!.getBoundingClientRect();
            const move = (moveEvent: PointerEvent) => {
              void moveEvent;
            };
            const up = (upEvent: PointerEvent) => {
              const width = Math.max(40, Math.round(bounds.width + upEvent.clientX - startX));
              const height = Math.max(28, Math.round(bounds.height + upEvent.clientY - startY));
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', up);
              onResize(node.id, width, height);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up, { once: true });
          }}
        />
      )}
    </div>
  );

  return node.type === 'sidePanel' ? (
    <SidePanel node={node} breakpoint={breakpoint} preview={preview}>
      {rendered}
    </SidePanel>
  ) : overlay ? (
    <ScopedOverlay node={node} preview={preview} hidden={!!value.hidden}>
      {rendered}
    </ScopedOverlay>
  ) : (
    rendered
  );
}

export function NodeRenderer(props: Parameters<typeof RenderNode>[0]) {
  const runtime = useContext(OverlayContext);
  return runtime ? (
    <RenderNode {...props} />
  ) : (
    <OverlayProvider>
      <RenderNode {...props} />
    </OverlayProvider>
  );
}
