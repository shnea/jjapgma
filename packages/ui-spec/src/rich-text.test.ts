import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNode,
  createSpec,
  createTemplate,
  validateSpec,
  parseRichText,
  normalizeRichText,
  richTextFileUrl,
  mapRichTextUrls,
} from './index.js';

test('rich text stores block JSON, normalizes empty documents and validates byte and URL boundaries', () => {
  assert.equal(normalizeRichText('[{"type":"paragraph","content":[]}]'), '');
  assert.equal(normalizeRichText(''), '');
  assert.throws(() =>
    parseRichText('[{"id":"same","type":"paragraph"},{"id":"same","type":"paragraph"}]'),
  );
  assert.throws(() =>
    parseRichText(
      '[{"type":"paragraph","content":[{"type":"text","text":"x","styles":{"unknown":"x"}}]}]',
    ),
  );
  assert.throws(() => parseRichText('[{"type":"image","props":{"url":{}}}]'));
  assert.throws(() =>
    parseRichText(JSON.stringify([{ type: 'paragraph', content: '가'.repeat(45000) }])),
  );
  for (const value of [
    '{}',
    '[null]',
    '[{"type":"script"}]',
    '[{"type":"paragraph","content":{}}]',
    '[{"type":"table","content":{"type":"tableContent","rows":[{}]}}]',
  ])
    assert.throws(() => parseRichText(value));
  for (const url of [
    'javascript:alert(1)',
    'data:image/svg+xml,x',
    'file:///secret',
    '//evil.test',
  ])
    assert.throws(() => parseRichText(JSON.stringify([{ type: 'image', props: { url } }])));
  const document = JSON.stringify([{ type: 'image', props: { url: richTextFileUrl('file-1') } }]);
  assert.match(
    mapRichTextUrls(document, () => 'assets/image.png'),
    /assets\/image.png/,
  );
  const spec = createSpec(),
    node = createNode('richText');
  spec.root.children.push(node);
  node.props.documentJson = document;
  assert.throws(() => validateSpec(spec));
  node.props.richTextFiles = [{ fileId: 'file-1', name: 'image.png', mimeType: 'image/png' }];
  assert.doesNotThrow(() => validateSpec(spec));
  node.props.richTextFiles.push(node.props.richTextFiles[0]);
  assert.throws(() => validateSpec(spec));
});

test('document templates use the same editable rich text schema and renderer modes', () => {
  for (const [id, mode] of [
    ['document-editor', 'editor'],
    ['notice-document', 'viewer'],
  ]) {
    const spec = createTemplate(id);
    const node = spec.root.children.find((node) => node.type === 'richText')!;
    assert.equal(node.props.richTextMode, mode);
    assert.ok(parseRichText(node.props.documentJson!).length > 0);
    assert.doesNotThrow(() => validateSpec(spec));
  }
});
