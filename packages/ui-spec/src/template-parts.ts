import { createNode } from './tree.js';
import type { ComponentType } from './registry.js';
import type { NodeStyle, UiNode } from './schema.js';

export function element(
  type: ComponentType,
  text = '',
  style: NodeStyle = {},
  props: Partial<UiNode['props']> = {},
): UiNode {
  const node = createNode(type);
  node.style = { ...style };
  node.props = { ...node.props, ...(text ? { text } : {}), ...props };
  return node;
}
export function group(
  type: 'container' | 'grid' | 'card',
  children: UiNode[],
  style: NodeStyle = {},
): UiNode {
  const node = element(type, '', { direction: 'column', ...style });
  node.children = children;
  if (type === 'grid') node.responsive.mobile = { gridColumns: 1 };
  if (style.direction === 'row') node.responsive.mobile = { direction: 'column', align: 'stretch' };
  return node;
}
export const heading = (text: string, size = 30) => element('heading', text, { fontSize: size });
export const text = (value: string) => element('text', value);
export const button = (value: string) => element('button', value);
export const input = (label: string, controlType: UiNode['props']['controlType'] = 'text') =>
  element('input', label, {}, { controlType });
export const muted = (value: string) =>
  element('text', value, { color: 'theme:muted', fontSize: 14 });
export const row = (children: UiNode[]) =>
  group('container', children, {
    direction: 'row',
    align: 'center',
    justify: 'space-between',
    padding: 0,
    gap: 16,
  });
export const section = (title: string, children: UiNode[]) =>
  group('card', [heading(title, 20), ...children], {
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: 'theme:border',
  });
