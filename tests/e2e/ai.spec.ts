import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { createSpec } from '@jjapgma/ui-spec';
import { openSpec } from './helpers';
test('chat close removes only the selected conversation and survives reconnecting', async ({
  page,
}) => {
  const { initial } = await openSpec(page, createSpec(), '대화 닫기');
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const {
      rows: [project],
    } = await db.query("SELECT user_id FROM members WHERE project_id=$1 AND role='OWNER'", [
      initial.project_id,
    ]);
    for (const title of ['첫 대화', '둘째 대화'])
      await db.query('INSERT INTO ai_threads(id,project_id,user_id,title) VALUES($1,$2,$3,$4)', [
        randomUUID(),
        initial.project_id,
        project.user_id,
        title,
      ]);
  } finally {
    await db.end();
  }
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'AI 대화 선택' });
  await expect(picker.locator('option')).toHaveCount(3);
  await picker.selectOption({ label: '첫 대화' });
  await page.getByRole('button', { name: '현재 AI 대화 닫기' }).click();
  await expect(picker.locator('option')).toHaveText(['새 대화', '둘째 대화']);
  await page.reload();
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await expect(picker.locator('option')).toHaveText(['새 대화', '둘째 대화']);
  await page.getByRole('button', { name: '현재 AI 대화 닫기' }).click();
  await expect(picker.locator('option')).toHaveText(['새 대화']);
});

