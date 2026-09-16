import { z } from 'zod';
import { componentTypes, registry, type ComponentType } from './registry.js';
import { themeSchema, type PageTheme } from './theme.js';
import { tableSchema } from './table.js';
export const breakpoints = ['desktop', 'tablet', 'mobile'] as const;
export type Breakpoint = (typeof breakpoints)[number];
const color = z
  .string()
  .regex(
    /^(#[0-9a-fA-F]{6}|transparent|theme:(primary|onPrimary|background|surface|text|muted|border))$/,
  );
const dimension = z.string().regex(/^(auto|100dvh|100vh|100%|[0-9]{1,4}(px|%))$/);
const safeHref = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      v === '' ||
      /^#[\w-]*$/.test(v) ||
      /^\/(?!\/)[^\\\s]*$/.test(v) ||
      /^https?:\/\/[^\s]+$/.test(v),
  );
const menuItemBase = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    label: z.string().max(120),
    icon: z.string().max(60).optional(),
    href: safeHref.optional(),
    badge: z.string().max(20).optional(),
    disabled: z.boolean().optional(),
    hiddenOnMobile: z.boolean().optional(),
    kind: z.enum(['item', 'group', 'divider']).optional(),
  })
  .strict();
const secondLevelMenu = menuItemBase.extend({
  children: z.array(menuItemBase).max(30).optional(),
});
export const menuItemSchema = menuItemBase.extend({
  children: z.array(secondLevelMenu).max(30).optional(),
});
export type MenuItem = z.infer<typeof menuItemBase> & { children?: MenuItem[] };
export const styleSchema = z
  .object({
    width: dimension.optional(),
    height: dimension.optional(),
    minWidth: dimension.optional(),
    maxWidth: dimension.optional(),
    minHeight: dimension.optional(),
    maxHeight: dimension.optional(),
    grow: z.boolean().optional(),
    shrink: z.boolean().optional(),
    sticky: z.boolean().optional(),
    padding: z.number().int().min(0).max(160).optional(),
    gap: z.number().int().min(0).max(160).optional(),
    radius: z.number().int().min(0).max(100).optional(),
    fontSize: z.number().int().min(8).max(120).optional(),
    background: color.optional(),
    color: color.optional(),
    direction: z.enum(['row', 'column']).optional(),
    align: z.enum(['stretch', 'flex-start', 'center', 'flex-end']).optional(),
    controlAlignment: z.enum(['input', 'layout']).optional(),
    justify: z.enum(['flex-start', 'center', 'flex-end', 'space-between']).optional(),
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    gridColumns: z.number().int().min(1).max(12).optional(),
    gridRows: z.number().int().min(1).max(50).optional(),
    overflow: z.enum(['visible', 'auto', 'hidden']).optional(),
    overflowX: z.enum(['visible', 'auto', 'scroll', 'hidden']).optional(),
    overflowY: z.enum(['visible', 'auto', 'scroll', 'hidden']).optional(),
    hidden: z.boolean().optional(),
    alignSelf: z.enum(['auto', 'stretch', 'flex-start', 'center', 'flex-end']).optional(),
    justifySelf: z.enum(['auto', 'start', 'center', 'end', 'stretch']).optional(),
    pushEnd: z.boolean().optional(),
    wrap: z.boolean().optional(),
    paddingTop: z.number().int().min(0).max(160).optional(),
    paddingRight: z.number().int().min(0).max(160).optional(),
    paddingBottom: z.number().int().min(0).max(160).optional(),
    paddingLeft: z.number().int().min(0).max(160).optional(),
    marginTop: z.number().int().min(0).max(160).optional(),
    marginRight: z.number().int().min(0).max(160).optional(),
    marginBottom: z.number().int().min(0).max(160).optional(),
    marginLeft: z.number().int().min(0).max(160).optional(),
    radiusTopLeft: z.number().int().min(0).max(100).optional(),
    radiusTopRight: z.number().int().min(0).max(100).optional(),
    radiusBottomRight: z.number().int().min(0).max(100).optional(),
    radiusBottomLeft: z.number().int().min(0).max(100).optional(),
    fontWeight: z.enum(['400', '500', '600', '700']).optional(),
    lineHeight: z.number().min(1).max(3).optional(),
    borderWidth: z.number().int().min(0).max(12).optional(),
    borderColor: color.optional(),
    shadow: z.enum(['none', 'small', 'medium', 'large']).optional(),
    opacity: z.number().min(0).max(1).optional(),
    objectFit: z.enum(['cover', 'contain']).optional(),
    objectPosition: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
  })
  .strict();
