import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpec, createNode, dropElement, componentTypes, validateSpec } from './index.js';

test('canvas drop reorders in both directions, inserts at edges, and reparents', () => {
  const spec = createSpec();
  const a = createNode('text'),
    b = createNode('button'),
    card = createNode('card');
  spec.root.children.push(a, b, card);
  const moved = dropElement(spec, b.id, JSON.stringify({ id: a.id }), 'after');
  assert.deepEqual(
    moved.root.children.map((n) => n.id),
    [b.id, a.id, card.id],
  );
  const back = dropElement(moved, b.id, JSON.stringify({ id: a.id }), 'before');
  assert.deepEqual(back, spec);
  const nested = dropElement(moved, card.id, JSON.stringify({ id: a.id }));
  assert.equal(nested.root.children[1].children[0].id, a.id);
  assert.equal(spec.root.children.length, 3);
  const added = dropElement(spec, b.id, JSON.stringify({ type: 'select' }), 'before');
  assert.equal(added.root.children[1].type, 'select');
  assert.equal(dropElement(spec, a.id, JSON.stringify({ id: a.id }), 'after'), spec);
});

test('canvas drop preserves locks and rejects cycles, invalid payloads and root moves', () => {
  const spec = createSpec();
  const card = createNode('card'),
    row = createNode('row'),
    text = createNode('text');
  card.children.push(row);
  row.children.push(text);
  spec.root.children.push(card);
  assert.throws(() => dropElement(spec, row.id, JSON.stringify({ id: card.id })));
  assert.throws(() => dropElement(spec, row.id, JSON.stringify({ id: spec.root.id })));
  card.locked = true;
  assert.throws(() => dropElement(spec, spec.root.id, JSON.stringify({ id: text.id })));
  assert.throws(() => dropElement(spec, row.id, JSON.stringify({ type: 'button' })));
  assert.throws(() => dropElement(spec, spec.root.id, '{invalid'));
  assert.throws(() => dropElement(spec, spec.root.id, JSON.stringify({ type: '__proto__' })));
});

test('full catalog roundtrips and URL properties reject executable or remote image sources', () => {
  const spec = createSpec();
  spec.root.children.push(...componentTypes.map((type) => createNode(type)));
  assert.deepEqual(validateSpec(JSON.parse(JSON.stringify(spec))), spec);
  const link = createNode('link');
  spec.root.children.push(link);
  for (const href of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', '/\\evil.test']) {
    link.props.href = href;
    assert.throws(() => validateSpec(spec));
  }
  link.props.href = 'https://example.com';
  assert.doesNotThrow(() => validateSpec(spec));
  link.props.src = 'https://evil.test/track.png';
  assert.throws(() => validateSpec(spec));
});
