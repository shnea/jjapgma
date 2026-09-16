import type { CSSProperties } from 'react';
import { themeFonts, type PageTheme, type NodeStyle, type UiNode } from '@jjapgma/ui-spec';
export const themeVariables = [
  'primary',
  'on-primary',
  'background',
  'surface',
  'text',
  'muted',
  'border',
  'font',
  'radius',
];
export function resolveColor(value?: string): string | undefined {
  if (!value?.startsWith('theme:')) return value;
  const role = value.slice(6).replace('onPrimary', 'on-primary');
  const fallback: Record<string, string> = {
    primary: '#466e2c',
    'on-primary': '#ffffff',
    background: '#ffffff',
    surface: '#f3f6ef',
    text: '#243020',
    muted: '#61705a',
    border: '#d9e2d1',
  };
  return `var(--page-${role}, ${fallback[role]})`;
}

export function themeStyle(
  theme: PageTheme | undefined,
  node: UiNode,
  value: NodeStyle,
  root: boolean,
): CSSProperties {
  const surface = ['card', 'modal', 'dialog', 'nonModal'].includes(node.type);
  if (!theme)
    return {
      ...(root ? { background: '#ffffff' } : {}),
      ...(['container', 'grid', 'card', 'modal', 'dialog', 'nonModal'].includes(node.type)
        ? { gap: 16, padding: 24 }
        : {}),
      ...(surface ? { background: '#ffffff', borderRadius: 12 } : {}),
    };
  return {
    ...(root
      ? { background: theme.background, color: theme.text, fontFamily: themeFonts[theme.font] }
      : {}),
    ...(surface ? { background: theme.surface, borderRadius: theme.radius } : {}),
    ...(['container', 'grid', 'card', 'modal', 'dialog', 'nonModal'].includes(node.type)
      ? { gap: theme.spacing, padding: theme.spacing }
      : {}),
    '--page-primary': theme.primary,
    '--page-on-primary': theme.onPrimary,
    '--page-surface': theme.surface,
    '--page-background': theme.background,
    '--page-text': theme.text,
    '--page-muted': theme.muted,
    '--page-border': theme.border,
    '--page-font': themeFonts[theme.font],
    '--page-radius': `${theme.radius}px`,
    '--node-link': resolveColor(value.color) ?? theme.primary,
    '--node-color':
      resolveColor(value.color) ??
      (node.type === 'button'
        ? ['outline', 'ghost'].includes(node.props.variant ?? '')
          ? theme.primary
          : theme.onPrimary
        : theme.text),
    '--node-background':
      resolveColor(value.background) ??
      (node.type === 'button'
        ? ['outline', 'ghost'].includes(node.props.variant ?? '')
          ? 'transparent'
          : theme.primary
        : theme.background),
    '--node-radius': `${value.radius ?? theme.radius}px`,
  } as CSSProperties;
}
