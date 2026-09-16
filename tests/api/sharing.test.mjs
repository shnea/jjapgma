import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Database } from '../../apps/api/dist/database/database.js';
import { SharingService } from '../../apps/api/dist/sharing/sharing.service.js';
import { NotifyService } from '../../apps/api/dist/sharing/notify.service.js';
import { config } from '../../apps/api/dist/config.js';
import { identityEmail } from '../../apps/api/dist/auth/email.js';
import { AuthService } from '../../apps/api/dist/auth/auth.service.js';
import { OidcService } from '../../apps/api/dist/auth/oidc.service.js';
const db = new Database();
const service = new SharingService(db, new NotifyService());
const base = process.env.BASE_URL;
after(() => db.pool.end());
async function identity(email = `${randomUUID()}@example.com`) {
  const id = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID();
  await db.pool.query(
    'INSERT INTO users(id,issuer,subject,display_name,email) VALUES($1,$2,$5,$3,$4)',
    [id, 'jjapgma:development', email.split('@')[0], email, id],
  );
  await db.pool.query(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
    [createHash('sha256').update(token).digest('hex'), id, csrf],
  );
  return { id, token, csrf, email };
}
async function request(path, who, method = 'GET', body, extra = {}) {
  // Parallel suites share Nginx's request budget; preserve the real server limit.
  await delay(100);
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: base,
      'Content-Type': 'application/json',
      Cookie: `jjapgma_session=${who.token}`,
      'X-CSRF-Token': who.csrf,
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function project(owner) {
  const response = await request('/projects', owner, 'POST', { name: '공유 권한 검증' });
  assert.equal(response.status, 201);
  return (await response.json()).id;
}
test('auto sharing grants by email, denies non-owner management, changes role and revokes active sessions', async () => {
  const owner = await identity(),
    recipient = await identity(),
    stranger = await identity();
  const id = await project(owner);
  assert.equal((await request(`/projects/${id}/sharing`, stranger)).status, 404);
  assert.equal(
    (
      await request(
        `/projects/${id}/sharing`,
        owner,
        'POST',
        { email: recipient.email, role: 'VIEWER' },
        { 'X-CSRF-Token': '' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/projects/${id}/sharing`, owner, 'POST', {
        email: recipient.email.toUpperCase(),
        role: 'VIEWER',
      })
    ).status,
    201,
  );
  assert.equal((await request(`/projects/${id}`, recipient)).status, 200);
  assert.equal(
    (await request(`/projects/${id}/pages`, recipient, 'POST', { name: 'denied' })).status,
    403,
  );
  assert.equal((await request(`/projects/${id}/sharing`, recipient)).status, 403);
  assert.equal(
    (await request(`/projects/${id}/members/${recipient.id}`, owner, 'PATCH', { role: 'EDITOR' }))
      .status,
    200,
  );
  assert.equal(
    (await request(`/projects/${id}/pages`, recipient, 'POST', { name: 'allowed' })).status,
    201,
  );
  assert.equal((await request(`/projects/${id}`, recipient, 'DELETE')).status, 403);
  assert.equal(
    (
      await request(`/projects/${id}/sharing`, recipient, 'POST', {
        email: stranger.email,
        role: 'EDITOR',
      })
    ).status,
    403,
  );
  assert.equal((await request(`/projects/${id}/members/${owner.id}`, owner, 'DELETE')).status, 403);
  assert.equal(
    (await request(`/projects/${id}/members/${recipient.id}`, owner, 'PATCH', { role: 'OWNER' }))
      .status,
    400,
  );
  assert.equal(
    (
      await request(`/projects/${id}/sharing`, owner, 'POST', {
        email: recipient.email,
        role: 'VIEWER',
      })
    ).status,
    409,
  );
  assert.equal(
    (await request(`/projects/${id}/members/${recipient.id}`, owner, 'DELETE')).status,
    200,
  );
  assert.equal((await request(`/projects/${id}`, recipient)).status, 404);
  await request('/projects', recipient);
  assert.equal((await request(`/projects/${id}`, recipient)).status, 404);
  assert.equal(
    (await request(`/projects/${id}/pages`, recipient, 'POST', { name: 'revoked' })).status,
    404,
  );
});
test('auto sharing links first visitors, supports pending changes and cancellation, never reassigns an existing member', async () => {
  const owner = await identity(),
    id = await project(owner),
    email = `${randomUUID()}@example.com`;
  let response = await request(`/projects/${id}/sharing`, owner, 'POST', { email, role: 'VIEWER' });
  assert.equal(response.status, 201);
  let pending = (await response.json()).invitations[0];
  assert.equal(pending.mode, 'auto');
  await request(`/projects/${id}/invitations/${pending.id}`, owner, 'PATCH', { role: 'EDITOR' });
  const visitor = await identity(email);
  const list = await (await request('/projects', visitor)).json();
  assert.equal(list.find((p) => p.id === id).role, 'EDITOR');
  await db.pool.query('UPDATE users SET email=$2 WHERE id=$1', [
    visitor.id,
    `${randomUUID()}@example.com`,
  ]);
  const newAccount = await identity(email);
  assert.equal(
    (await (await request('/projects', newAccount)).json()).some((p) => p.id === id),
    false,
  );
  assert.equal((await request(`/projects/${id}`, visitor)).status, 200);
  const canceledEmail = `${randomUUID()}@example.com`;
  response = await request(`/projects/${id}/sharing`, owner, 'POST', {
    email: canceledEmail,
    role: 'VIEWER',
  });
  pending = (await response.json()).invitations[0];
  await request(`/projects/${id}/invitations/${pending.id}`, owner, 'DELETE');
  const canceled = await identity(canceledEmail);
  assert.equal(
    (await (await request('/projects', canceled)).json()).some((p) => p.id === id),
    false,
  );
});
test('email invitations require matching account and explicit acceptance; failed delivery never grants access', async () => {
  config.SHARE_APPROVAL_MODE = 'email';
  const owner = await identity(),
    recipient = await identity(),
    stranger = await identity(),
    id = await project(owner);
  const added = await service.add(id, owner.id, recipient.email, 'VIEWER');
  const invitation = added.invitations[0];
  assert.equal(invitation.notificationStatus, 'QUEUED');
  const messages = await (await fetch('http://file-service:8080/test/notifications')).json();
  const message = messages.find((m) => m.payload.to.email === recipient.email);
  const token = /\/invitations#([A-Za-z0-9_-]{43})/.exec(message.payload.content)[1];
  assert.ok(message.key.includes(invitation.id));
  assert.equal((await request(`/projects/${id}`, recipient)).status, 404);
  // Existing invitations retain their original mode when server configuration changes.
  config.SHARE_APPROVAL_MODE = 'auto';
  await request('/projects', recipient);
  assert.equal((await request(`/projects/${id}`, recipient)).status, 404);
  assert.equal((await request('/invitations/preview', stranger, 'POST', { token })).status, 403);
  assert.equal((await request('/invitations/preview', recipient, 'POST', { token })).status, 201);
  assert.equal((await request(`/projects/${id}`, recipient)).status, 404);
  assert.equal((await request('/invitations/accept', recipient, 'POST', { token })).status, 201);
  assert.equal((await request('/invitations/accept', recipient, 'POST', { token })).status, 201);
  assert.equal((await request(`/projects/${id}`, recipient)).status, 200);
  await service.member(id, owner.id, recipient.id);
  assert.equal((await request('/invitations/accept', recipient, 'POST', { token })).status, 404);
  config.SHARE_APPROVAL_MODE = 'email';
  const failedEmail = `notify-failure-${randomUUID()}@example.com`;
  const failed = await service.add(id, owner.id, failedEmail, 'EDITOR');
  const failedInvitation = failed.invitations.find((i) => i.email === failedEmail);
  assert.equal(failedInvitation.notificationStatus, 'FAILED');
  const failedUser = await identity(failedEmail);
  await request('/projects', failedUser);
  assert.equal((await request(`/projects/${id}`, failedUser)).status, 404);
  const retry = await service.deliver(id, failedInvitation.id, owner.id);
  assert.equal(
    retry.invitations.find((i) => i.id === failedInvitation.id).notificationStatus,
    'FAILED',
  );
  config.SHARE_APPROVAL_MODE = 'auto';
});
test('email invitations expire, revoke and preserve one idempotent notification event', async () => {
  config.SHARE_APPROVAL_MODE = 'email';
  const owner = await identity(),
    recipient = await identity(),
    id = await project(owner);
  const data = await service.add(id, owner.id, recipient.email, 'EDITOR');
  const invitation = data.invitations[0];
  const messages = await (await fetch('http://file-service:8080/test/notifications')).json();
  const message = messages.find((m) => m.payload.to.email === recipient.email);
  const token = /\/invitations#([A-Za-z0-9_-]{43})/.exec(message.payload.content)[1];
  // Simulate lost acknowledgment: retry the original payload and idempotency key.
  await db.pool.query("UPDATE project_invitations SET notification_status='FAILED' WHERE id=$1", [
    invitation.id,
  ]);
  await service.deliver(id, invitation.id, owner.id);
  const afterRetry = await (await fetch('http://file-service:8080/test/notifications')).json();
  assert.equal(afterRetry.filter((m) => m.payload.to.email === recipient.email).length, 1);
  await db.pool.query(
    "UPDATE project_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",
    [invitation.id],
  );
  assert.equal((await request('/invitations/accept', recipient, 'POST', { token })).status, 404);
  const replacement = await service.add(id, owner.id, recipient.email, 'VIEWER');
  await service.invitation(id, owner.id, replacement.invitations[0].id);
  const messages2 = await (await fetch('http://file-service:8080/test/notifications')).json();
  const message2 = messages2.find((m) => m.key.includes(replacement.invitations[0].id));
  const token2 = /\/invitations#([A-Za-z0-9_-]{43})/.exec(message2.payload.content)[1];
  assert.equal(
    (await request('/invitations/accept', recipient, 'POST', { token: token2 })).status,
    404,
  );
  config.SHARE_APPROVAL_MODE = 'auto';
});
test('provider-owned email is normalized, explicit unverified and malformed addresses are rejected', () => {
  assert.equal(identityEmail({ email: ' Person@Example.com ' }), 'person@example.com');
  assert.equal(identityEmail({ email: 'person@example.com', email_verified: false }), null);
  assert.equal(identityEmail({ email: 'not-email' }), null);
});

test('login callback updates existing display names and resolves pending auto shares without merging identities', async () => {
  const owner = await identity(),
    id = await project(owner);
  const subject = randomUUID(),
    email = `local-part-${randomUUID()}@example.com`;
  assert.equal(
    (await request(`/projects/${id}/sharing`, owner, 'POST', { email, role: 'EDITOR' })).status,
    201,
  );
  const oidc = new OidcService();
  const auth = new AuthService(db, {
    exchange: async () => ({
      access_token: 'fixture',
      id_token: 'verified-by-fixture',
      expires_in: 900,
    }),
    identity: async () => ({
      sub: subject,
      email,
      email_verified: true,
      name: 'Ignored full name',
    }),
    email: (tokens, claims) => oidc.email(tokens, claims),
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const state = randomUUID();
    await db.pool.query("INSERT INTO login_attempts VALUES($1,$2,$3,now()+interval '1 minute')", [
      createHash('sha256').update(state).digest('hex'),
      'nonce',
      'verifier',
    ]);
    await auth.callback(
      { query: { state, code: 'fixture-code' }, headers: { cookie: `jjapgma_login=${state}` } },
      {
        clearCookie() {},
        cookie() {},
        redirect(path) {
          assert.equal(path, '/');
        },
      },
    );
  }
  const users = await db.pool.query(
    'SELECT id,display_name FROM users WHERE issuer=$1 AND subject=$2',
    [config.issuer, subject],
  );
  assert.equal(users.rowCount, 1);
  assert.equal(users.rows[0].display_name, email.split('@')[0]);
  assert.equal(
    (
      await db.pool.query('SELECT role FROM members WHERE project_id=$1 AND user_id=$2', [
        id,
        users.rows[0].id,
      ])
    ).rows[0].role,
    'EDITOR',
  );
});

test('userinfo email must belong to the verified subject and explicit unverified claims never fall back', async () => {
  const originalFetch = globalThis.fetch;
  const oidc = new OidcService();
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ sub: 'other-user', email: 'other@example.com' }));
    };
    assert.equal(
      await oidc.email({ access_token: 'fixture', expires_in: 900 }, { sub: 'expected-user' }),
      null,
    );
    assert.equal(calls, 1);
    assert.equal(
      await oidc.email(
        { access_token: 'fixture', expires_in: 900 },
        { sub: 'expected-user', email: 'other@example.com', email_verified: false },
      ),
      null,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
