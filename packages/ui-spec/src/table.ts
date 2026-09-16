import { z } from 'zod';
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const tableColumnSchema = z
  .object({
    id,
    // Legacy items can contain a single 5,000-character title/cell; conversion must retain it.
    title: z.string().max(5000),
    type: z.enum([
      'text',
      'number',
      'date',
      'link',
      'button',
      'icon',
      'checkbox',
      'badge',
      'image',
    ]),
    align: z.enum(['left', 'center', 'right']).optional(),
    width: z.number().int().min(40).max(800).optional(),
    hidden: z
      .object({
        desktop: z.boolean().optional(),
        tablet: z.boolean().optional(),
        mobile: z.boolean().optional(),
      })
      .strict()
      .optional(),
    fixed: z.enum(['none', 'start', 'end']).optional(),
    wrap: z.boolean().optional(),
    label: z.string().max(100).optional(),
    icon: z.string().max(60).optional(),
    sortable: z.boolean().optional(),
    rules: z
      .array(
        z
          .object({ value: z.string().max(100), color, icon: z.string().max(60).optional() })
          .strict(),
      )
      .max(20)
      .optional(),
  })
  .strict();
export const tableSchema = z
  .object({
    columns: z.array(tableColumnSchema).min(1).max(24),
    rows: z
      .array(
        z
          .object({ id, hidden: z.boolean().optional(), cells: z.record(id, z.string().max(5000)) })
          .strict(),
      )
      .max(200),
    striped: z.boolean().optional(),
    stripeColor: color.optional(),
    headerColor: color.optional(),
    hover: z.boolean().optional(),
    density: z.enum(['compact', 'normal', 'comfortable']).optional(),
    borders: z.enum(['horizontal', 'all', 'none']).optional(),
    stickyHeader: z.boolean().optional(),
    firstColumn: z.enum(['none', 'number', 'select', 'number-select']).optional(),
    numbering: z.enum(['continuous', 'page']).optional(),
    selectionScope: z.enum(['page', 'filtered']).optional(),
    searchable: z.boolean().optional(),
    filterable: z.boolean().optional(),
    mobileLayout: z.enum(['scroll', 'cards']).optional(),
    state: z.enum(['normal', 'loading', 'error']).optional(),
    rowRules: z
      .array(z.object({ columnId: id, value: z.string().max(100), color }).strict())
      .max(20)
      .optional(),
  })
  .strict()
  .superRefine((table, context) => {
    const columns = new Set(table.columns.map((column) => column.id));
    if (
      columns.size !== table.columns.length ||
      new Set(table.rows.map((row) => row.id)).size !== table.rows.length
    )
      context.addIssue({ code: 'custom', message: '표의 행/열 ID가 중복되었습니다.' });
    if (
      table.rows.some((row) => Object.keys(row.cells).some((key) => !columns.has(key))) ||
      table.rowRules?.some((rule) => !columns.has(rule.columnId))
    )
      context.addIssue({ code: 'custom', message: '표의 열 연결이 잘못되었습니다.' });
  });
export type TableData = z.infer<typeof tableSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>;
export function readTable(props: {
  table?: TableData;
  items?: string;
  columnCount?: number;
  rowCount?: number;
}): TableData {
  if (props.table) return structuredClone(props.table);
  const lines = (props.items ?? '').split('\n').filter(Boolean);
  const [header = '', ...body] = lines;
  const count = props.columnCount ?? Math.max(1, ...lines.map((line) => line.split('|').length));
  const columns: TableColumn[] = Array.from({ length: Math.min(count, 24) }, (_, i) => ({
    id: `col-${i}`,
    title: header.split('|')[i] ?? '',
    type: 'text',
  }));
  return {
    columns,
    rows: Array.from({ length: Math.min(props.rowCount ?? body.length, 200) }, (_, i) => ({
      id: `row-${i}`,
      cells: Object.fromEntries(
        columns.map((column, j) => [column.id, (body[i] ?? '').split('|')[j] ?? '']),
      ),
    })),
  };
}
// Conversion retains cropped legacy rows/columns so changing an editor mode loses no authored data.
export function convertTable(props: Parameters<typeof readTable>[0]): TableData {
  if (props.table) return structuredClone(props.table);
  const lines = (props.items ?? '').split('\n').filter(Boolean);
  const visible = readTable(props);
  const all = readTable({
    ...props,
    columnCount: Math.max(
      props.columnCount ?? 0,
      ...lines.map((line) => line.split('|').length),
      1,
    ),
    rowCount: Math.max(props.rowCount ?? 0, lines.length - 1, 0),
  });
  for (const [index, column] of all.columns.entries())
    if (index >= visible.columns.length)
      column.hidden = { desktop: true, tablet: true, mobile: true };
  for (const [index, row] of all.rows.entries())
    if (index >= visible.rows.length) row.hidden = true;
  return all;
}
