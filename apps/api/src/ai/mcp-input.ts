import {
  propsSchema,
  styleSchema,
  mergeCss,
  cssPropertyName,
  type CssDeclarations,
} from '@jjapgma/ui-spec';
import type { z } from 'zod';

const dimensions = new Set(['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight']);
const nativeCss = new Set([
  ...dimensions,
  'padding',
  'gap',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'background',
  'color',
  'textAlign',
  'overflow',
  'overflowX',
  'overflowY',
  'alignSelf',
  'justifySelf',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'borderWidth',
  'borderColor',
  'opacity',
  'objectFit',
  'objectPosition',
]);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// Adapt only unambiguous MCP notation. The original strict patch schema still validates the result.
export function normalizeMcpInput(input: Record<string, unknown>) {
  const adjustments = { pixelDimensions: 0, movedProps: 0, responsiveUpdates: 0, cssProperties: 0 };
  const forwardCss = (style: Record<string, unknown>) => {
    if (style.css !== undefined && !record(style.css)) return style;
    const css = mergeCss(style.css as CssDeclarations | undefined);
    for (const [key, value] of Object.entries(style)) {
      if (
        key === 'css' ||
        key === 'responsive' ||
        (typeof value !== 'string' && typeof value !== 'number')
      )
        continue;
      const managed = Object.hasOwn(styleSchema.shape, key);
      if (
        managed &&
        (!nativeCss.has(key) ||
          styleSchema.shape[key as keyof typeof styleSchema.shape].safeParse(value).success)
      )
        continue;
      if (!managed && Object.hasOwn(propsSchema.shape, key)) continue;
      const property = cssPropertyName(key);
      if (Object.hasOwn(css, property)) continue;
      css[property] = value;
      delete style[key];
      adjustments.cssProperties += 1;
    }
    return { ...style, ...(Object.keys(css).length ? { css } : {}) };
  };
  const normalizeStyle = (style: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(style).map(([key, value]) => {
        if (
          dimensions.has(key) &&
          typeof value === 'number' &&
          Number.isInteger(value) &&
          value >= 0 &&
          value <= 9999
        ) {
          adjustments.pixelDimensions += 1;
          return [key, `${value}px`];
        }
        return [key, value];
      }),
    );
  if (!Array.isArray(input.operations) || input.operations.length > 100)
    return { input, adjustments };
  const operations = input.operations.flatMap((operation: unknown) => {
    if (
      !record(operation) ||
      !['add', 'update'].includes(String(operation.op)) ||
      !record(operation.style)
    )
      return [operation];
    const style = normalizeStyle(operation.style);
    let props = operation.props;
    if (operation.breakpoint === undefined && (props === undefined || record(props))) {
      for (const [key, value] of Object.entries(style)) {
        if (
          Object.hasOwn(propsSchema.shape, key) &&
          !Object.hasOwn(styleSchema.shape, key) &&
          !Object.hasOwn(props ?? {}, key)
        ) {
          props = { ...(props as Record<string, unknown> | undefined), [key]: value };
          delete style[key];
          adjustments.movedProps += 1;
        }
      }
    }
    const nodeId = operation.op === 'add' ? operation.id : operation.nodeId;
    const responsive = style.responsive;
    const updates: Record<string, unknown>[] = [];
    if (
      operation.breakpoint === undefined &&
      typeof nodeId === 'string' &&
      record(responsive) &&
      Object.keys(responsive).length > 0 &&
      Object.entries(responsive).every(
        ([key, value]) => ['tablet', 'mobile'].includes(key) && record(value),
      )
    ) {
      for (const [breakpoint, value] of Object.entries(responsive)) {
        updates.push({
          op: 'update',
          nodeId,
          breakpoint,
          style: forwardCss(normalizeStyle(value as Record<string, unknown>)),
        });
        adjustments.responsiveUpdates += 1;
      }
      delete style.responsive;
    }
    return [
      { ...operation, style: forwardCss(style), ...(props !== undefined ? { props } : {}) },
      ...updates,
    ];
  });
  return { input: { ...input, operations }, adjustments };
}

export function summarizeMcpIssues(issues: z.core.$ZodIssue[]) {
  const groups = new Map<string, { issue: z.core.$ZodIssue; occurrences: number }>();
  for (const issue of issues) {
    const path = issue.path.map((part) => (typeof part === 'number' ? '*' : part));
    const key = JSON.stringify([
      path,
      issue.code,
      issue.code === 'unrecognized_keys' ? [...issue.keys].sort() : undefined,
    ]);
    const group = groups.get(key);
    if (group) group.occurrences += 1;
    else groups.set(key, { issue, occurrences: 1 });
  }
  return {
    issueCount: issues.length,
    omittedIssueGroups: Math.max(0, groups.size - 20),
    issues: [...groups.values()]
      .sort((a, b) => Number(b.issue.path.length <= 1) - Number(a.issue.path.length <= 1))
      .slice(0, 20)
      .map(({ issue, occurrences }) => ({
        path: issue.path,
        code: issue.code,
        occurrences,
        ...(issue.code === 'invalid_type' ? { expected: issue.expected } : {}),
        ...(issue.code === 'invalid_value' ? { allowed: issue.values } : {}),
        ...(issue.code === 'too_big'
          ? { maximum: Number(issue.maximum), inclusive: issue.inclusive }
          : {}),
        ...(issue.code === 'too_small'
          ? { minimum: Number(issue.minimum), inclusive: issue.inclusive }
          : {}),
        ...(issue.code === 'unrecognized_keys'
          ? { unexpectedKeys: issue.keys.slice(0, 10).map((key) => key.slice(0, 80)) }
          : {}),
        ...(issue.code === 'invalid_union' && issue.path.at(-1) === 'op'
          ? { allowed: ['add', 'update', 'move', 'remove', 'template'] }
          : {}),
      })),
  };
}
