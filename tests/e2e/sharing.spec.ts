import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

test('email invitation survives the login boundary and grants access only after explicit acceptance', async ({
  page,
  context,
}) => {
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const userId = randomUUID(),
    ownerId = randomUUID(),
    projectId = randomUUID();
  const session = randomUUID(),
    csrf = randomUUID();
  const token = createHash('sha256').update(randomUUID()).digest('base64url');
  const email = `invite-${randomUUID()}@example.com`;
  try {
    for (const [id, address] of [
      [ownerId, `${randomUUID()}@example.com`],
      [userId, email],
    ]) {
      await db.query(
        'INSERT INTO users(id,issuer,subject,display_name,email) VALUES($1,$2,$3,$4,$5)',
        [id, 'jjapgma:development', id, address.split('@')[0], address],
      );
    }
    await db.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
      projectId,
      '메일 수락 브라우저 검증',
    ]);
    await db.query("INSERT INTO members VALUES($1,$2,'OWNER')", [projectId, ownerId]);
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
      [createHash('sha256').update(session).digest('hex'), userId, csrf],
    );
    await db.query(
      "INSERT INTO project_invitations(id,project_id,email,role,mode,status,created_by,expires_at,token_hash) VALUES($1,$2,$3,'VIEWER','email','PENDING',$4,now()+interval '1 hour',$5)",
      [randomUUID(), projectId, email, ownerId, createHash('sha256').update(token).digest('hex')],
    );
  } finally {
    await db.end();
  }
  await page.goto(`/invitations#${token}`);
  await expect(page.getByRole('link', { name: 'Shnea 계정으로 로그인' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  // Simulate the server session established by the external login callback.
  await context.addCookies([
    { name: 'jjapgma_session', value: session, url: process.env.BASE_URL! },
  ]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '메일 수락 브라우저 검증' })).toBeVisible();
  expect((await page.request.get(`/api/projects/${projectId}`)).status()).toBe(404);
  await page.getByRole('button', { name: '공유 수락' }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
  expect((await page.request.get(`/api/projects/${projectId}`)).status()).toBe(200);
  expect(await page.evaluate(() => sessionStorage.getItem('jjapgma-invitation'))).toBeNull();
});

test('owner shares from editor and workspace; recipient sees only permitted actions and loses access after revoke', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '개발용 워크스페이스 열기' }).click();
  await expect(page.getByRole('heading', { name: /내 프로젝트/ })).toBeVisible();
  const owner = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': owner.csrfToken };
  const name = `공유 E2E ${randomUUID().slice(0, 8)}`;
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name } })
  ).json();
  await page.goto(`/projects/${project.id}`);
  await page.getByRole('button', { name: '공유', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '프로젝트 공유' });
  await expect(dialog).toBeVisible();
  const email = `share-${randomUUID()}@example.com`;
  await dialog.getByLabel('공유할 이메일').fill(email);
  await dialog.getByRole('button', { name: '공유 추가' }).click();
  await expect(dialog.getByText('첫 로그인 대기')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: '공유', exact: true })).toBeFocused();
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const id = randomUUID(),
    token = randomUUID();
  try {
    await db.query(
      'INSERT INTO users(id,issuer,subject,display_name,email) VALUES($1,$2,$3,$4,$5)',
      [id, 'jjapgma:development', id, email.split('@')[0], email],
    );
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
      [createHash('sha256').update(token).digest('hex'), id, randomUUID()],
    );
  } finally {
    await db.end();
  }
  const recipient = await browser.newContext();
  await recipient.addCookies([
    { name: 'jjapgma_session', value: token, url: process.env.BASE_URL! },
  ]);
  const recipientPage = await recipient.newPage();
  await recipientPage.goto('/');
  await recipientPage.getByRole('link', { name, exact: true }).click();
  await expect(recipientPage.getByRole('button', { name: '공유', exact: true })).toHaveCount(0);
  await expect(recipientPage.getByRole('button', { name: '페이지 추가' })).toBeDisabled();
  await page.goto('/');
  await page.getByRole('button', { name: `${name} 공유`, exact: true }).click();
  await dialog.getByLabel(`${email} 권한`).selectOption('EDITOR');
  await expect(dialog.getByLabel(`${email} 권한`)).toBeEnabled();
  await recipientPage.reload();
  await expect(recipientPage.getByRole('button', { name: '페이지 추가' })).toBeEnabled();
  page.once('dialog', (prompt) => prompt.accept());
  await dialog.getByRole('button', { name: `${email} 공유 취소` }).click();
  await expect(dialog.getByText(email, { exact: true })).toHaveCount(0);
  await recipientPage.reload();
  await expect(recipientPage.getByRole('alert')).toContainText('프로젝트를 찾을 수 없습니다.');
  await recipient.close();
});
