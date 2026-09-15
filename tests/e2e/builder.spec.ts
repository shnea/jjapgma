import { test, expect } from '@playwright/test';
test('project → page → edit → responsive preview → reload persisted data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '개발용 워크스페이스 열기' }).click();
  await expect(page.getByRole('heading', { name: /내 프로젝트/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/workspace.png', fullPage: true });
  await page.getByRole('button', { name: '새 프로젝트', exact: true }).click();
  await page.getByLabel('프로젝트 이름').fill('브라우저 검증 프로젝트');
  await page.getByRole('button', { name: '프로젝트 만들기', exact: true }).click();
  await page.getByRole('button', { name: '첫 페이지 만들기' }).click();
  await page.getByLabel('새 페이지', { exact: true }).fill('브랜드 홈');
  await page.getByRole('button', { name: '페이지 만들기', exact: true }).click();
  await page.getByRole('button', { name: '제목', exact: true }).click();
  await page.getByLabel('내용', { exact: true }).fill('함께 만드는 새로운 화면');
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await page.getByLabel('이 화면에서 숨기기').check();
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '함께 만드는 새로운 화면' })).toBeHidden();
  await page.getByRole('button', { name: '데스크톱', exact: true }).click();
  await expect(page.getByRole('heading', { name: '함께 만드는 새로운 화면' })).toBeVisible();
  await page.getByRole('button', { name: '편집으로' }).click();
  await page.getByRole('button', { name: '실행 취소' }).click();
  await page.getByRole('button', { name: '다시 실행' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('저장됨', { timeout: 15000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: '함께 만드는 새로운 화면' })).toBeVisible();
  await page.getByRole('button', { name: '레이어', exact: true }).click();
  await page.getByRole('button', { name: '제목', exact: true }).click();
  await page.getByLabel('레이어 이름').fill('메인 제목');
  await page.getByLabel('잠금', { exact: true }).check();
  await expect(page.getByLabel('내용', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('저장됨', { timeout: 15000 });

  // Verify export modal
  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '프로젝트 내보내기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '스토리북 내보내기' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'HTML 내보내기' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'JSON 내보내기' })).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();

  // Verify version history modal
  await page.getByRole('button', { name: '버전 기록' }).click();
  await expect(page.getByRole('heading', { name: /버전 기록/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '이 버전으로 복원' }).first()).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();

  await page.screenshot({ path: 'test-results/editor.png', fullPage: true });
});
test('mobile dashboard fits the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '개발용 워크스페이스 열기' }).click();
  await expect(page.getByRole('heading', { name: /내 프로젝트/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
