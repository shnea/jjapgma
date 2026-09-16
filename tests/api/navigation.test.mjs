import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { setTimeout as delay } from 'node:timers/promises';
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const base = process.env.BASE_URL;
after(() => db.end());
async function identity() {
  const id = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID(),
    email = `${randomUUID()}@example.com`;
  await db.query('INSERT INTO users(id,issuer,subject,display_name,email) VALUES($1,$2,$3,$4,$5)', [
    id,
    'jjapgma:development',
    id,
    email.split('@')[0],
    email,
  ]);
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
    [createHash('sha256').update(token).digest('hex'), id, csrf],
  );
  return { id, token, csrf, email };
}
async function request(path, who, method = 'GET', body, headers = {}) {
  // Other API suites share the same Nginx client address; stay within its real request limit.
  await delay(100);
  return fetch(`${base}/api${path}`, {
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

test('main menu saves three levels and rejects a fourth without changing the saved revision', async () => {
  const owner = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '3단 메뉴' })).json();
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', {
      name: '메인',
      templateId: 'main',
    })
  ).json();
  const menu = page.spec.root.children[1].children[0].children[0];
  menu.props.menuItems = [
    {
      id: 'one',
      label: '대메뉴',
      children: [{ id: 'two', label: '중메뉴', children: [{ id: 'three', label: '소메뉴' }] }],
    },
  ];
  const saved = await request(`/pages/${page.id}`, owner, 'PUT', {
    name: page.name,
    spec: page.spec,
    baseRevision: page.revision,
  });
  assert.equal(saved.status, 200);
  const revision = (await saved.json()).revision;
  menu.props.menuItems[0].children[0].children[0].children = [{ id: 'four', label: '거절' }];
  assert.equal(
    (
      await request(`/pages/${page.id}`, owner, 'PUT', {
        name: page.name,
        spec: page.spec,
        baseRevision: revision,
      })
    ).status,
    400,
  );
  const reloaded = await (await request(`/pages/${page.id}`, owner)).json();
  assert.equal(reloaded.revision, revision);
  assert.equal(
    reloaded.spec.root.children[1].children[0].children[0].props.menuItems[0].children[0]
      .children[0].children,
    undefined,
  );
});

