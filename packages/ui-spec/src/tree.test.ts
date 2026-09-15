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
