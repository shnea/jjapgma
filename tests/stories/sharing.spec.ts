import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('sharing panel supports auto grants, email failures, role changes and accessible labels', async ({
  page,
}) => {
  const index = await (await page.request.get('/index.json')).json();
  const entries = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = (name: string) =>
    entries.find((e) => e.title === '프로젝트/공유 관리' && e.name === name)!.id;
  await page.goto(`/iframe.html?id=${story('Auto')}&viewMode=story`);
  await page.getByLabel('공유할 이메일').fill('new@example.com');
  await page.getByRole('button', { name: '공유 추가' }).click();
  await expect(page.getByText('첫 로그인 대기')).toBeVisible();
  await page.getByLabel('new@example.com 권한').selectOption('EDITOR');
  await expect(page.getByLabel('new@example.com 권한')).toHaveValue('EDITOR');
  await page.getByRole('button', { name: 'new@example.com 공유 취소' }).click();
  await expect(page.getByText('new@example.com', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).include('.sharing-panel').analyze()).violations).toEqual(
    [],
  );
  await page.goto(`/iframe.html?id=${story('Failed')}&viewMode=story`);
  await expect(page.getByText('메일 요청 실패 · 설정 확인 후 재시도')).toBeVisible();
  await page.getByRole('button', { name: '메일 요청 재시도' }).click();
  await expect(page.getByText('메일 발송 요청 접수 · 수락 대기')).toBeVisible();
});
