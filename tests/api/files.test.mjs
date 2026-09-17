import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { createNode } from '@jjapgma/ui-spec';
import { FileClient } from '../../apps/api/dist/files/file-client.js';
import { validateUpload } from '../../apps/api/dist/files/file-policy.js';
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
after(() => db.end());
const base = process.env.BASE_URL;
async function identity() {
  const id = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID();
  await db.query('INSERT INTO users(id,issuer,subject,display_name) VALUES($1,$2,$3,$4)', [
    id,
    'jjapgma:development',
    id,
    '파일 검증 사용자',
  ]);
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
    [createHash('sha256').update(token).digest('hex'), id, csrf],
  );
  return {
    id,
    headers: { Origin: base, Cookie: `jjapgma_session=${token}`, 'X-CSRF-Token': csrf },
  };
}
const jsonRequest = (path, who, data) =>
  fetch(`${base}/api${path}`, {
    method: data ? 'POST' : 'GET',
    headers: { ...who.headers, 'Content-Type': 'application/json' },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
test('file proxy forwards only supported retention categories to the external service', async () => {
  const owner = await identity();
  const project = await (await jsonRequest('/projects', owner, { name: '파일 보존' })).json();
  for (const category of [undefined, 'month', 'forever', ['month', 'month']]) {
    const body = new FormData();
    body.set('file', new Blob(['hello'], { type: 'text/plain' }), 'retention.txt');
    for (const value of Array.isArray(category) ? category : category ? [category] : [])
      body.append('category', value);
    const result = await fetch(`${base}/api/files/upload?projectId=${project.id}`, {
      method: 'POST',
      headers: owner.headers,
      body,
    });
    if (category === 'forever' || Array.isArray(category)) {
      assert.equal(result.status, 400);
      continue;
    }
    assert.equal(result.status, 201, await result.clone().text());
    const { fileId } = await result.json();
    const upstream = await fetch(`http://file-service:8080/files/download/${fileId}`);
    assert.equal(upstream.headers.get('X-Fixture-Category'), category ?? 'default');
    assert.equal(await upstream.text(), 'hello');
  }
});

test('file proxy enforces session, owner context, content checks and persisted project references', async () => {
  const owner = await identity(),
    viewer = await identity(),
    outsider = await identity();
  const project = await (await jsonRequest('/projects', owner, { name: '파일 권한' })).json();
  await db.query("INSERT INTO members VALUES($1,$2,'VIEWER')", [project.id, viewer.id]);
  const upload = (headers, filename = 'notes.txt', mime = 'text/plain', content = 'hello') => {
    const body = new FormData();
    body.set('file', new Blob([content], { type: mime }), filename);
    return fetch(`${base}/api/files/upload?projectId=${project.id}`, {
      method: 'POST',
      headers,
      body,
    });
  };
  assert.equal((await upload({})).status, 401);
  assert.equal((await upload({ ...owner.headers, 'X-CSRF-Token': '' })).status, 403);
  assert.equal((await upload(viewer.headers)).status, 403);
  assert.equal((await upload(outsider.headers)).status, 404);
  assert.equal((await upload(owner.headers, 'fake.png', 'image/png')).status, 400);
  const response = await upload(owner.headers);
  assert.equal(response.status, 201, await response.clone().text());
  const reference = await response.json();
  assert.deepEqual(Object.keys(reference).sort(), ['fileId', 'mimeType', 'name']);
  assert.equal(reference.name, 'notes.txt');
  const stored = (await db.query('SELECT * FROM project_files WHERE project_id=$1', [project.id]))
    .rows;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].file_id, reference.fileId);
  assert.equal((await fetch(`${base}/api/projects/${project.id}/files`)).status, 401);
  assert.equal((await jsonRequest(`/projects/${project.id}/files`, outsider)).status, 404);
  assert.deepEqual(await (await jsonRequest(`/projects/${project.id}/files`, viewer)).json(), [
    reference,
  ]);
  const contentPath = `/projects/${project.id}/files/${reference.fileId}/content`;
  assert.equal((await jsonRequest(contentPath, outsider)).status, 404);
  assert.equal(
    (await jsonRequest(`/projects/${project.id}/files/missing/content`, owner)).status,
    404,
  );
  const content = await jsonRequest(contentPath, viewer);
  assert.equal(content.status, 200);
  assert.match(content.headers.get('cache-control'), /\bno-store\b/);
  assert.equal(await content.text(), 'hello');
  const preview = await (
    await jsonRequest(`/projects/${project.id}/files/${reference.fileId}/preview`, owner)
  ).json();
  assert.equal(preview.ready, false);
  assert.equal(
    (await jsonRequest(`/projects/${project.id}/files/${reference.fileId}/preview`, outsider))
      .status,
    404,
  );
  const download = await fetch(
    `${base}/api/projects/${project.id}/files/${reference.fileId}/download`,
    { headers: viewer.headers, redirect: 'manual' },
  );
  assert.equal(download.status, 303);
  assert.equal(
    download.headers.get('location'),
    `http://file-service:8080/files/download/${reference.fileId}`,
  );
  const page = await (
    await jsonRequest(`/projects/${project.id}/pages`, owner, { name: '첨부 저장' })
  ).json();
  const node = createNode('fileUpload');
  node.props.attachment = reference;
  page.spec.root.children.push(node);
  const save = (revision) =>
    fetch(`${base}/api/pages/${page.id}`, {
      method: 'PUT',
      headers: { ...owner.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: page.name, spec: page.spec, baseRevision: revision }),
    });
  assert.equal((await save(1)).status, 200);
  const template = await (
    await jsonRequest('/templates', owner, {
      name: '파일 내보내기 템플릿',
      sourcePageId: page.id,
      spec: page.spec,
    })
  ).json();
  const templateContent = `/templates/${template.id}/files/${reference.fileId}/content`;
  assert.equal(await (await jsonRequest(templateContent, owner)).text(), 'hello');
  assert.equal((await jsonRequest(templateContent, viewer)).status, 404);
  assert.deepEqual(
    (await (await jsonRequest(`/pages/${page.id}`, owner)).json()).spec.root.children[0].props
      .attachment,
    reference,
  );
  node.props.attachment.fileId = 'unregistered';
  assert.equal((await save(2)).status, 400);
});

