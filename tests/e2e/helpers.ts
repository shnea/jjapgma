import { expect, type Page } from '@playwright/test';
import type { UiSpec } from '@jjapgma/ui-spec';
export async function openSpec(page: Page, spec: UiSpec, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: '개발용 워크스페이스 열기' }).click();
  const identity = await (await page.request.get('/api/auth/me')).json();
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
