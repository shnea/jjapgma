import { test, expect, type Page } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

async function signIn(page: Page) {
  // These navigation tests need independent sessions, not additional calls to the rate-limited login endpoint.
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const id = randomUUID(),
    token = randomUUID();
  try {
    await db.query('INSERT INTO users(id,issuer,subject,display_name) VALUES($1,$2,$3,$4)', [
      id,
      'jjapgma:development',
      id,
      '탐색 테스트',
    ]);
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
      [createHash('sha256').update(token).digest('hex'), id, randomUUID()],
    );
  } finally {
    await db.end();
  }
  await page
    .context()
    .addCookies([{ name: 'jjapgma_session', value: token, url: process.env.BASE_URL! }]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /내 프로젝트/ })).toBeVisible();
}

test('template panel inserts without replacing content, saves personal snapshots and remembers design panel width', async ({
  page,
}) => {
  await signIn(page);
  const owner = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': owner.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: '템플릿 패널 테스트' } })
  ).json();
  const source = await (
    await page.request.post(`/api/projects/${project.id}/pages`, {
      headers,
      data: { name: '원본', templateId: 'dashboard' },
    })
  ).json();
  await page.goto(`/projects/${project.id}`);
  const separator = page.getByRole('separator', { name: '디자인 패널 너비' });
  await expect(separator).toHaveAttribute('aria-valuenow', '380');
  await separator.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(separator).toHaveAttribute('aria-valuenow', '400');
  const box = (await separator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 40, box.y + 100);
  await page.mouse.up();
  await expect(separator).toHaveAttribute('aria-valuenow', '440');
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '템플릿', exact: true }).click();
  await page.getByRole('button', { name: '목록 관리 미리보기' }).click();
  const managementPreview = page.getByRole('dialog');
  const searchInput = (await managementPreview.locator('input[type="search"]').boundingBox())!;
  const addButton = (await managementPreview.locator('.element-button').boundingBox())!;
  expect(
    Math.abs(searchInput.y + searchInput.height / 2 - addButton.y - addButton.height / 2),
  ).toBeLessThan(1);
  expect(Math.abs(addButton.height - searchInput.height)).toBeLessThan(1);
  expect(addButton.x).toBeGreaterThan(searchInput.x + searchInput.width);
  await page.keyboard.press('Escape');
  await page.getByLabel('템플릿 검색').fill('없는 결과');
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();
  await page.getByLabel('템플릿 검색').fill('로그인');
  await page.getByRole('button', { name: '로그인 화면 미리보기' }).click();
  await page.getByRole('button', { name: '화면에 추가', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.artboard').getByText('다시 만나 반가워요')).toBeVisible();
  await page.getByRole('button', { name: '실행 취소', exact: true }).click();
  await expect(page.locator('.artboard').getByText('다시 만나 반가워요')).toHaveCount(0);
  await page.getByRole('button', { name: '다시 실행', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  const result = await (await page.request.get(`/api/pages/${source.id}`)).json();
  expect(result.spec.theme).toEqual(source.spec.theme);
  expect(result.spec.root.children.slice(0, -1)).toEqual(source.spec.root.children);
  await page.getByLabel('템플릿 검색').fill('');
  await page.getByRole('button', { name: '내 템플릿', exact: true }).click();
  await page.getByRole('button', { name: '현재 화면 저장' }).click();
  await page.getByLabel('템플릿 이름').fill('나의 공통 화면');
  await page.getByRole('button', { name: '템플릿 저장', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(separator).toHaveAttribute('aria-valuenow', '440');
  await page.getByRole('button', { name: '템플릿', exact: true }).click();
  await page.getByRole('button', { name: '내 템플릿', exact: true }).click();
  await page.getByRole('button', { name: '나의 공통 화면 미리보기' }).click();
  await page.getByRole('button', { name: '화면에 추가', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  const reused = await (await page.request.get(`/api/pages/${source.id}`)).json();
  expect(reused.spec.root.children.at(-1).children.length).toBe(result.spec.root.children.length);
  expect(reused.spec.root.children.at(-1).id).not.toBe(result.spec.root.id);
  await page.getByRole('button', { name: '나의 공통 화면 템플릿 삭제' }).click();
  await page.getByRole('button', { name: '템플릿 삭제', exact: true }).click();
  await expect(page.getByRole('button', { name: '나의 공통 화면 미리보기' })).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(separator).toHaveAttribute('aria-valuenow', '440');
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(separator).toHaveAttribute('aria-valuenow', '380');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: '공식 템플릿', exact: true }).click();
  await page.screenshot({ path: 'test-results/template-panel.png', fullPage: true });
});

test('project switching, page settings rename with unsaved content, deletion and final-page empty state', async ({
  page,
}) => {
  await signIn(page);
  const owner = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': owner.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: `전환 A ${randomUUID()}` } })
  ).json();
  const second = await (
    await page.request.post('/api/projects', { headers, data: { name: `전환 B ${randomUUID()}` } })
  ).json();
  const firstPage = await (
    await page.request.post(`/api/projects/${project.id}/pages`, {
      headers,
      data: { name: '첫 페이지' },
    })
  ).json();
  const secondPage = await (
    await page.request.post(`/api/projects/${project.id}/pages`, {
      headers,
      data: { name: '둘째 페이지' },
    })
  ).json();
  await page.reload();
  const card = page
    .locator('.project-card')
    .filter({ has: page.getByRole('heading', { name: project.name, exact: true }) });
  const buttons = card.locator('.project-card-actions button');
  await expect(buttons.nth(0)).toHaveAttribute('aria-label', `${project.name} 공유`);
  await expect(buttons.nth(1)).toHaveAttribute('aria-label', `${project.name} 삭제`);
  await page.getByLabel('프로젝트 전환').selectOption(project.id);
  await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
  await expect(page.getByLabel('페이지 선택')).toHaveValue(firstPage.id);
  await expect(page.locator('.right-panel').getByLabel('페이지 이름')).toHaveCount(0);
  const nav = page.locator('.page-navigation');
  await expect(nav.locator(':scope > button').nth(0)).toHaveAttribute('aria-label', '페이지 추가');
  await expect(nav.locator(':scope > button').nth(1)).toHaveAttribute('aria-label', '페이지 수정');
  await page.getByRole('button', { name: '제목', exact: true }).click();
  await page.getByRole('button', { name: '페이지 수정', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '페이지 수정' });
  await dialog.getByLabel('페이지 이름').fill('변경한 페이지');
  await dialog.getByRole('button', { name: '이름 저장' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('페이지 선택').locator('option:checked')).toHaveText(
    '변경한 페이지',
  );
  const saved = await (await page.request.get(`/api/pages/${firstPage.id}`)).json();
  expect(saved.name).toBe('변경한 페이지');
  expect(saved.spec.root.children.length).toBe(1);
  await page.reload();
  await expect(page.getByLabel('페이지 선택').locator('option:checked')).toHaveText(
    '변경한 페이지',
  );
  await page.getByLabel('프로젝트 전환').selectOption(second.id);
  await expect(page).toHaveURL(new RegExp(`/projects/${second.id}$`));
  await expect(page.getByRole('button', { name: '첫 페이지 만들기' })).toBeVisible();
  await page.getByLabel('프로젝트 전환').selectOption(project.id);
  for (const expectedPage of [secondPage.id, '']) {
    await page.getByRole('button', { name: '페이지 수정', exact: true }).click();
    page.once('dialog', (prompt) => prompt.accept());
    await dialog.getByRole('button', { name: '페이지 삭제' }).click();
    await expect(page.getByLabel('페이지 선택')).toHaveValue(expectedPage);
  }
  await expect(page.getByRole('button', { name: '첫 페이지 만들기' })).toBeVisible();
  expect((await page.request.get(`/api/pages/${firstPage.id}`)).status()).toBe(404);
  await page.getByRole('button', { name: '삭제된 페이지', exact: true }).click();
  const trash = page.getByRole('dialog', { name: '삭제된 페이지 복원' });
  await trash.getByLabel('삭제된 페이지', { exact: true }).selectOption(firstPage.id);
  await trash.getByLabel('복원할 버전').selectOption('1');
  await trash.getByRole('button', { name: '선택한 버전으로 복원' }).click();
  await expect(trash).toHaveCount(0);
  await expect(page.getByLabel('페이지 선택')).toHaveValue(firstPage.id);
  await expect(page.getByLabel('페이지 선택').locator('option:checked')).toHaveText('첫 페이지');
  const restored = await (await page.request.get(`/api/pages/${firstPage.id}`)).json();
  expect(restored.revision).toBe(3);
  expect(restored.spec.root.children).toHaveLength(0);
});

test('template picker creates an editable page and root theme supports undo and persists across reload', async ({
  page,
}) => {
  await signIn(page);
  const owner = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': owner.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: '템플릿과 테마' } })
  ).json();
  await page.goto(`/projects/${project.id}`);
  await page.getByRole('button', { name: '첫 페이지 만들기' }).click();
  const dialog = page.getByRole('dialog', { name: '새 페이지 만들기' });
  await dialog.getByRole('radio', { name: /랜딩 페이지/ }).check();
  await expect(dialog.getByLabel('새 페이지', { exact: true })).toHaveValue('랜딩 페이지');
  await expect(dialog.locator('.page-spec-preview .render-button')).toHaveCount(1);
  await dialog.getByRole('button', { name: '페이지 만들기', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const theme = page.getByLabel('테마 프리셋');
  await expect(theme).toHaveValue('custom');
  await theme.selectOption('ocean');
  const button = page.locator('.artboard .element-button');
  await expect(button).toHaveCSS('background-color', 'rgb(36, 88, 166)');
  await page.getByRole('button', { name: '실행 취소', exact: true }).click();
  await expect(theme).toHaveValue('custom');
  await expect(button).toHaveCSS('background-color', 'rgb(70, 110, 44)');
  await theme.selectOption('violet');
  await page.getByLabel('기본 모서리', { exact: true }).fill('20');
  await page.getByLabel('기본 글꼴', { exact: true }).selectOption('serif');
  await page.getByLabel('화면 배경', { exact: true }).fill('#e8edf5');
  await page.getByLabel('배경색 코드', { exact: true }).fill('#123456');
  const root = page.locator('.artboard [data-page-theme="true"]');
  await expect(root).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await page.getByRole('button', { name: '화면의 테마 기본값 사용' }).click();
  await expect(root).toHaveCSS('background-color', 'rgb(232, 237, 245)');
  await expect(root).toHaveCSS('padding', '16px');
  await expect(page.locator('.artboard .render-card').first()).toHaveCSS('border-radius', '20px');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('기본 모서리', { exact: true })).toHaveValue('20');
  await expect(page.getByLabel('기본 글꼴', { exact: true })).toHaveValue('serif');
  await expect(button).toHaveCSS('background-color', 'rgb(112, 65, 166)');
  await page.screenshot({ path: 'test-results/template-theme-editor.png', fullPage: true });
});

test('new shares surface in the notification bell without reload and read state survives project navigation', async ({
  page,
  browser,
}) => {
  await signIn(page);
  const owner = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': owner.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: '새로 공유된 프로젝트' } })
  ).json();
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const userId = randomUUID(),
    token = randomUUID(),
    email = `notification-${randomUUID()}@example.com`;
  try {
    await db.query(
      'INSERT INTO users(id,issuer,subject,display_name,email) VALUES($1,$2,$3,$4,$5)',
      [userId, 'jjapgma:development', userId, email.split('@')[0], email],
    );
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
      [createHash('sha256').update(token).digest('hex'), userId, randomUUID()],
    );
  } finally {
    await db.end();
  }
  const context = await browser.newContext();
  await context.addCookies([{ name: 'jjapgma_session', value: token, url: process.env.BASE_URL! }]);
  const recipient = await context.newPage();
  await recipient.goto('/');
  await expect(recipient.locator('.notification-bell summary')).toHaveAttribute(
    'aria-label',
    '알림',
  );
  await page.request.post(`/api/projects/${project.id}/sharing`, {
    headers,
    data: { email, role: 'VIEWER' },
  });
  await recipient.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(recipient.locator('.notification-bell summary')).toHaveAttribute(
    'aria-label',
    '알림 1개 읽지 않음',
    { timeout: 20000 },
  );
  await expect(
    recipient.getByLabel('프로젝트 전환').locator(`option[value="${project.id}"]`),
  ).toContainText('공유받음');
  await recipient.locator('.notification-bell summary').click();
  await recipient
    .getByRole('button', { name: /새로 공유된 프로젝트 프로젝트가 공유되었습니다/ })
    .click();
  await expect(recipient).toHaveURL(new RegExp(`/projects/${project.id}$`));
  await expect(recipient.locator('.notification-bell summary')).toHaveAttribute(
    'aria-label',
    '알림',
  );
  await recipient.getByLabel('프로젝트 전환').selectOption('');
  await expect(recipient.getByRole('heading', { name: /내 프로젝트/ })).toBeVisible();
  await recipient.locator('.notification-bell summary').click();
  await expect(recipient.locator('.notification-panel button.unread')).toHaveCount(0);
  await recipient.screenshot({ path: 'test-results/shared-notifications.png', fullPage: true });
  await context.close();
});