test('chat proposes through MCP, previews, applies one revision, supports undo and issues local connection', async ({
  page,
}) => {
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL }),
    id = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID();
  try {
    await db.query(
      'INSERT INTO users(id,issuer,subject,display_name) VALUES($1::uuid,$2,$1::text,$3)',
      [id, 'jjapgma:development', 'AI 사용자'],
    );
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
      [createHash('sha256').update(token).digest('hex'), id, csrf],
    );
  } finally {
    await db.end();
  }
  await page
    .context()
    .addCookies([{ name: 'jjapgma_session', value: token, url: process.env.BASE_URL! }]);
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': csrf };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: 'AI 작업' } })
  ).json();
  const saved = await (
    await page.request.post(`/api/projects/${project.id}/pages`, {
      headers,
      data: { name: '원본 페이지' },
    })
  ).json();
  await page.goto(`/projects/${project.id}`);
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByLabel('AI에게 요청').fill('버튼 하나 그려줘');
  await page.getByRole('button', { name: '보내기', exact: true }).click();
  await expect(
    page.getByText('화면 구조를 확인했습니다. 변경 제안을 미리보고 적용해 주세요.'),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole('region', { name: '화면 변경 제안' })
    .getByRole('button', { name: '미리보기', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'AI 변경 미리보기' });
  await expect(dialog.getByRole('button', { name: 'AI 생성 버튼' })).toBeVisible();
  await dialog.getByRole('button', { name: '변경 적용' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-testid="node-button"]')).toHaveCount(1);
  expect((await (await page.request.get(`/api/pages/${saved.id}`)).json()).revision).toBe(2);
  await page.getByRole('button', { name: /실행 취소/ }).click();
  await expect(page.locator('[data-testid="node-button"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '보내기', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'MCP 연결', exact: true }).click();
  const mcp = page.getByRole('dialog', { name: '프로젝트 MCP 연결' });
  await mcp.getByRole('button', { name: '연결 발급' }).click();
  await expect(mcp.getByLabel('연결 주소')).toHaveValue(
    new RegExp(`/api/mcp/projects/${project.id}$`),
  );
  await expect(mcp.getByLabel('인증 토큰')).toHaveValue(/^jmcp_/);
  await mcp.getByRole('button', { name: '로컬 AI 에이전트 연결 폐기' }).click();
  await expect(mcp.getByText('폐기됨')).toBeVisible();
});

test('an empty final answer still shows the saved proposal for review and apply after reload', async ({
  page,
}) => {
  await openSpec(page, createSpec(), '빈 설명의 제안');
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByLabel('AI에게 요청').fill('빈 답변 제안 테스트');
  await page.getByRole('button', { name: '보내기', exact: true }).click();
  await expect(page.getByText(/변경 제안은 생성됐지만 AI 설명이 비어 있습니다/)).toBeVisible({
    timeout: 20000,
  });
  await page.reload();
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await expect(page.getByText(/변경 제안은 생성됐지만 AI 설명이 비어 있습니다/)).toBeVisible();
  await page
    .getByRole('region', { name: '화면 변경 제안' })
    .getByRole('button', { name: '미리보기', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'AI 변경 미리보기' });
  await expect(dialog.getByRole('button', { name: 'AI 생성 버튼' })).toBeVisible();
  await dialog.getByRole('button', { name: '변경 적용' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-testid="node-button"]')).toHaveCount(1);
});

test('AI builds a new custom chat page without a template, previews its contents and preserves the original page', async ({
  page,
}) => {
  const { initial } = await openSpec(page, createSpec(), '원래 화면');
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByLabel('AI에게 요청').fill('새 채팅 화면을 그려줘');
  await page.getByRole('button', { name: '보내기', exact: true }).click();
  const proposals = page.getByRole('region', { name: '화면 변경 제안' });
  await expect(proposals.getByText('AI 채팅 화면', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await proposals.getByRole('button', { name: '미리보기', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'AI 변경 미리보기' });
  await expect(preview.getByRole('heading', { name: '팀 대화' })).toBeVisible();
  await expect(preview.getByLabel('메시지', { exact: true })).toBeVisible();
  await expect(preview.getByRole('button', { name: '전송', exact: true })).toBeVisible();
  await preview.getByRole('button', { name: '변경 적용' }).click();
  await expect(preview).toHaveCount(0);
  await expect(page.getByLabel('페이지 선택').locator('option:checked')).toHaveText('AI 채팅 화면');
  const newPageId = await page.getByLabel('페이지 선택').inputValue();
  expect(newPageId).not.toBe(initial.id);
  await expect(page.locator('[data-node-id="chat-title"]')).toContainText('팀 대화');
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  await expect(page.locator('[data-node-id="conversations"]')).toBeHidden();
  await expect(page.locator('[data-node-id="chat-layout"]')).toHaveCSS('flex-direction', 'column');
  const saved = await (await page.request.get(`/api/pages/${newPageId}`)).json();
  expect(saved.revision).toBe(1);
  expect(saved.spec.root.children[0].children).toHaveLength(2);
  expect((await (await page.request.get(`/api/pages/${initial.id}`)).json()).revision).toBe(2);
  await page.getByRole('button', { name: '편집으로', exact: true }).click();
  await page.getByLabel('페이지 선택').selectOption(initial.id);
  await expect(page.locator('[data-node-id="chat-title"]')).toHaveCount(0);
  await page.getByLabel('페이지 선택').selectOption(newPageId);
  await expect(page.locator('[data-node-id="chat-title"]')).toContainText('팀 대화');
  await page.screenshot({ path: 'test-results/ai-custom-page.png' });
});

test('official chat template inserts from the library, saves message settings and remains editable', async ({
  page,
}) => {
  const { initial } = await openSpec(page, createSpec(), '대화 템플릿');
  await page.getByRole('button', { name: '템플릿', exact: true }).click();
  await page.getByRole('button', { name: 'AI 대화 화면 미리보기' }).click();
  const preview = page.getByRole('dialog');
  await expect(preview.locator('.element-chat')).toBeVisible();
  await preview.getByRole('button', { name: /추가/ }).click();
  await expect(preview).toHaveCount(0);
  await page.locator('[data-testid="node-chat"]').click();
  const inspector = page.locator('.inspector');
  await inspector
    .getByRole('textbox', { name: '메시지 내용', exact: true })
    .first()
    .fill('채팅 템플릿 저장 확인');
  await inspector.getByLabel('응답 대기 표시', { exact: true }).check();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('저장됨');
  await page.reload();
  await expect(page.locator('[data-testid="node-chat"]')).toContainText('채팅 템플릿 저장 확인');
  await expect(page.locator('[data-testid="node-chat"]')).toContainText('답변을 준비');
  const saved = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  const queue = [saved.spec.root];
  let chat;
  while (queue.length) {
    const n = queue.pop();
    if (n.type === 'chat') chat = n;
    queue.push(...n.children);
  }
  expect(chat.props.chatLoading).toBe(true);
  expect(chat.props.chatMessages[0].content).toBe('채팅 템플릿 저장 확인');
});
test('AI proposal merges with newer edits and chat text keeps native copy shortcuts', async ({
  page,
}) => {
  const { initial, headers } = await openSpec(page, createSpec(), 'AI 병합');
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByLabel('AI에게 요청').fill('버튼 하나 그려줘');
  await page.getByRole('button', { name: '보내기', exact: true }).click();
  const reply = '화면 구조를 확인했습니다. 변경 제안을 미리보고 적용해 주세요.';
  await expect(page.getByText(reply, { exact: true })).toBeVisible({ timeout: 20000 });
  await page.locator('.ai-chat-panel .chat-markdown').evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    (document.activeElement as HTMLElement)?.blur();
    document.addEventListener(
      'copy',
      () => {
        document.documentElement.dataset.copied = window.getSelection()?.toString() ?? '';
      },
      { once: true },
    );
  });
  await page.keyboard.press('Control+c');
  await expect(page.locator('html')).toHaveAttribute('data-copied', reply);
  await page.getByRole('button', { name: '답변 복사', exact: true }).click();
  await expect(page.getByText('복사됨', { exact: true })).toBeVisible();
  const current = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  current.spec.root.style.background = '#123456';
  expect(
    (
      await page.request.put(`/api/pages/${initial.id}`, {
        headers,
        data: { name: current.name, spec: current.spec, baseRevision: current.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page
    .getByRole('region', { name: '화면 변경 제안' })
    .getByRole('button', { name: '미리보기', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'AI 변경 미리보기' });
  await expect(dialog.getByRole('radio', { name: '내 변경과 병합', exact: true })).toBeChecked();
  await expect(dialog.locator('[data-page-root]')).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await dialog.getByRole('button', { name: '변경 적용', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await (await page.request.get(`/api/pages/${initial.id}`)).json();
  expect(saved.spec.root.style.background).toBe('#123456');
  expect(saved.spec.root.children[0].props.text).toBe('AI 생성 버튼');
  await page.reload();
  await expect(page.locator('[data-testid="node-button"]')).toContainText('AI 생성 버튼');
});