test('export file content enforces byte limits and never follows redirects or sends upload credentials', async () => {
  const client = new FileClient(
    'https://files.invalid',
    'private-upload-token',
    async (url, options) => {
      assert.equal(url, 'https://files.invalid/files/download/file-1');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers, undefined);
      return new Response('123456');
    },
  );
  await assert.rejects(client.content('file-1', 5), (error) => error.getStatus() === 413);
  assert.equal((await client.content('file-1', 6)).toString(), '123456');
});

test('file client uses multipart and keeps missing credentials, provider failures and malformed responses explicit', async () => {
  const file = {
    buffer: Buffer.from('hello'),
    size: 5,
    originalname: 'note.txt',
    mimetype: 'text/plain',
  };
  await assert.rejects(
    () => new FileClient('https://file.shnea.kr', '').upload(file, 'note.txt'),
    (error) => error.getStatus() === 503,
  );
  const client = new FileClient('https://file.shnea.kr', 'test-private', async (url, options) => {
    assert.equal(url, 'https://file.shnea.kr/files/upload');
    assert.equal(options.headers.Authorization, 'Bearer test-private');
    assert.equal(await options.body.get('file').text(), 'hello');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.equal(options.body.get('category'), null);
    return Response.json({ fileId: 14 }, { status: 201 });
  });
  assert.equal(await client.upload(file, 'note.txt'), '14');
  const monthlyClient = new FileClient(
    'https://file.shnea.kr',
    'test-private',
    async (_url, options) => {
      assert.equal(options.body.get('category'), 'month');
      assert.equal(await options.body.get('file').text(), 'hello');
      return Response.json({ fileId: 15 }, { status: 201 });
    },
  );
  assert.equal(await monthlyClient.upload(file, 'note.txt', 'month'), '15');
  for (const [upstream, status] of [
    [401, 503],
    [413, 413],
    [507, 507],
    [500, 502],
  ]) {
    await assert.rejects(
      () =>
        new FileClient(
          'https://file.shnea.kr',
          'test-private',
          async () => new Response('', { status: upstream }),
        ).upload(file, 'note.txt'),
      (error) => error.getStatus() === status && !error.message.includes('test-private'),
    );
  }
  await assert.rejects(
    () =>
      new FileClient('https://file.shnea.kr', 'test-private', async () =>
        Response.json({ result: 'unknown' }),
      ).upload(file, 'note.txt'),
    (error) => error.getStatus() === 502,
  );
  await assert.rejects(
    () =>
      new FileClient('https://file.shnea.kr', 'test-private', async () => {
        throw new Error('network failure');
      }).upload(file, 'note.txt'),
    (error) => error.getStatus() === 502,
  );
  assert.throws(
    () => validateUpload({ ...file, size: 11 }, 10),
    (error) => error.getStatus() === 413,
  );
  assert.throws(() =>
    validateUpload({ ...file, originalname: 'a.html', mimetype: 'text/html' }, 10),
  );
  assert.throws(() =>
    validateUpload({ ...file, originalname: 'a.json', mimetype: 'application/json' }, 10),
  );
});
