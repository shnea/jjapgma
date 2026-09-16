import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpec, createNode, cloneNode } from './tree.js';
import { applyUiPatch } from './patch.js';
test('AI patches are atomic, preserve locked nodes and reject unsupported properties', () => {
  const spec = createSpec(),
    button = createNode('button');
  button.locked = true;
  spec.root.children = [button];
  assert.throws(() =>
    applyUiPatch(spec, [
      { op: 'add', parentId: spec.root.id, id: 'added', type: 'button' },
      { op: 'update', nodeId: button.id, props: { text: '수정' } },
    ]),
  );
  assert.equal(spec.root.children.length, 1);
  assert.throws(() =>
    applyUiPatch(spec, [{ op: 'update', nodeId: spec.root.id, props: { html: '<script>' } }]),
  );
  const next = applyUiPatch(spec, [
    { op: 'update', nodeId: spec.root.id, style: { direction: 'row' }, breakpoint: 'mobile' },
  ]);
  assert.equal(next.root.responsive.mobile?.direction, 'row');
  assert.equal(spec.root.responsive.mobile, undefined);
  const group = createNode('container');
  group.children = [button];
  spec.root.children = [group];
  assert.throws(() => applyUiPatch(spec, [{ op: 'remove', nodeId: group.id }]));
  assert.throws(() =>
    applyUiPatch(spec, [
      { op: 'update', nodeId: group.id, props: { customCss: 'position:fixed;' } },
    ]),
  );
});
test('duplicating overlay groups remaps internal action targets and preserves external targets', () => {
  const group = createNode('container'),
    modal = createNode('modal'),
    button = createNode('button');
  button.props.overlayAction = { type: 'open', targetId: modal.id };
  group.children = [modal, button];
  const copied = cloneNode(group);
  assert.equal(copied.children[1].props.overlayAction?.targetId, copied.children[0].id);
  assert.notEqual(copied.children[0].id, modal.id);
  assert.equal(cloneNode(button).props.overlayAction?.targetId, modal.id);
});
