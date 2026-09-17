import { z } from 'zod';

export const cssValueSchema = z.union([
  z
    .string()
    .max(2000)
    .refine(
      (value) =>
        !value.includes('\0') && !/(?:javascript|vbscript)\s*:|expression\s*\(/i.test(value),
      '실행 코드는 CSS 값으로 사용할 수 없습니다.',
    ),
  z.number().finite(),
]);
// Property declarations only: no selectors, rules, HTML or nested objects.
export const cssSchema = z
  .record(
    z
      .string()
      .max(100)
      .regex(/^(?:--[a-zA-Z0-9_-]+|-?[a-zA-Z][a-zA-Z0-9-]*)$/),
    cssValueSchema,
  )
  .refine((value) => Object.keys(value).length <= 100, 'CSS 속성은 최대 100개입니다.');
export type CssDeclarations = z.infer<typeof cssSchema>;
export function cssPropertyName(name: string) {
  if (name.startsWith('--')) return name;
  const property = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return property.startsWith('ms-') ? `-${property}` : property;
}
export function mergeCss(...declarations: (CssDeclarations | undefined)[]): CssDeclarations {
  const merged = new Map<string, string | number>();
  for (const css of declarations) {
    for (const [key, value] of Object.entries(css ?? {})) {
      const property = cssPropertyName(key);
      // Later overrides must follow inherited shorthands in declaration order.
      merged.delete(property);
      merged.set(property, value);
    }
  }
  return Object.fromEntries(merged);
}
