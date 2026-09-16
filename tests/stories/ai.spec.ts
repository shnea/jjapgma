import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createSpec, createNode } from '@jjapgma/ui-spec';
test('AI panel exposes context, pending and unavailable states without allowing unsaved requests', async ({
  page,
}) => {
  await page.route('**/api/projects/demo/chat', (route) =>
    route.fulfill({ json: { enabled: true, threads: [], runs: [] } }),
  );
  await page.route('**/api/projects/demo/proposals', (route) => route.fulfill({ json: [] }));
  const index = await (await page.request.get('/index.json')).json();
  const stories = Object.values(index.entries) as { id: string; title: string; name: string }[];
  const story = stories.find((s) => s.title === '빌더/AI 채팅' && s.name === 'Unsaved')!;
  await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
  await page.getByLabel('AI에게 요청').fill('회원 화면 그려줘');
  await expect(page.getByRole('button', { name: '보내기' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '현재 화면 저장' })).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.ai-chat-panel').analyze()).violations).toEqual(
    [],
  );
});

test('conflicting AI changes require explicit overwrite and explain version recovery', async ({
  page,
}) => {
  const spec = createSpec();
  const button = createNode('button');
  button.props.text = 'AI 문구';
  spec.root.children = [button];
  const proposal = {
    id: 'proposal',
    page_id: 'page',
    name: '화면',
    summary: '문구 변경',
    status: 'pending',
    base_revision: 1,
    spec,
    review: { revision: 3, merged: null, conflicts: ['버튼 문구'] },
  };
  await page.route('**/api/projects/demo/chat', (r) =>
    r.fulfill({ json: { enabled: true, threads: [], runs: [] } }),
  );
  await page.route('**/api/projects/demo/proposals', (r) => r.fulfill({ json: [proposal] }));
  await page.route('**/api/proposals/proposal/review', (r) => r.fulfill({ json: proposal }));
  const index = await (await page.request.get('/index.json')).json();
  const story = (
    Object.values(index.entries) as { id: string; title: string; name: string }[]
  ).find((s) => s.title === '빌더/AI 채팅' && s.name === 'Newer Page')!;
  await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'AI 변경 미리보기' });
  await expect(dialog.getByRole('button', { name: '변경 적용', exact: true })).toBeDisabled();
  await dialog.getByRole('radio', { name: 'AI 제안으로 덮어쓰기', exact: true }).check();
  await expect(dialog).toContainText('이전 버전 기록에 남습니다');
  await expect(dialog.getByRole('button', { name: '변경 적용', exact: true })).toBeEnabled();
  expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([]);
});