test('personal templates isolate accounts, validate sources and retain files independently of the source project', async () => {
  const owner = await identity(),
    stranger = await identity(),
    reader = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '템플릿 원본' })).json();
  const target = await (await request('/projects', owner, 'POST', { name: '템플릿 대상' })).json();
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', {
      name: '원본',
      templateId: 'landing',
    })
  ).json();
  await request(`/projects/${project.id}/sharing`, owner, 'POST', {
    email: reader.email,
    role: 'VIEWER',
  });
  const payload = { name: '내 화면', sourcePageId: page.id, spec: page.spec };
  assert.equal((await request('/templates', stranger, 'POST', payload)).status, 404);
  assert.equal((await request('/templates', reader, 'POST', payload)).status, 403);
  assert.equal(
    (await request('/templates', owner, 'POST', payload, { 'X-CSRF-Token': '' })).status,
    403,
  );
  assert.equal((await request('/templates', owner, 'POST', { ...payload, spec: {} })).status, 400);
  const image = structuredClone(page.spec.root.children[0].children[0]);
  image.id = randomUUID();
  image.type = 'image';
  image.children = [];
  image.props = {
    text: '로고',
    attachment: { fileId: 'template-image', name: 'logo.png', mimeType: 'image/png' },
  };
  payload.spec.root.children.push(image);
  assert.equal((await request('/templates', owner, 'POST', payload)).status, 400);
  await db.query(
    'INSERT INTO project_files(project_id,file_id,original_name,mime_type,byte_size,uploaded_by) VALUES($1,$2,$3,$4,$5,$6)',
    [project.id, 'template-image', 'logo.png', 'image/png', 128, owner.id],
  );
  const savedResponse = await request('/templates', owner, 'POST', payload);
  assert.equal(savedResponse.status, 201);
  const saved = await savedResponse.json();
  assert.equal((await (await request('/templates', owner)).json())[0].name, '내 화면');
  assert.equal((await (await request('/templates', stranger)).json()).length, 0);
  for (const method of ['GET', 'DELETE'])
    assert.equal((await request(`/templates/${saved.id}`, stranger, method)).status, 404);
  assert.equal(
    (await request(`/templates/${saved.id}/use`, stranger, 'POST', { projectId: target.id }))
      .status,
    404,
  );
  assert.equal(
    (await request(`/templates/${saved.id}/files/template-image/preview`, stranger)).status,
    404,
  );
  assert.equal(
    (await request(`/templates/${saved.id}/files/unregistered/preview`, owner)).status,
    404,
  );
  const viewOnlyTarget = await (
    await request('/projects', stranger, 'POST', { name: '보기 전용' })
  ).json();
  await request(`/projects/${viewOnlyTarget.id}/sharing`, stranger, 'POST', {
    email: owner.email,
    role: 'VIEWER',
  });
  assert.equal(
    (await request(`/templates/${saved.id}/use`, owner, 'POST', { projectId: viewOnlyTarget.id }))
      .status,
    403,
  );
  await request(`/projects/${project.id}`, owner, 'DELETE');
  const snapshot = await (await request(`/templates/${saved.id}`, owner)).json();
  assert.deepEqual(snapshot.spec, payload.spec);
  const used = await request(`/templates/${saved.id}/use`, owner, 'POST', { projectId: target.id });
  assert.equal(used.status, 201);
  const destination = await (
    await request(`/projects/${target.id}/pages`, owner, 'POST', { name: '재사용' })
  ).json();
  assert.equal(
    (
      await request(`/pages/${destination.id}`, owner, 'PUT', {
        name: '재사용',
        spec: snapshot.spec,
        baseRevision: 1,
      })
    ).status,
    200,
  );
  assert.equal((await request(`/templates/${saved.id}`, owner, 'DELETE')).status, 200);
  assert.equal((await request(`/templates/${saved.id}`, owner)).status, 404);
  assert.equal(
    (await db.query('SELECT 1 FROM template_files WHERE template_id=$1', [saved.id])).rowCount,
    0,
  );
  assert.equal(
    (
      await db.query('SELECT 1 FROM project_files WHERE project_id=$1 AND file_id=$2', [
        target.id,
        'template-image',
      ])
    ).rowCount,
    1,
  );
  assert.deepEqual(
    (await (await request(`/pages/${destination.id}`, owner)).json()).spec,
    snapshot.spec,
  );
});
test('shared project notifications are recipient-only, persistent, idempotent and hidden after revocation', async () => {
  const owner = await identity(),
    reader = await identity(),
    stranger = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '알림 대상' })).json();
  await request(`/projects/${project.id}/sharing`, owner, 'POST', {
    email: reader.email,
    role: 'VIEWER',
  });
  let inbox = await (await request('/notifications', reader)).json();
  assert.equal(inbox.unreadCount, 1);
  assert.equal(inbox.items[0].projectId, project.id);
  const notificationId = inbox.items[0].id;
  assert.equal((await (await request('/notifications', owner)).json()).items.length, 0);
  assert.equal((await (await request('/notifications', stranger)).json()).items.length, 0);
  assert.equal(
    (await request(`/notifications/${notificationId}/read`, stranger, 'PATCH')).status,
    404,
  );
  assert.equal(
    (
      await request(`/notifications/${notificationId}/read`, reader, 'PATCH', undefined, {
        'X-CSRF-Token': '',
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(`/notifications/${notificationId}/read`, reader, 'PATCH')).status,
    200,
  );
  inbox = await (await request('/notifications', reader)).json();
  assert.equal(inbox.unreadCount, 0);
  assert.ok(inbox.items[0].readAt);
  await request('/projects', reader);
  assert.equal((await (await request('/notifications', reader)).json()).items.length, 1);
  await request(`/projects/${project.id}/members/${reader.id}`, owner, 'DELETE');
  assert.equal((await (await request('/notifications', reader)).json()).items.length, 0);
  assert.equal(
    (await request(`/notifications/${notificationId}/read`, reader, 'PATCH')).status,
    404,
  );
  await request(`/projects/${project.id}/sharing`, owner, 'POST', {
    email: reader.email,
    role: 'EDITOR',
  });
  inbox = await (await request('/notifications', reader)).json();
  assert.equal(inbox.items.length, 1);
  assert.notEqual(inbox.items[0].id, notificationId);
  await request('/notifications/read-all', reader, 'PATCH');
  assert.equal((await (await request('/notifications', reader)).json()).unreadCount, 0);
});
test('page trash preserves versions, enforces access and restores a selected version without overwriting history', async () => {
  const owner = await identity(),
    viewer = await identity(),
    editor = await identity(),
    stranger = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '페이지 관리' })).json();
  for (const [who, role] of [
    [viewer, 'VIEWER'],
    [editor, 'EDITOR'],
  ])
    await request(`/projects/${project.id}/sharing`, owner, 'POST', { email: who.email, role });
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', { name: '삭제할 페이지' })
  ).json();
  const other = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', { name: '유지할 페이지' })
  ).json();
  assert.equal(
    (await request(`/pages/${page.id}`, viewer, 'DELETE', { baseRevision: 1 })).status,
    403,
  );
  assert.equal(
    (await request(`/pages/${page.id}`, stranger, 'DELETE', { baseRevision: 1 })).status,
    404,
  );
  assert.equal((await request(`/pages/${page.id}`, owner, 'DELETE', {})).status, 400);
  const saved = await (
    await request(`/pages/${page.id}`, editor, 'PUT', {
      name: '이름 변경',
      spec: page.spec,
      baseRevision: 1,
    })
  ).json();
  assert.equal(saved.revision, 2);
  assert.equal(
    (await request(`/pages/${page.id}`, owner, 'DELETE', { baseRevision: 1 })).status,
    409,
  );
  assert.equal(
    (await request(`/pages/${page.id}`, editor, 'DELETE', { baseRevision: 2 })).status,
    200,
  );
  assert.equal((await request(`/pages/${page.id}`, owner)).status, 404);
  assert.equal(
    (
      await db.query('SELECT count(*)::int AS count FROM page_revisions WHERE page_id=$1', [
        page.id,
      ])
    ).rows[0].count,
    2,
  );
  assert.equal((await request(`/pages/${other.id}`, owner)).status, 200);
  const path = `/pages/${page.id}`;
  assert.equal((await request(`/projects/${project.id}/deleted-pages`, viewer)).status, 403);
  assert.equal((await request(`/projects/${project.id}/deleted-pages`, stranger)).status, 404);
  assert.equal(
    (await (await request(`/projects/${project.id}/deleted-pages`, editor)).json())[0].id,
    page.id,
  );
  assert.deepEqual(
    (await (await request(`/projects/${project.id}/pages`, owner)).json()).map((p) => p.id),
    [other.id],
  );
  const projects = await (await request('/projects', owner)).json();
  assert.equal(projects.find((p) => p.id === project.id).pageCount, 1);
  assert.equal(
    (await request(path, owner, 'PUT', { name: 'stale', spec: page.spec, baseRevision: 2 })).status,
    404,
  );
  assert.equal((await request(`${path}/revisions`, viewer)).status, 403);
  assert.equal((await request(`${path}/revisions/1`, stranger)).status, 404);
  assert.deepEqual(
    (await (await request(`${path}/revisions?before=2`, editor)).json()).map((v) => v.revision),
    [1],
  );
  const restore = { revision: 1, baseRevision: 2 };
  assert.equal((await request(`${path}/restore`, viewer, 'POST', restore)).status, 403);
  assert.equal((await request(`${path}/restore`, stranger, 'POST', restore)).status, 404);
  assert.equal(
    (await request(`${path}/restore`, owner, 'POST', restore, { 'X-CSRF-Token': '' })).status,
    403,
  );
  assert.equal(
    (await request(`${path}/restore`, owner, 'POST', { ...restore, baseRevision: 1 })).status,
    409,
  );
  assert.equal(
    (await request(`${path}/restore`, owner, 'POST', { ...restore, revision: 99 })).status,
    404,
  );
  const restored = await (await request(`${path}/restore`, editor, 'POST', restore)).json();
  assert.equal(restored.revision, 3);
  assert.equal(restored.name, page.name);
  assert.deepEqual(restored.spec, page.spec);
  assert.equal((await request(`${path}/restore`, owner, 'POST', restore)).status, 409);
  assert.equal((await request(path, viewer)).status, 200);
  assert.equal((await (await request(`${path}/revisions/2`, owner)).json()).name, '이름 변경');
  assert.equal(
    (await (await request(`/projects/${project.id}/deleted-pages`, owner)).json()).length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM audit WHERE target_id=$1 AND action='page.delete'",
        [page.id],
      )
    ).rows[0].count,
    1,
  );
});
test('template creation validates IDs, stores editable spec and enforces project roles', async () => {
  const owner = await identity(),
    viewer = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '템플릿 검증' })).json();
  await request(`/projects/${project.id}/sharing`, owner, 'POST', {
    email: viewer.email,
    role: 'VIEWER',
  });
  const path = `/projects/${project.id}/pages`;
  assert.equal(
    (await request(path, viewer, 'POST', { name: '거부', templateId: 'landing' })).status,
    403,
  );
  assert.equal(
    (await request(path, owner, 'POST', { name: '오류', templateId: 'unknown' })).status,
    400,
  );
  for (const templateId of ['landing', 'dashboard', 'management', 'form', 'login']) {
    const response = await request(path, owner, 'POST', { name: templateId, templateId });
    assert.equal(response.status, 201);
    const page = await response.json();
    assert.ok(page.spec.theme.primary);
    assert.ok(page.spec.root.children.length);
    assert.equal(
      (await (await request(`/pages/${page.id}/revisions/1`, owner)).json()).spec.theme.primary,
      page.spec.theme.primary,
    );
  }
});
