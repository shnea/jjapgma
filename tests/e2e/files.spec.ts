import { test, expect } from '@playwright/test';
test('attachment upload reaches the proxy and survives page reload alongside edits', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '개발용 워크스페이스 열기' }).click();
  await expect(page.getByRole('heading', { name: /내 프로젝트/ })).toBeVisible();
  const identity = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': identity.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: '첨부 브라우저' } })
  ).json();
  await page.request.post(`/api/projects/${project.id}/pages`, {
    headers,
    data: { name: '첨부 페이지' },
  });
  await page.goto(`/projects/${project.id}`);
  await page.getByLabel('요소 검색').fill('fileUpload');
  await page.locator('.palette').getByRole('button', { name: '파일 업로드', exact: true }).click();
  const input = page.locator('.inspector input[type="file"]');
  await expect(input).toBeEnabled();
  await input.setInputFiles({
    name: '요구사항.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('jjapgma attachment fixture'),
  });
  await expect(
    page.locator('.inspector').getByRole('link', { name: '요구사항.txt 다운로드' }),
  ).toBeVisible();
  await page.getByLabel('레이어 이름').fill('첨부한 요구사항');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.locator('.save-status')).toContainText('저장됨', { timeout: 15000 });
  await page.reload();
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  await expect(page.getByRole('link', { name: '요구사항.txt 다운로드' })).toBeVisible();
});
