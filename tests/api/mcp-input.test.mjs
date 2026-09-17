import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patchSchema, createSpec, applyUiPatch, findNode, effectiveStyle } from '@jjapgma/ui-spec';
import { normalizeMcpInput, summarizeMcpIssues } from '../../apps/api/dist/ai/mcp-input.js';

test('MCP image-layout notation becomes valid pixel sizes, props and responsive updates without mutating input', () => {
  const input = {
    operations: [
      { op: 'add', id: 'header', parentId: 'page-root', type: 'container', style: { height: 80 } },
      {
        op: 'add',
        id: 'logo',
        parentId: 'header',
        type: 'image',
        style: { width: 48, height: 48, src: '/logo.png' },
      },
      {
        op: 'add',
        id: 'search',
        parentId: 'header',
        type: 'searchBox',
        style: {
          minWidth: 120,
          placeholder: '검색',
          searchWidth: 240,
          mobileSearch: 'icon',
          searchTargetId: 'menu',
        },
      },
      {
        op: 'add',
        id: 'action',
        parentId: 'header',
        type: 'button',
        style: {
          width: 120,
          height: 40,
          responsive: { mobile: { width: '100%' }, tablet: { width: 160 } },
        },
      },
    ],
  };
  const original = structuredClone(input);
  const normalized = normalizeMcpInput(input);
  assert.deepEqual(input, original);
  assert.deepEqual(normalized.adjustments, {
    pixelDimensions: 7,
    movedProps: 5,
    responsiveUpdates: 2,
    cssProperties: 0,
  });
  assert.equal(patchSchema.safeParse(input.operations).success, false);
  const initial = createSpec();
  initial.root.id = 'page-root';
  const spec = applyUiPatch(initial, normalized.input.operations);
  assert.equal(findNode(spec.root, 'header').style.height, '80px');
  assert.equal(findNode(spec.root, 'logo').props.src, '/logo.png');
  assert.equal(findNode(spec.root, 'search').props.searchWidth, 240);
  assert.equal(findNode(spec.root, 'search').style.placeholder, undefined);
  assert.equal(findNode(spec.root, 'action').responsive.mobile.width, '100%');
  assert.equal(findNode(spec.root, 'action').responsive.tablet.width, '160px');
});

test('MCP notation preserves prop ownership and rejects executable values, nested CSS and invalid app options', () => {
  for (const style of [
    { src: 'https://outside.example/image.png' },
    { css: { color: 'javascript:bad' } },
    { css: { '.global': 'red' } },
    { css: { width: { mobile: 100 } } },
    { gridColumns: 99 },
    { searchWidth: 900 },
    { responsive: { desktop: { width: 120 } } },
    { responsive: { mobile: { src: '/unexpected.png' } } },
  ]) {
    const result = normalizeMcpInput({
      operations: [{ op: 'add', id: 'node', parentId: 'page-root', type: 'container', style }],
    });
    assert.equal(
      patchSchema.safeParse(result.input.operations).success,
      false,
      JSON.stringify(style),
    );
  }
  const duplicate = normalizeMcpInput({
    operations: [
      {
        op: 'add',
        id: 'node',
        parentId: 'page-root',
        type: 'input',
        props: { placeholder: '원본' },
        style: { placeholder: '다른 값' },
      },
    ],
  });
  assert.equal(patchSchema.safeParse(duplicate.input.operations).success, false);
  assert.equal(duplicate.input.operations[0].props.placeholder, '원본');
  const mobileProps = normalizeMcpInput({
    operations: [
      { op: 'update', nodeId: 'node', breakpoint: 'mobile', style: { placeholder: '모바일 전용' } },
    ],
  });
  assert.equal(patchSchema.safeParse(mobileProps.input.operations).success, false);
  const excessive = normalizeMcpInput({
    operations: Array.from({ length: 100 }, (_, i) => ({
      op: 'add',
      id: `n-${i}`,
      parentId: 'page-root',
      type: 'button',
      style: { responsive: { mobile: { width: 100 } } },
    })),
  });
  assert.equal(patchSchema.safeParse(excessive.input.operations).success, false);
  assert.equal(excessive.input.operations.length, 200);
});

test('MCP forwards browser CSS beyond app controls, retains custom CSS and merges responsive declarations', () => {
  const normalized = normalizeMcpInput({
    operations: [
      {
        op: 'add',
        id: 'header',
        parentId: 'page-root',
        type: 'container',
        style: {
          borderBottomWidth: 2,
          borderBottomColor: '#123456',
          borderBottomStyle: 'solid',
          width: 'calc(100% - 24px)',
          padding: '0 24px',
          flex: '1 1 auto',
          customCss: 'letter-spacing: 2px;',
          responsive: { mobile: { borderBottomColor: '#654321', width: 'calc(100% - 8px)' } },
        },
      },
      { op: 'update', nodeId: 'header', style: { css: { 'border-bottom-width': 4 } } },
    ],
  });
  const initial = createSpec();
  initial.root.id = 'page-root';
  const spec = applyUiPatch(initial, normalized.input.operations);
  const header = findNode(spec.root, 'header');
  assert.equal(header.props.customCss, 'letter-spacing: 2px;');
  assert.equal(header.style.css['border-bottom-width'], 4);
  assert.equal(header.style.css.padding, '0 24px');
  assert.equal(header.style.css.flex, '1 1 auto');
  assert.equal(header.style.css.width, 'calc(100% - 24px)');
  assert.equal(effectiveStyle(header, 'mobile').css['border-bottom-width'], 4);
  assert.equal(effectiveStyle(header, 'mobile').css['border-bottom-color'], '#654321');
  assert.equal(effectiveStyle(header, 'mobile').css.width, 'calc(100% - 8px)');
});

test('MCP errors group repeated paths so later unsupported fields and overall limits remain visible', () => {
  const operations = Array.from({ length: 101 }, (_, i) => ({
    op: 'add',
    id: `node-${i}`,
    parentId: 'page-root',
    type: 'container',
    style: i === 100 ? { borderBottomWidth: 1, borderBottomColor: '#000000' } : { height: 100 },
  }));
  const result = patchSchema.safeParse(operations);
  assert.equal(result.success, false);
  const summary = summarizeMcpIssues(result.error.issues);
  assert.equal(summary.issueCount, 102);
  assert.equal(summary.omittedIssueGroups, 0);
  assert.equal(summary.issues.length, 3);
  assert.ok(summary.issues.some((i) => i.code === 'invalid_type' && i.occurrences === 100));
  assert.ok(summary.issues.some((i) => i.unexpectedKeys?.includes('borderBottomColor')));
  assert.equal(summary.issues[0].maximum, 100);
  assert.ok(!JSON.stringify(summary).includes('#000000'));
});
