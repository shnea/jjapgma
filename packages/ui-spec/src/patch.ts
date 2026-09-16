import { z } from 'zod';
import { componentTypes } from './registry.js';
import { propsSchema, styleSchema, validateSpec, type UiSpec } from './schema.js';
import { createNode, findNode, insertNode, isLocked, moveNode, removeNode } from './tree.js';
import { createTemplate } from './templates.js';
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const operationSchema = z.discriminatedUnion('op', [
  z
    .object({
      op: z.literal('add'),
      parentId: id,
      id: id,
      type: z.enum(componentTypes),
      props: propsSchema.omit({ customCss: true }).partial().optional(),
      style: styleSchema.optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal('update'),
      nodeId: id,
      props: propsSchema.omit({ customCss: true }).partial().optional(),
      style: styleSchema.optional(),
      breakpoint: z.enum(['desktop', 'tablet', 'mobile']).optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal('move'),
      nodeId: id,
      parentId: id,
      index: z.number().int().min(0).max(500).optional(),
    })
    .strict(),
  z.object({ op: z.literal('remove'), nodeId: id }).strict(),
  z
    .object({ op: z.literal('template'), parentId: id, templateId: z.string().min(1).max(60) })
    .strict(),
]);
export const patchSchema = z.array(operationSchema).min(1).max(100);
export function applyUiPatch(spec: UiSpec, input: unknown): UiSpec {
  const operations = patchSchema.parse(input);
  let next = structuredClone(spec);
  for (const op of operations) {
    if ('nodeId' in op && (!findNode(next.root, op.nodeId) || isLocked(next.root, op.nodeId)))
      throw new Error('요소를 찾을 수 없거나 잠겨 있습니다.');
    if (op.op === 'add') {
      const node = createNode(op.type, !!spec.theme);
      node.id = op.id;
      Object.assign(node.props, op.props);
      Object.assign(node.style, op.style);
      next = insertNode(next, op.parentId, node);
    } else if (op.op === 'update') {
      const node = findNode(next.root, op.nodeId)!;
      Object.assign(node.props, op.props);
      if (op.style) {
        if (op.breakpoint && op.breakpoint !== 'desktop')
          node.responsive[op.breakpoint] = { ...node.responsive[op.breakpoint], ...op.style };
        else Object.assign(node.style, op.style);
      }
    } else if (op.op === 'remove') next = removeNode(next, op.nodeId);
    else if (op.op === 'move') next = moveNode(next, op.nodeId, op.parentId, op.index);
    else next = insertNode(next, op.parentId, createTemplate(op.templateId).root);
    next = validateSpec(next);
    const preserveLocks = (n: typeof spec.root) => {
      if (n.locked && JSON.stringify(findNode(next.root, n.id)) !== JSON.stringify(n))
        throw new Error('잠긴 요소는 변경하거나 삭제할 수 없습니다.');
      n.children.forEach(preserveLocks);
    };
    preserveLocks(spec.root);
  }
  return next;
}
