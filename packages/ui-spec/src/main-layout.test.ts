import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTemplate,
  createNode,
  createSpec,
  cloneNode,
  validateSpec,
  applyUiPatch,
} from './index.js';

test('main template and cloned navigation retain local search/action targets', () => {
  const spec = createTemplate('main');
  const cloned = cloneNode(spec.root);
  assert.equal(
    spec.root.children[0].children[1].props.searchTargetId,
    spec.root.children[1].children[0].children[0].id,
  );
  assert.equal(
    cloned.children[0].children[1].props.searchTargetId,
    cloned.children[1].children[0].children[0].id,
  );
  assert.notEqual(
    cloned.children[0].children[1].props.searchTargetId,
    spec.root.children[0].children[1].props.searchTargetId,
  );
  assert.deepEqual(validateSpec({ ...spec, root: cloned }).root, cloned);
  assert.equal(
    cloned.children[0].children[0].children[0].props.overlayAction?.targetId,
    cloned.children[1].children[0].id,
  );
  assert.equal(spec.root.style.minHeight, '100dvh');
});

test('menu depth is at most three across validated specs and patches', () => {
  const spec = createSpec();
  const menu = createNode('navbar');
  spec.root.children.push(menu);
  const three = [
    {
      id: 'one',
      label: '대메뉴',
      children: [{ id: 'two', label: '중메뉴', children: [{ id: 'three', label: '소메뉴' }] }],
    },
  ];
  const next = applyUiPatch(spec, [{ op: 'update', nodeId: menu.id, props: { menuItems: three } }]);
  assert.ok(validateSpec(next));
  const four = structuredClone(three) as any;
  four[0].children[0].children[0].children = [{ id: 'four', label: '거절' }];
  assert.throws(() =>
    applyUiPatch(spec, [{ op: 'update', nodeId: menu.id, props: { menuItems: four } }]),
  );
  next.root.children[0].props.menuItems = four;
  assert.throws(() => validateSpec(next));
});
test('layout elements can be built without templates and reject unsafe navigation and bounds', () => {
  const spec = createSpec();
  const next = applyUiPatch(spec, [
    {
      op: 'add',
      parentId: spec.root.id,
      id: 'panel',
      type: 'sidePanel',
      props: { panelSide: 'right', collapseMode: 'hidden' },
    },
    {
      op: 'add',
      parentId: 'panel',
      id: 'menu',
      type: 'navbar',
      props: { menuItems: [{ id: 'home', label: '홈', icon: 'home', href: '/home' }] },
    },
    {
      op: 'add',
      parentId: spec.root.id,
      id: 'search',
      type: 'searchBox',
      props: { searchTargetId: 'menu' },
    },
    { op: 'add', parentId: spec.root.id, id: 'slides', type: 'carousel' },
    {
      op: 'add',
      parentId: 'slides',
      id: 'slide',
      type: 'card',
      style: { grow: true, minHeight: '200px' },
    },
  ]);
  assert.equal(next.root.children[2].children[0].type, 'card');
  for (const props of [
    { menuItems: [{ id: 'bad', label: '실행', href: 'javascript:alert(1)' }] },
    { collapsedWidth: -1 },
    { carouselInterval: 1 },
  ])
    assert.throws(() => applyUiPatch(next, [{ op: 'update', nodeId: 'menu', props }]));
  const legacy = createNode('navbar');
  legacy.props.items = '기존 메뉴\n설정';
  next.root.children.push(legacy);
  assert.ok(validateSpec(next));
});

test('theme roles and independent responsive overflow survive patches while arbitrary CSS is rejected', () => {
  const spec = createTemplate('main');
  const node = spec.root.children[1].children[1];
  const next = applyUiPatch(spec, [
    {
      op: 'update',
      nodeId: node.id,
      style: {
        background: 'theme:surface',
        color: 'theme:text',
        borderColor: 'theme:border',
        overflowX: 'auto',
        overflowY: 'scroll',
      },
    },
    {
      op: 'update',
      nodeId: node.id,
      breakpoint: 'mobile',
      style: { overflowX: 'hidden', overflowY: 'auto' },
    },
  ]);
  assert.equal(next.root.children[1].children[1].style.background, 'theme:surface');
  assert.equal(next.root.children[1].children[1].responsive.mobile.overflowX, 'hidden');
  assert.ok(validateSpec(JSON.parse(JSON.stringify(next))));
  for (const background of ['theme:unknown', 'url(https://example.com)', 'var(--custom)'])
    assert.throws(() =>
      applyUiPatch(spec, [{ op: 'update', nodeId: node.id, style: { background } }]),
    );
});
