import { z } from 'zod';
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const themeSchema = z
  .object({
    primary: color,
    onPrimary: color,
    background: color,
    surface: color,
    text: color,
    muted: color,
    border: color,
    font: z.enum(['sans', 'serif', 'mono']),
    radius: z.number().int().min(0).max(32),
    spacing: z.number().int().min(4).max(48),
  })
  .strict();
export type PageTheme = z.infer<typeof themeSchema>;
const base: PageTheme = {
  primary: '#466e2c',
  onPrimary: '#ffffff',
  background: '#ffffff',
  surface: '#f3f6ef',
  text: '#243020',
  muted: '#61705a',
  border: '#d9e2d1',
  font: 'sans',
  radius: 8,
  spacing: 16,
};
export const themePresets = [
  { id: 'forest', name: '포레스트', theme: base },
  {
    id: 'ocean',
    name: '오션',
    theme: {
      ...base,
      primary: '#2458a6',
      text: '#1c2d46',
      muted: '#586c86',
      surface: '#eff5fc',
      border: '#d5e1ef',
    },
  },
  {
    id: 'violet',
    name: '바이올렛',
    theme: {
      ...base,
      primary: '#7041a6',
      text: '#342443',
      muted: '#726080',
      surface: '#f7f2fc',
      border: '#e4d8ef',
      radius: 14,
    },
  },
  {
    id: 'sand',
    name: '샌드',
    theme: {
      ...base,
      primary: '#865529',
      text: '#392d22',
      muted: '#786958',
      surface: '#faf5ec',
      border: '#e8dcc9',
      font: 'serif',
      radius: 4,
    },
  },
] satisfies { id: string; name: string; theme: PageTheme }[];
export const themeFonts: Record<PageTheme['font'], string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Noto Serif KR', serif",
  mono: 'ui-monospace, Consolas, monospace',
};
