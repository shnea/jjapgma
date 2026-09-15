import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { createSpec, createNode } from '@jjapgma/ui-spec';
const base = process.env.BASE_URL;
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
after(() => db.end());
async function identity() {
  const id = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID();
  await db.query('INSERT INTO users(id,issuer,subject,display_name) VALUES($1,$2,$3,$4)', [
    id,
    'jjapgma:development',
    id,
    '권한 검증 사용자',
  ]);
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
    [createHash('sha256').update(token).digest('hex'), id, csrf],
  );
  return { id, token, csrf };
}
const request = (path, who, method = 'GET', body, extra = {}) =>
  fetch(`${base}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      ...(who ? { Cookie: `jjapgma_session=${who.token}`, 'X-CSRF-Token': who.csrf } : {}),
      ...extra,
    },
    ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  });
test('authentication, project isolation, viewer permissions, CSRF, atomic revision conflicts', async () => {
  assert.equal((await request('/projects')).status, 401);
  const owner = await identity(),
    outsider = await identity(),
    viewer = await identity();
  assert.equal(
    (
      await request(
        '/projects',
        owner,
        'POST',
        { name: 'bad origin' },
        { Origin: 'https://attacker.invalid' },
      )
    ).status,
    403,
  );
  assert.equal(
    (await request('/projects', owner, 'POST', { name: 'bad csrf' }, { 'X-CSRF-Token': '' }))
      .status,
    403,
  );
  const projectResponse = await request('/projects', owner, 'POST', { name: 'API 검증 프로젝트' });
  assert.equal(projectResponse.status, 201);
  const project = await projectResponse.json();
  assert.equal((await request(`/projects/${project.id}`, outsider)).status, 404);
  await db.query("INSERT INTO members VALUES($1,$2,'VIEWER')", [project.id, viewer.id]);
  assert.equal(
    (await request(`/projects/${project.id}/pages`, viewer, 'POST', { name: 'forbidden' })).status,
    403,
  );
  const created = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', { name: '초안' })
  ).json();
  assert.equal((await request(`/pages/${created.id}`, outsider)).status, 404);
  assert.equal((await request(`/pages/${created.id}`, viewer)).status, 200);
  const spec = createSpec();
  spec.root.children.push(createNode('heading'));
  const payload = { name: '수정한 화면', spec, baseRevision: 1 };
  assert.equal((await request(`/pages/${created.id}`, viewer, 'PUT', payload)).status, 403);
  const responses = await Promise.all([
    request(`/pages/${created.id}`, owner, 'PUT', payload),
    request(`/pages/${created.id}`, owner, 'PUT', payload),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const reloaded = await (await request(`/pages/${created.id}`, owner)).json();
  assert.equal(reloaded.revision, 2);
  assert.equal(reloaded.name, payload.name);
  assert.deepEqual(reloaded.spec, spec);
  const revisions = await db.query(
    'SELECT count(*)::int AS count FROM page_revisions WHERE page_id=$1',
    [created.id],
  );
  assert.equal(revisions.rows[0].count, 2);
  const malicious = structuredClone(spec);
  malicious.root.style.background = 'url(javascript:alert(1))';
  assert.equal(
    (
      await request(`/pages/${created.id}`, owner, 'PUT', {
        ...payload,
        spec: malicious,
        baseRevision: 2,
      })
    ).status,
    400,
  );
  await db.query('DELETE FROM members WHERE project_id=$1 AND user_id=$2', [project.id, viewer.id]);
  assert.equal((await request(`/pages/${created.id}`, viewer)).status, 404);
  await db.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1", [
    owner.id,
  ]);
  assert.equal((await request('/auth/me', owner)).status, 401);
});
test('migrations are repeatable, production rejects bypass, callback rejects missing state', async () => {
  execFileSync('node', ['apps/api/dist/database/migrate.js']);
  execFileSync('node', ['apps/api/dist/database/migrate.js']);
  assert.equal((await fetch(`${base}/auth/callback?code=invalid&state=invalid`)).status, 401);
  assert.throws(() =>
    execFileSync('node', ['apps/api/dist/config.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        APP_URL: 'https://jjapgma.shnea.kr',
        DEV_AUTH_BYPASS: 'true',
      },
      stdio: 'pipe',
    }),
  );
});
