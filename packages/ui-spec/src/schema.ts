import { z } from 'zod';
import { componentTypes, registry, type ComponentType } from './registry.js';
export const breakpoints = ['desktop', 'tablet', 'mobile'] as const;
export type Breakpoint = (typeof breakpoints)[number];
const color = z.string().regex(/^(#[0-9a-fA-F]{6}|transparent)$/);
const dimension = z.string().regex(/^(auto|100%|[0-9]{1,4}(px|%))$/);
export const styleSchema = z
  .object({
    width: dimension.optional(),
    height: dimension.optional(),
    padding: z.number().int().min(0).max(160).optional(),
    gap: z.number().int().min(0).max(160).optional(),
    radius: z.number().int().min(0).max(100).optional(),
    fontSize: z.number().int().min(8).max(120).optional(),
    background: color.optional(),
    color: color.optional(),
    direction: z.enum(['row', 'column']).optional(),
    align: z.enum(['stretch', 'flex-start', 'center', 'flex-end']).optional(),
    justify: z.enum(['flex-start', 'center', 'flex-end', 'space-between']).optional(),
    hidden: z.boolean().optional(),
  })
  .strict();
export type NodeStyle = z.infer<typeof styleSchema>;
const propsSchema = z
  .object({
    text: z.string().max(5000),
    placeholder: z.string().max(300).optional(),
    required: z.boolean().optional(),
    disabled: z.boolean().optional(),
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
export type UiSpec = { schemaVersion: 1; root: UiNode };
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
    .object({ schemaVersion: z.literal(1), root: nodeSchema })
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
