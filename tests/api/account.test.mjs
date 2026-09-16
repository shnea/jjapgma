import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL }),
  base = process.env.BASE_URL;
const hash = (v) => createHash('sha256').update(v).digest('hex');
after(() => db.end());
async function user() {
  const id = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID();
  await db.query(
    'INSERT INTO users(id,issuer,subject,display_name,email) VALUES($1::uuid,$2,$1::text,$3,$4)',
    [id, 'jjapgma:development', 'tester', `${id}@example.com`],
  );
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
    [hash(token), id, csrf],
  );
  return { id, token, csrf };
}
async function req(path, who, method = 'GET', body, headers = {}) {
  await delay(100);
  return fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      Cookie: `jjapgma_session=${who.token}`,
      'X-CSRF-Token': who.csrf,
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test('nicknames are private account changes, allow duplicates, reset and persist independently of login names', async () => {
  const a = await user(),
    b = await user();
  for (const who of [a, b]) {
    assert.equal(
      (await req('/account/profile', who, 'PATCH', { nickname: '  같은 이름  ' })).status,
      200,
    );
    const identity = await (await req('/auth/me', who)).json();
    assert.equal(identity.displayName, '같은 이름');
    assert.equal(identity.nickname, '같은 이름');
  }
  await db.query('UPDATE users SET display_name=$2 WHERE id=$1', [a.id, '새 로그인 이름']);
  assert.equal((await (await req('/auth/me', a)).json()).displayName, '같은 이름');
  assert.equal(
    (await req('/account/profile', a, 'PATCH', { nickname: '금지' }, { 'X-CSRF-Token': 'wrong' }))
      .status,
    403,
  );
  for (const nickname of ['', 'a'.repeat(41), 'control\u0001name'])
    assert.equal((await req('/account/profile', a, 'PATCH', { nickname })).status, 400);
  assert.equal(
    (await req('/account/profile', a, 'PATCH', { nickname: '금지', id: b.id })).status,
    400,
  );
  assert.equal((await req('/account/profile', a, 'PATCH', { nickname: null })).status, 200);
  assert.equal((await (await req('/auth/me', a)).json()).displayName, '새 로그인 이름');
});
test('usage reports authenticate per run, accumulate once, preserve unknowns, survive project deletion and isolate accounts', async () => {
  const a = await user(),
    b = await user();
  const project = await (await req('/projects', a, 'POST', { name: '사용량 경계' })).json();
  const run = randomUUID(),
    token = randomUUID(),
    unknown = randomUUID();
  await db.query(
    "INSERT INTO ai_usage_runs(id,user_id,project_id,report_token_hash,status) VALUES($1,$2,$3,$4,'failed'),($5,$2,$3,$4,'completed')",
    [run, a.id, project.id, hash(token), unknown],
  );
  const report = async (body, credential = token, id = run) =>
    req(`/ai/usage/${id}`, a, 'POST', body, { Authorization: `Bearer ${credential}` });
  const first = {
    id: 'model:0',
    model: 'fixture/model',
    inputTokens: 100,
    outputTokens: 20,
    totalTokens: 120,
  };
  assert.equal((await report({ complete: false, calls: [first] }, 'wrong')).status, 401);
  assert.equal((await report({ complete: false, calls: [first] })).status, 201);
  assert.equal((await report({ complete: false, calls: [first] })).status, 201);
  assert.equal(
    (await report({ complete: false, calls: [{ ...first, inputTokens: 90 }] })).status,
    409,
  );
  assert.equal(
    (await report({ complete: false, calls: [{ ...first, id: 'negative', inputTokens: -1 }] }))
      .status,
    400,
  );
  const second = { id: 'model:1', model: 'fixture/model', inputTokens: 60, outputTokens: 10 };
  assert.equal((await report({ complete: true, calls: [first, second] })).status, 201);
  assert.equal((await report({ complete: true, calls: [first, second] })).status, 201);
  assert.equal((await report({ complete: true, calls: [{ ...second, id: 'new' }] })).status, 409);
  const usage = await (await req('/account/usage', a)).json();
  const all = usage.summary.find((v) => v.period === 'all');
  assert.equal(all.total_tokens, 190);
  assert.equal(all.input_tokens, 160);
  assert.equal(all.output_tokens, 30);
  assert.equal(all.unknown, 1);
  assert.equal(usage.items.find((v) => v.id === run).status, 'failed');
  assert.equal(usage.items.find((v) => v.id === unknown).complete, false);
  assert.ok(!JSON.stringify(usage).includes(token));
  assert.ok(!JSON.stringify(usage).includes(hash(token)));
  assert.equal((await (await req('/account/usage', b)).json()).items.length, 0);
  assert.equal((await req('/account/usage', { ...a, token: 'wrong' })).status, 401);
  assert.equal((await req('/account/usage?offset=-1', a)).status, 400);
  assert.equal((await req(`/projects/${project.id}`, a, 'DELETE')).status, 200);
  assert.equal(
    (await (await req('/account/usage', a)).json()).summary.find((v) => v.period === 'all')
      .total_tokens,
    190,
  );
  await db.query("UPDATE ai_usage_runs SET expires_at=now()-interval '1 second' WHERE id=$1", [
    run,
  ]);
  assert.equal((await report({ complete: true, calls: [first, second] })).status, 401);
});
test('real chat acceptance creates a usage ledger and ingests multi-step gateway usage', async () => {
  const who = await user();
  const project = await (await req('/projects', who, 'POST', { name: '사용량 채팅' })).json();
  const page = await (
    await req(`/projects/${project.id}/pages`, who, 'POST', { name: '화면' })
  ).json();
  const accepted = await req(`/projects/${project.id}/chat`, who, 'POST', {
    pageId: page.id,
    message: '사용량 연동 테스트',
    currentRevision: page.revision,
    selectedNodeIds: [],
    currentBreakpoint: 'desktop',
  });
  assert.equal(accepted.status, 201);
  const { runId } = await accepted.json();
  let ledger;
  for (let i = 0; i < 40; i++) {
    ledger = (await db.query('SELECT * FROM ai_usage_runs WHERE id=$1', [runId])).rows[0];
    if (ledger?.status !== 'running') break;
    await delay(250);
  }
  assert.equal(ledger.status, 'completed');
  assert.equal(ledger.complete, true);
  const record = (await (await req('/account/usage', who)).json()).items[0];
  assert.equal(record.calls, 2);
  assert.equal(record.total_tokens, 210);
});
