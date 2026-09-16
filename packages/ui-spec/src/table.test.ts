import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, createSpec, effectiveStyle, editSpec } from './tree.js';
import { convertTable, readTable, tableSchema } from './table.js';
import { validateSpec } from './schema.js';
test('legacy bottom-aligned rows become left-filled columns without replacing explicit mobile alignment', () => {
  const row = createNode('container');
  row.style = { direction: 'row', align: 'flex-end' };
  row.responsive.mobile = { direction: 'column', gap: 31 };
  assert.equal(effectiveStyle(row, 'mobile').align, 'stretch');
  assert.equal(effectiveStyle(row, 'desktop').align, 'flex-end');
  assert.equal(effectiveStyle(row, 'mobile').gap, 31);
  row.responsive.mobile.align = 'flex-end';
  assert.equal(effectiveStyle(row, 'mobile').align, 'flex-end');
});
test('table conversion retains legacy data and stable IDs, structured data survives cloning and validation', () => {
  const props = {
    items: '이름|상태|메모\n가|완료|보관\n나|대기|유지',
    rowCount: 1,
    columnCount: 2,
  };
  assert.equal(readTable(props).rows.length, 1);
  const table = convertTable(props);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[1].cells['col-2'], '유지');
  assert.equal(table.rows[1].hidden, true);
  assert.equal(
    tableSchema.safeParse(convertTable({ items: '제목\n' + '가'.repeat(4997) })).success,
    true,
  );
  assert.deepEqual(table.columns[2].hidden, { desktop: true, tablet: true, mobile: true });
  table.columns[1] = {
    ...table.columns[1],
    type: 'badge',
    hidden: { mobile: true },
    rules: [{ value: '완료', color: '#24704b' }],
  };
  table.firstColumn = 'number-select';
  table.striped = true;
  const spec = createSpec(),
    node = createNode('table');
  node.props.table = table;
  spec.root.children.push(node);
  const saved = validateSpec(JSON.parse(JSON.stringify(spec)));
  const next = editSpec(saved, (root) => {
    root.children[0].props.table!.columns.reverse();
  });
  assert.equal(next.root.children[0].props.table!.rows[1].cells['col-2'], '유지');
  assert.equal(saved.root.children[0].props.table!.columns[0].id, 'col-0');
});
test('table data rejects duplicate identifiers, missing columns, invalid device flags and excessive bounds', () => {
  const good = convertTable({ items: '제목\n내용' });
  assert.equal(tableSchema.safeParse(good).success, true);
  for (const bad of [
    { ...good, columns: [good.columns[0], good.columns[0]] },
    { ...good, rows: [good.rows[0], good.rows[0]] },
    { ...good, rows: [{ id: 'row', cells: { missing: '내용' } }] },
    { ...good, columns: [{ ...good.columns[0], hidden: { mobile: 'yes' } }] },
    { ...good, columns: [{ ...good.columns[0], type: 'script' }] },
    { ...good, rowRules: [{ columnId: 'missing', value: 'x', color: '#ffffff' }] },
    { ...good, columns: [{ ...good.columns[0], width: 0 }] },
  ])
    assert.equal(tableSchema.safeParse(bad).success, false);
});
