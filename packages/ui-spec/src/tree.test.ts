import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSpec,
  createNode,
  insertNode,
  moveNode,
  validateSpec,
  removeNode,
  effectiveStyle,
} from './index.js';
test('mobile layout defaults are derived without changing desktop data or explicit overrides', () => {
  const grid = createNode('grid');
  grid.style = { gridColumns: 5, minWidth: '600px' };
  const before = structuredClone(grid);
  assert.equal(effectiveStyle(grid, 'mobile').gridColumns, 1);
  assert.equal(effectiveStyle(grid, 'mobile').width, '100%');
  assert.equal(effectiveStyle(grid, 'mobile').minWidth, '0px');
  assert.deepEqual(grid, before);
  assert.equal(effectiveStyle(grid, 'desktop').gridColumns, 5);
  grid.responsive.mobile = { gridColumns: 2, width: '80%', minWidth: '100px' };
  assert.equal(effectiveStyle(grid, 'mobile').gridColumns, 2);
  assert.equal(effectiveStyle(grid, 'mobile').width, '80%');
  assert.equal(effectiveStyle(grid, 'mobile').minWidth, '100px');
  const row = createNode('container');
  row.style = { direction: 'row', align: 'center' };
  row.children = [createNode('image'), createNode('container')];
  assert.equal(effectiveStyle(row, 'mobile').direction, 'column');
  assert.equal(effectiveStyle(row, 'mobile').align, 'stretch');
  row.responsive.mobile = { direction: 'row', wrap: false };
  assert.equal(effectiveStyle(row, 'mobile').direction, 'row');
  assert.equal(effectiveStyle(row, 'mobile').wrap, false);
  row.responsive.mobile = {};
  row.style.overflowX = 'auto';
  assert.equal(effectiveStyle(row, 'mobile').direction, 'row');
  assert.equal(effectiveStyle(row, 'mobile').wrap, undefined);
});
test('tree edits are immutable and prevent invalid nesting/cycles', () => {
  const spec = createSpec();
  const card = createNode('card');
  const button = createNode('button');
  const next = insertNode(insertNode(spec, spec.root.id, card), card.id, button);
  assert.equal(spec.root.children.length, 0);
  assert.throws(() => moveNode(next, card.id, button.id));
  assert.throws(() => insertNode(next, button.id, createNode('text')));
  assert.throws(() => insertNode(next, card.id, button));
  assert.equal(removeNode(next, button.id).root.children[0].children.length, 0);
});
test('responsive override preserves base and parent lock protects descendants', () => {
  const spec = createSpec();
  const card = createNode('card');
  card.children.push(createNode('text'));
  card.locked = true;
  const next = insertNode(spec, spec.root.id, card);
  assert.throws(() => removeNode(next, card.children[0].id));
  card.style.width = '100%';
  card.responsive.mobile = { hidden: true };
  assert.equal(effectiveStyle(card, 'mobile').hidden, true);
  assert.equal(effectiveStyle(card, 'desktop').hidden, undefined);
  assert.equal(effectiveStyle(card, 'mobile').direction, 'column');
});

test('table dimensions and date settings round trip and reject invalid bounds', () => {
  const spec = createSpec(),
    table = createNode('table'),
    input = createNode('input');
  table.props.rowCount = 200;
  table.props.columnCount = 24;
  table.props.pageSize = 10;
  input.props.controlType = 'datetime-local';
  input.props.includeTime = true;
  spec.root.children.push(table, input);
  assert.deepEqual(validateSpec(JSON.parse(JSON.stringify(spec))), spec);
  table.props.rowCount = 201;
  assert.throws(() => validateSpec(spec));
  table.props.rowCount = 3;
  table.props.columnCount = 0;
  assert.throws(() => validateSpec(spec));
});
test('untrusted specs reject executable styles, unknown components and excessive depth', () => {
  const spec = createSpec();
  assert.throws(() =>
    validateSpec({
      ...spec,
      root: { ...spec.root, style: { background: 'url(javascript:alert(1))' } },
    }),
  );
  assert.throws(() => validateSpec({ ...spec, root: { ...spec.root, type: 'script' } }));
  let node = spec.root;
  for (let i = 0; i < 42; i++) {
    const child = createNode('container');
    node.children.push(child);
    node = child;
  }
  assert.throws(() => validateSpec(spec));
});
