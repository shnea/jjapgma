import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, resizeGrid } from './grid.js';
import { createNode, createSpec, editSpec } from './tree.js';
import { validateSpec } from './schema.js';

test('grid creates bordered 2x2 cells and resizing preserves row positions and nested content', () => {
  const grid = createGrid();
  const original = grid.children.map((n) => n.id);
  assert.equal(grid.children.length, 4);
  assert.ok(grid.children.every((n) => n.type === 'container' && n.style.borderWidth === 1));
  const input = createNode('input');
  grid.children[0].children.push(input);
  resizeGrid(grid, 3, 2);
  assert.deepEqual(
    [grid.children[0].id, grid.children[1].id, grid.children[3].id, grid.children[4].id],
    original,
  );
  assert.equal(grid.children[0].children[0].id, input.id);
  resizeGrid(grid, 2, 2);
  assert.deepEqual(
    grid.children.map((n) => n.id),
    original,
  );
  resizeGrid(grid, 2, 3);
  assert.equal(grid.children.length, 6);
  const spec = createSpec();
  spec.root.children = [grid];
  validateSpec(spec);
  assert.equal(new Set(grid.children.map((n) => n.id)).size, 6);
});

test('grid reduction rejects occupied and locked cells atomically and enforces size bounds', () => {
  const spec = createSpec();
  const grid = createGrid();
  spec.root.children = [grid];
  grid.children[3].children.push(createNode('button'));
  const before = structuredClone(spec);
  assert.throws(() => editSpec(spec, (root) => resizeGrid(root.children[0], 1, 2)), /내용/);
  assert.deepEqual(spec, before);
  grid.children[3].children = [];
  grid.children[3].locked = true;
  assert.throws(() => resizeGrid(grid, 2, 1), /잠겨/);
  assert.throws(() => resizeGrid(grid, 13, 2));
  assert.throws(() => resizeGrid(grid, 2, 0));
  grid.locked = true;
  assert.throws(() => resizeGrid(grid, 3, 2), /잠긴/);
});
