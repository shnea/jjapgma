import { expect, type Page } from '@playwright/test';
import type { UiSpec } from '@jjapgma/ui-spec';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

export async function openSpec(page: Page, spec: UiSpec, name: string) {
  // Screen tests need isolated accounts; builder.spec.ts covers the login UI.
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const userId = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID();
  try {
    await db.query(
      'INSERT INTO users(id,issuer,subject,display_name) VALUES($1::uuid,$2,$1::text,$3)',
      [userId, 'jjapgma:development', '화면 검증 사용자'],
    );
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
      [createHash('sha256').update(token).digest('hex'), userId, csrf],
    );
  } finally {
    await db.end();
  }
  await page
    .context()
    .addCookies([{ name: 'jjapgma_session', value: token, url: process.env.BASE_URL! }]);
  const identityResponse = await page.request.get('/api/auth/me');
  expect(identityResponse.ok()).toBe(true);
  const identity = await identityResponse.json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': identity.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name } })
  ).json();
  const initial = await (
    await page.request.post(`/api/projects/${project.id}/pages`, { headers, data: { name } })
  ).json();
  expect(
    (
      await page.request.put(`/api/pages/${initial.id}`, {
        headers,
        data: { name, spec, baseRevision: 1 },
      })
    ).ok(),
  ).toBe(true);
  await page.goto('/projects/' + project.id);
  await expect(page.getByLabel('캔버스 너비')).toBeVisible();
  return { initial, headers };
}
