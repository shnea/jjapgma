import { test, expect } from '@playwright/test';
import { createTemplate } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';
test('avatar opens personal account, nickname survives reload and MCP sits left of history', async ({
  page,
}) => {
  await openSpec(page, createTemplate('main'), '계정 화면');
  const tools = page.locator('.toolbar-actions');
  await expect(tools.getByRole('button', { name: 'MCP 연결' })).toBeVisible();
  const labels = await tools.getByRole('button').allTextContents();
  expect(labels[0]).toContain('MCP 연결');
  await page.getByRole('link', { name: '내 계정', exact: true }).click();
  await expect(page.getByRole('heading', { name: '내 계정', exact: true })).toBeVisible();
  await page.getByLabel('닉네임', { exact: true }).fill('계정 테스트');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('닉네임을 저장했습니다.');
  await page.reload();
  await expect(page.getByLabel('닉네임', { exact: true })).toHaveValue('계정 테스트');
  await page.getByRole('button', { name: '기본 이름 사용' }).click();
  await expect(page.getByRole('status')).toHaveText('닉네임을 저장했습니다.');
  await expect(page.getByLabel('닉네임', { exact: true })).toHaveValue('');
});