export type NodeStyle = z.infer<typeof styleSchema>;
export const propsSchema = z
  .object({
    text: z.string().max(5000),
    chartVariant: z.enum(['bar', 'line', 'donut', 'area', 'horizontalBar']).optional(),
    chartData: z
      .array(
        z.object({ label: z.string().max(80), value: z.number().min(0).max(1000000000) }).strict(),
      )
      .max(24)
      .optional(),
    chartUnit: z.string().max(20).optional(),
    wizardCompletionText: z.string().max(500).optional(),
    panelSide: z.enum(['left', 'right']).optional(),
    panelMode: z.enum(['fixed', 'collapsible']).optional(),
    collapseMode: z.enum(['rail', 'hidden']).optional(),
    collapsedWidth: z.number().int().min(40).max(120).optional(),
    defaultCollapsed: z.boolean().optional(),
    mobileDrawer: z.boolean().optional(),
    mobileTrigger: z.enum(['auto', 'external']).optional(),
    drawerScope: z.enum(['parent', 'page']).optional(),
    collapseVisibility: z.enum(['always', 'expanded', 'collapsed']).optional(),
    menuItems: z.array(menuItemSchema).max(100).optional(),
    activeMenuId: z.string().max(80).optional(),
    searchTargetId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,80}$/)
      .optional(),
    mobileSearch: z.enum(['input', 'icon']).optional(),
    searchAlign: z.enum(['left', 'center', 'right']).optional(),
    searchWidth: z.number().int().min(120).max(800).optional(),
    carouselLoop: z.boolean().optional(),
    carouselAutoplay: z.boolean().optional(),
    carouselInterval: z.number().int().min(2000).max(30000).optional(),
    carouselArrows: z.boolean().optional(),
    carouselDots: z.boolean().optional(),
    carouselCounter: z.boolean().optional(),
    carouselVariant: z.enum(['controls', 'arrows', 'regions']).optional(),
    carouselSizing: z.enum(['ratio', 'fixed']).optional(),
    carouselRatio: z.enum(['16/9', '4/3', '1/1', '21/9']).optional(),
    carouselHeight: z.number().int().min(80).max(1600).optional(),
    carouselFit: z.enum(['cover', 'contain']).optional(),
    table: tableSchema.optional(),
    chatMessages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().max(6000),
            time: z.string().max(40).optional(),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    chatLoading: z.boolean().optional(),
    showTimestamps: z.boolean().optional(),
    iconPosition: z.enum(['start', 'end']).optional(),
    iconGap: z.number().int().min(0).max(40).optional(),
    description: z.string().max(300).optional(),
    errorText: z.string().max(300).optional(),
    prefix: z.string().max(30).optional(),
    suffix: z.string().max(30).optional(),
    clearable: z.boolean().optional(),
    placeholder: z.string().max(300).optional(),
    required: z.boolean().optional(),
    disabled: z.boolean().optional(),
    labelVisible: z.boolean().optional(),
    labelPosition: z.enum(['top', 'left', 'right']).optional(),
    optionDirection: z.enum(['row', 'column']).optional(),
    optionAlign: z.enum(['left', 'center', 'right']).optional(),
    controlType: z
      .enum([
        'text',
        'password',
        'number',
        'search',
        'email',
        'tel',
        'url',
        'date',
        'time',
        'datetime-local',
        'color',
        'range',
        'otp',
      ])
      .optional(),
    multiple: z.boolean().optional(),
    shape: z.enum(['rounded', 'pill', 'bar', 'circle', 'lines', 'card']).optional(),
    stateType: z.enum(['empty', 'error', 'success', 'info', 'warning']).optional(),
    variant: z.enum(['default', 'outline', 'ghost', 'icon', 'fab']).optional(),
    titleLevel: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']).optional(),
    iconName: z.string().max(60).optional(),
    isOpen: z.boolean().optional(),
    showFooter: z.boolean().optional(),
    closeOnBackdrop: z.boolean().optional(),
    overlayAction: z
      .object({
        type: z.enum(['open', 'close', 'toggle']),
        targetId: z
          .string()
          .regex(/^[a-zA-Z0-9_-]{1,80}$/)
          .optional(),
      })
      .strict()
      .optional(),
    customCss: z.string().max(2000).optional(),
    value: z.number().min(0).max(100).optional(),
    items: z.string().max(5000).optional(),
    showHeader: z.boolean().optional(),
    rowCount: z.number().int().min(1).max(200).optional(),
    columnCount: z.number().int().min(1).max(24).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    pageCount: z.number().int().min(1).max(10000).optional(),
    includeTime: z.boolean().optional(),
    paginationMode: z.enum(['none', 'pagination', 'infinite']).optional(),
    paginationDesign: z.enum(['numbered', 'compact', 'simple']).optional(),
    attachment: z
      .object({
        fileId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
        name: z.string().min(1).max(200),
        mimeType: z.string().min(1).max(100),
      })
      .strict()
      .optional(),
    href: z
      .string()
      .max(2000)
      .refine(
        (value) =>
          value === '' ||
          /^#[\w-]*$/.test(value) ||
          /^\/(?!\/)[^\\\s]*$/.test(value) ||
          /^https?:\/\/[^\s]+$/.test(value),
      )
      .optional(),
    src: z
      .string()
      .max(2000)
      .refine((value) => value === '' || /^\/(?!\/)[^\\\s]*$/.test(value))
      .optional(),
  })
  .strict();
