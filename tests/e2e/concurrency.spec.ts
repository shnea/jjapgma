import { test, expect } from '@playwright/test';
test('drag insertion and save conflicts keep the local edit available', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '개발용 워크스페이스 열기' }).click();
  await expect(page.getByRole('heading', { name: /내 프로젝트/ })).toBeVisible();
  const identity = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': identity.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: '충돌 검증' } })
  ).json();
  const initial = await (
    await page.request.post(`/api/projects/${project.id}/pages`, {
      headers,
      data: { name: '동시 편집' },
    })
  ).json();
  await page.goto(`/projects/${project.id}`);
  await expect(page.getByTestId('node-container')).toBeVisible();
  // Another client commits after this editor loaded revision 1.
  const response = await page.request.put(`/api/pages/${initial.id}`, {
    headers,
    data: { name: '다른 곳의 변경', spec: initial.spec, baseRevision: 1 },
  });
  expect(response.status()).toBe(200);
  await page
    .getByRole('button', { name: '카드', exact: true })
    .dragTo(page.getByTestId('node-container'));
  await expect(page.getByTestId('node-card')).toBeVisible();
  await expect(page.getByLabel('레이어 이름')).toHaveValue('카드');
  await page.getByRole('button', { name: '제목', exact: true }).click();
  await page.getByLabel('내용', { exact: true }).fill('내가 작업한 내용');
  await expect(page.getByTestId('node-card').getByTestId('node-heading')).toHaveCount(1);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('다른 곳에서 저장한 변경', {
    timeout: 15000,
  });
  await page.getByLabel('내용', { exact: true }).fill('충돌 후에도 보존할 내용');
  await expect(page.getByRole('button', { name: '내 변경 내려받기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  const persisted = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  expect(persisted.revision).toBe(2);
  expect(persisted.name).toBe('다른 곳의 변경');
  await expect(page.getByLabel('내용', { exact: true })).toHaveValue('충돌 후에도 보존할 내용');
});
