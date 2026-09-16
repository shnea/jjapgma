import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { createNode, createSpec } from '@jjapgma/ui-spec';
import { mergeProposal } from '../../apps/api/dist/ai/merge-proposal.js';
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL }),
  base = process.env.BASE_URL;
after(() => db.end());
test('three-way merge retains independent fields, identifies edit/delete conflicts and conservatively rejects competing order changes', () => {
  const spec = createSpec();
  spec.root.children = [createNode('button'), createNode('text')];
  const before = { name: '화면', spec };
  const current = structuredClone(before),
    proposed = structuredClone(before);
  current.spec.root.children[0].style.color = '#123456';
  proposed.spec.root.children[0].props.text = 'AI';
  let result = mergeProposal(before, current, proposed);
  assert.equal(result.merged.spec.root.children[0].props.text, 'AI');
  assert.equal(result.merged.spec.root.children[0].style.color, '#123456');
  current.spec.root.children[0].props.text = '내 문구';
  assert.equal(mergeProposal(before, current, proposed).merged, null);
  current.spec.root.children.shift();
  assert.equal(mergeProposal(before, current, proposed).merged, null);
  const one = structuredClone(before),
    two = structuredClone(before);
  one.spec.root.children.push(createNode('button'));
  two.spec.root.children.unshift(createNode('text'));
  assert.equal(mergeProposal(before, one, two).merged, null);
  assert.deepEqual(mergeProposal(before, proposed, proposed).merged, proposed);
});
test('proposal review, merge and explicit overwrite use reviewed revision, preserve versions and enforce ownership', async () => {
  const id = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID();
  await db.query(
    'INSERT INTO users(id,issuer,subject,display_name) VALUES($1::uuid,$2,$1::text,$3)',
    [id, 'jjapgma:development', '병합 테스트'],
  );
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
    [createHash('sha256').update(token).digest('hex'), id, csrf],
  );
  async function req(path, method = 'GET', body) {
    await delay(80);
    return fetch(base + '/api' + path, {
      method,
      headers: {
        Origin: base,
        Cookie: `jjapgma_session=${token}`,
        'X-CSRF-Token': csrf,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  const project = await (await req('/projects', 'POST', { name: '병합' })).json();
  const page = await (await req(`/projects/${project.id}/pages`, 'POST', { name: '화면' })).json();
  const spec = createSpec();
  spec.root.children = [createNode('button')];
  assert.equal(
    (await req(`/pages/${page.id}`, 'PUT', { name: '화면', baseRevision: 1, spec })).status,
    200,
  );
  async function proposal(document, revision) {
    const pid = randomUUID();
    await db.query(
      'INSERT INTO ui_proposals(id,project_id,user_id,page_id,name,summary,spec,base_revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [pid, project.id, id, page.id, '화면', '문구 수정', document, revision],
    );
    return pid;
  }
  const ai = structuredClone(spec);
  ai.root.children[0].props.text = 'AI 문구';
  const first = await proposal(ai, 2);
  const mine = structuredClone(spec);
  mine.root.children[0].style.color = '#123456';
  await req(`/pages/${page.id}`, 'PUT', { name: '내 이름', baseRevision: 2, spec: mine });
  const review = await (await req(`/proposals/${first}/review`)).json();
  assert.equal(review.review.revision, 3);
  assert.equal(review.review.merged.name, '내 이름');
  assert.equal(review.review.merged.spec.root.children[0].style.color, '#123456');
  assert.equal((await req(`/proposals/${first}/apply`, 'POST', { mode: 'overwrite' })).status, 409);
  const saved = await (
    await req(`/proposals/${first}/apply`, 'POST', { mode: 'merge', expectedRevision: 3 })
  ).json();
  assert.equal(saved.revision, 4);
  assert.equal(saved.spec.root.children[0].props.text, 'AI 문구');
  assert.equal(saved.spec.root.children[0].style.color, '#123456');
  assert.equal(
    (
      await (
        await req(`/proposals/${first}/apply`, 'POST', { mode: 'merge', expectedRevision: 3 })
      ).json()
    ).revision,
    4,
  );
  const overwrite = structuredClone(saved.spec);
  overwrite.root.children[0].props.text = '덮어쓸 문구';
  const second = await proposal(overwrite, 4);
  const updated = structuredClone(saved.spec);
  updated.root.children[0].props.text = '직접 수정';
  await req(`/pages/${page.id}`, 'PUT', { name: '내 이름', baseRevision: 4, spec: updated });
  const conflict = await (await req(`/proposals/${second}/review`)).json();
  assert.equal(conflict.review.merged, null);
  assert.ok(conflict.review.conflicts.length);
  assert.equal(
    (await req(`/proposals/${second}/apply`, 'POST', { mode: 'merge', expectedRevision: 5 }))
      .status,
    409,
  );
  await req(`/pages/${page.id}`, 'PUT', { name: '또 수정', baseRevision: 5, spec: updated });
  assert.equal(
    (await req(`/proposals/${second}/apply`, 'POST', { mode: 'overwrite', expectedRevision: 5 }))
      .status,
    409,
  );
  const replaced = await (
    await req(`/proposals/${second}/apply`, 'POST', { mode: 'overwrite', expectedRevision: 6 })
  ).json();
  assert.equal(replaced.revision, 7);
  assert.equal(replaced.spec.root.children[0].props.text, '덮어쓸 문구');
  assert.equal(
    (await db.query('SELECT spec FROM page_revisions WHERE page_id=$1 AND revision=6', [page.id]))
      .rows[0].spec.root.children[0].props.text,
    '직접 수정',
  );
  assert.equal((await fetch(base + `/api/proposals/${second}/review`)).status, 401);
});