export type UiNode = {
  id: string;
  type: ComponentType;
  name: string;
  locked: boolean;
  props: z.infer<typeof propsSchema>;
  style: NodeStyle;
  responsive: Partial<Record<Breakpoint, NodeStyle>>;
  children: UiNode[];
};
const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const nodeSchema: z.ZodType<UiNode> = z.lazy(() =>
  z
    .object({
      id: idSchema,
      type: z.enum(componentTypes as [ComponentType, ...ComponentType[]]),
      name: z.string().min(1).max(100),
      locked: z.boolean(),
      props: propsSchema,
      style: styleSchema,
      responsive: z
        .object({
          desktop: styleSchema.optional(),
          tablet: styleSchema.optional(),
          mobile: styleSchema.optional(),
        })
        .strict(),
      children: z.array(nodeSchema).max(500),
    })
    .strict(),
);
export type UiSpec = { schemaVersion: 1; root: UiNode; theme?: PageTheme };
export function validateSpec(input: unknown): UiSpec {
  // Bound traversal before recursive schema parsing, including malformed/cyclic input.
  const queue: { node: unknown; depth: number }[] = [{ node: (input as UiSpec)?.root, depth: 0 }];
  const seen = new Set<unknown>();
  while (queue.length) {
    const { node, depth } = queue.pop()!;
    if (!node || typeof node !== 'object' || depth > 40 || seen.has(node) || seen.size >= 2000)
      throw new Error('화면 구조가 잘못되었거나 최대 크기를 초과했습니다.');
    seen.add(node);
    const children = (node as UiNode).children;
    if (!Array.isArray(children)) throw new Error('하위 요소가 잘못되었습니다.');
    queue.push(...children.map((child) => ({ node: child, depth: depth + 1 })));
  }
  const spec = z
    .object({ schemaVersion: z.literal(1), root: nodeSchema, theme: themeSchema.optional() })
    .strict()
    .parse(input);
  if (spec.root.type !== 'container') throw new Error('화면의 최상위 요소는 영역이어야 합니다.');
  const ids = new Set<string>();
  function visit(node: UiNode) {
    if (ids.has(node.id)) throw new Error('중복된 요소 ID입니다.');
    ids.add(node.id);
    if (!registry[node.type].children && node.children.length)
      throw new Error('이 요소에는 하위 요소를 넣을 수 없습니다.');
    node.children.forEach(visit);
  }
  visit(spec.root);
  return spec;
}
