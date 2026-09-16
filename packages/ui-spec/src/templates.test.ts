import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTemplate, pageTemplates, templateCategories } from './templates.js';
import { createSpec, editSpec, createNode, cloneNode, findNode } from './tree.js';
import { validateSpec, type UiNode } from './schema.js';
import { themePresets } from './theme.js';
import { dropElement } from './drop.js';
test('templates validate, create independent trees and support mobile layouts and themed additions', () => {
  const allIds = new Set<string>();
  for (const template of pageTemplates)
    for (let attempt = 0; attempt < 2; attempt++) {
      const spec = createTemplate(template.id);
      assert.deepEqual(validateSpec(spec), spec);
      assert.ok(spec.root.children.length);
      function visit(node: UiNode) {
        assert.ok(!allIds.has(node.id));
        allIds.add(node.id);
        if (node.type === 'grid') assert.equal(node.responsive.mobile?.gridColumns, 1);
        node.children.forEach(visit);
      }
      visit(spec.root);
      const next = dropElement(spec, spec.root.id, JSON.stringify({ type: 'card' }));
      assert.equal(next.root.children.at(-1)!.style.background, undefined);
      assert.deepEqual(next.theme, spec.theme);
    }
  assert.throws(() => createTemplate('unknown'));
});
test('optional theme preserves legacy specs and edits while rejecting unsafe tokens', () => {
  const spec = createSpec();
  assert.deepEqual(validateSpec(spec), spec);
  spec.theme = structuredClone(themePresets[1].theme);
  assert.deepEqual(
    editSpec(spec, (root) => {
      root.name = '테마 유지';
    }).theme,
    spec.theme,
  );
  assert.throws(() =>
    validateSpec({ ...spec, theme: { ...spec.theme, primary: 'url(https://example.com)' } }),
  );
  assert.throws(() =>
    validateSpec({ ...spec, theme: { ...spec.theme, font: 'custom remote font' } }),
  );
  assert.throws(() => validateSpec({ ...spec, theme: { ...spec.theme, radius: 1000 } }));
});

test('template families preserve existing IDs, group consistently and expose editable official components', () => {
  for (const id of ['main', 'chat', 'landing', 'dashboard', 'management', 'form', 'login'])
    assert.ok(pageTemplates.some((t) => t.id === id));
  assert.equal(new Set(pageTemplates.map((t) => t.id)).size, pageTemplates.length);
  const groups = pageTemplates.map((t) => templateCategories.indexOf(t.category));
  assert.deepEqual(
    groups,
    [...groups].sort((a, b) => a - b),
  );
  const list = createTemplate('management');
  const search = list.root.children[2].children[0];
  assert.equal(findNode(list.root, search.props.searchTargetId!)?.type, 'table');
  const cloned = cloneNode(list.root);
  assert.notEqual(cloned.children[2].children[0].props.searchTargetId, search.props.searchTargetId);
  assert.equal(
    findNode(cloned, cloned.children[2].children[0].props.searchTargetId!)?.type,
    'table',
  );
  const wizard = createTemplate('onboarding').root.children.find((n) => n.type === 'wizard')!;
  assert.equal(wizard.children.length, 3);
  assert.ok(wizard.children.every((n) => n.children.length));
  const spec = createSpec();
  const chart = createNode('chart');
  spec.root.children = [chart];
  assert.doesNotThrow(() => validateSpec(spec));
  chart.props.chartData = [{ label: 'unsafe', value: -1 }];
  assert.throws(() => validateSpec(spec));
  chart.props.chartData = Array.from({ length: 25 }, () => ({ label: 'many', value: 0 }));
  assert.throws(() => validateSpec(spec));
  chart.props.chartData = [];
  assert.doesNotThrow(() => validateSpec(spec));
});
