import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createNode } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';

async function workspace(page: Page) {
  const result = await openSpec(
    page,
    { schemaVersion: 1, root: createNode('container') },
    '팀 디자인 시스템',
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '팀 디자인 시스템', exact: true })).toBeVisible();
  return result;
}

test('save shortcut works in the AI composer without taking over dialog inputs', async ({
  page,
}) => {
  const { initial } = await openSpec(
    page,
    { schemaVersion: 1, root: createNode('container') },
    '단축키 검증',
  );
  await page.getByRole('button', { name: '제목', exact: true }).click();
  await page.getByLabel('내용', { exact: true }).fill('키보드로 저장할 제목');
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  const composer = page.getByLabel('AI에게 요청');
  await composer.fill('아직 보내지 않은 요청');
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/pages/${initial.id}`) && response.request().method() === 'PUT',
  );
  await page.keyboard.press('Control+s');
  expect((await saved).ok()).toBe(true);
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await expect(composer).toHaveValue('아직 보내지 않은 요청');
  const persisted = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  expect(persisted.spec.root.children[0].props.text).toBe('키보드로 저장할 제목');
  await page.getByRole('button', { name: '페이지 수정', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '페이지 수정' });
  await dialog.getByLabel('페이지 이름').fill('아직 저장하지 않은 이름');
  await page.keyboard.press('Control+s');
  await expect(dialog).toBeVisible();
  expect((await (await page.request.get(`/api/pages/${initial.id}`)).json()).name).toBe(
    initial.name,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '페이지 수정', exact: true })).toBeFocused();
});

test('workspace handles long names, narrow screens, search recovery and notification placement', async ({
  page,
}) => {
  const { headers } = await workspace(page);
  const longName = '아주긴프로젝트이름'.repeat(8);
  const response = await page.request.post('/api/projects', { headers, data: { name: longName } });
  expect(response.ok()).toBe(true);
  await page.route('**/api/auth/me', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      json: { ...(await response.json()), displayName: '긴 이름을 사용하는 워크스페이스 관리자' },
    });
  });
  await page.reload();
  const longTitle = page.getByRole('heading', { name: longName, exact: true });
  await expect(longTitle).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    const heading = (await page.getByRole('heading', { name: /내 프로젝트/ }).boundingBox())!;
    const create = (await page
      .getByRole('button', { name: '새 프로젝트', exact: true })
      .boundingBox())!;
    expect(heading.height).toBeLessThan(50);
    if (width < 700) expect(create.y).toBeGreaterThan(heading.y + heading.height);
    expect((await longTitle.boundingBox())!.height).toBeLessThan(50);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({
      path: `test-results/refactor/after-workspace-${width}.png`,
      fullPage: true,
    });
  }
  expect((await new AxeBuilder({ page }).include('.workspace').analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByLabel('알림', { exact: true }).click();
  const panel = page.locator('.notification-panel');
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await page.keyboard.press('Escape');
  await page.getByLabel('프로젝트 검색').fill('일치하지 않는 이름');
  await expect(page.getByRole('status')).toContainText('검색 결과가 없습니다.');
  await page.getByRole('button', { name: '검색 초기화' }).click();
  await expect(longTitle).toBeVisible();
  await page.getByLabel('프로젝트 검색').fill('   ');
  await expect(longTitle).toBeVisible();
  await page.getByLabel('프로젝트 검색').fill('');
  await page
    .getByRole('heading', { name: '팀 디자인 시스템', exact: true })
    .getByRole('link')
    .click();
  await expect(page.getByLabel('캔버스 너비')).toBeVisible();
});

test('older project responses cannot overwrite a newer refresh and create errors survive focus', async ({
  page,
}) => {
  await workspace(page);
  const projects = await (await page.request.get('/api/projects')).json();
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let count = 0;
  await page.route('**/api/projects', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON().name).toBe('새 설계');
      await route.fulfill({ status: 503, json: { message: '프로젝트를 만들지 못했습니다.' } });
      return;
    }
    const first = ++count === 1;
    if (first) await delayed;
    await route.fulfill({
      json: projects.map((project: { name: string }) => ({
        ...project,
        name: first ? '이전 목록' : '최신 목록',
      })),
    });
  });
  await page.reload();
  await expect.poll(() => count).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: '최신 목록', exact: true })).toBeVisible();
  const oldResponse = page.waitForResponse((response) => response.url().endsWith('/api/projects'));
  release();
  await (await oldResponse).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByRole('heading', { name: '최신 목록', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '이전 목록', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '새 프로젝트', exact: true }).click();
  await page.getByLabel('프로젝트 이름', { exact: true }).fill('   ');
  await expect(page.getByRole('button', { name: '프로젝트 만들기', exact: true })).toBeDisabled();
  await page.getByLabel('프로젝트 이름', { exact: true }).fill('  새 설계  ');
  await page.getByRole('button', { name: '프로젝트 만들기', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('프로젝트를 만들지 못했습니다.');
  const refreshed = page.waitForResponse((response) => response.url().endsWith('/api/projects'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await refreshed;
  await expect(page.getByRole('alert')).toContainText('프로젝트를 만들지 못했습니다.');
  await expect(page.getByLabel('프로젝트 이름', { exact: true })).toHaveValue('  새 설계  ');
});

test('sharing dialog recovers from load failure and stays open during a mutation', async ({
  page,
}) => {
  await workspace(page);
  let fail = true;
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let mutating = false;
  await page.route('**/api/projects/*/sharing', async (route) => {
    if (route.request().method() === 'POST') {
      mutating = true;
      await delayed;
      await route.fulfill({ status: 503, json: { message: '공유 요청을 처리하지 못했습니다.' } });
    } else if (fail) {
      await route.fulfill({ status: 503, json: { message: '공유 목록 연결 실패' } });
    } else await route.continue();
  });
  const trigger = page.getByRole('button', { name: '팀 디자인 시스템 공유' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '프로젝트 공유', exact: true });
  await expect(dialog.getByRole('alert')).toContainText('공유 목록 연결 실패');
  await expect(dialog.getByRole('status')).toHaveCount(0);
  fail = false;
  await dialog.getByRole('button', { name: '다시 시도' }).click();
  await dialog.getByLabel('공유할 이메일').fill('reader@example.com');
  await dialog.getByRole('button', { name: '공유 추가', exact: true }).click();
  await expect.poll(() => mutating).toBe(true);
  await expect(dialog.getByRole('button', { name: '닫기', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  release();
  await expect(dialog.getByRole('alert')).toContainText('공유 요청을 처리하지 못했습니다.');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
