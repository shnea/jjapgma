import { test, expect, type Page } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { createSpec, createNode, type UiSpec } from '@jjapgma/ui-spec';
async function open(page: Page, spec: UiSpec) {
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const id = randomUUID(),
    token = randomUUID();
  try {
    await db.query('INSERT INTO users(id,issuer,subject,display_name) VALUES($1,$2,$3,$4)', [
      id,
      'jjapgma:development',
      id,
      '속성 테스트',
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
  const me = await (await page.request.get('/api/auth/me')).json();
  const headers = { Origin: process.env.BASE_URL!, 'X-CSRF-Token': me.csrfToken };
  const project = await (
    await page.request.post('/api/projects', { headers, data: { name: '속성 편집' } })
  ).json();
  const initial = await (
    await page.request.post(`/api/projects/${project.id}/pages`, {
      headers,
      data: { name: '새 화면' },
    })
  ).json();
  expect(
    (
      await page.request.put(`/api/pages/${initial.id}`, {
        headers,
        data: { name: '새 화면', spec, baseRevision: 1 },
      })
    ).ok(),
  ).toBe(true);
  await page.goto(`/projects/${project.id}`);
  await page.getByRole('button', { name: '화면에 맞춤' }).click();
  return { id: initial.id, headers };
}
test('table editing preserves cell identity, supports paste, persists presentation and rejects malformed saved tables', async ({
  page,
}) => {
  const spec = createSpec(),
    table = createNode('table');
  table.props.items = '이름|이메일|동작\n가람|garam@example.com|수정\n나래|narae@example.com|삭제';
  spec.root.children.push(table);
  const { id, headers } = await open(page, spec);
  await page.getByTestId('node-table').click();
  const email = page
    .locator('.table-column-editor')
    .filter({ has: page.locator('summary', { hasText: '이메일' }) });
  await email.locator('summary').click();
  await email.getByLabel('모바일 표시', { exact: true }).uncheck();
  const action = page
    .locator('.table-column-editor')
    .filter({ has: page.locator('summary', { hasText: '동작' }) });
  await action.locator('summary').click();
  await action.getByRole('button', { name: '열 종류: 버튼', exact: true }).click();
  await action.getByRole('button', { name: '수정 아이콘', exact: true }).click();
  await action.getByRole('button', { name: '열 앞으로' }).click();
  await expect(page.locator('.artboard thead th').nth(1)).toHaveText('동작');
  await page.getByRole('button', { name: '표 설정: 행·모양' }).click();
  await page.getByLabel('행 교차 색상').check();
  await page.getByRole('button', { name: '표 설정: 표시·동작' }).click();
  await page.getByRole('button', { name: '첫 번째 보조 열: 번호+체크' }).click();
  await page.getByRole('button', { name: '셀 데이터 편집' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: '1행 이름', exact: true }).evaluate((input) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', '가온\t보기\tgaon@example.com\n나온\t수정\tnaon@example.com');
    input.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }),
    );
  });
  await expect(dialog.getByRole('textbox', { name: '2행 이메일' })).toHaveValue('naon@example.com');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  const saved = await (await page.request.get(`/api/pages/${id}`)).json();
  expect(
    saved.spec.root.children[0].props.table.columns.map((c: { title: string }) => c.title),
  ).toEqual(['이름', '동작', '이메일']);
  expect(saved.spec.root.children[0].props.table.striped).toBe(true);
  const bad = structuredClone(saved.spec);
  bad.root.children[0].props.table.columns.push(bad.root.children[0].props.table.columns[0]);
  expect(
    (
      await page.request.put(`/api/pages/${id}`, {
        headers,
        data: { name: saved.name, spec: bad, baseRevision: saved.revision },
      })
    ).status(),
  ).toBe(400);
  await page.reload();
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await expect(page.locator('.artboard thead th')).toHaveCount(3);
  await expect(page.locator('.artboard')).not.toContainText('gaon@example.com');
  await page.getByRole('button', { name: '미리보기', exact: true }).click();
  await page.getByLabel('현재 페이지 전체 선택').check();
  await expect(page.locator('.artboard').getByRole('status')).toContainText('2개 선택');
  await expect(page.locator('.artboard .lucide-pencil')).toHaveCount(2);
});
test('responsive alignment, visual button choices and directional spacing persist after save and reload', async ({
  page,
}) => {
  const spec = createSpec(),
    row = createNode('container'),
    input = createNode('input'),
    button = createNode('button');
  row.style = { direction: 'row', align: 'flex-end', gap: 12 };
  row.responsive.mobile = { direction: 'column' };
  row.children.push(input, button);
  spec.root.children.push(row);
  await open(page, spec);
  await page.getByTestId('node-button').click();
  await page.getByRole('button', { name: '공유 아이콘', exact: true }).click();
  await page.getByRole('button', { name: '아이콘 위치: 글자 뒤' }).click();
  await page.getByLabel('글자 크기 (px)', { exact: true }).fill('20');
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await page.getByRole('button', { name: '이 요소의 가로 위치: 가운데' }).click();
  await page.getByText('방향별 안쪽 여백', { exact: true }).click();
  await page.locator('details[open] .side-left').getByLabel('왼쪽', { exact: true }).fill('24');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await expect(page.locator(`[data-node-id="${row.id}"]`)).toHaveCSS('align-items', 'stretch');
  await expect(page.getByTestId('node-button')).toHaveCSS('align-self', 'center');
  await expect(page.locator('.artboard .element-button')).toHaveCSS('padding-left', '24px');
  await expect(page.locator('.artboard .element-button')).toHaveCSS('font-size', '20px');
  await expect(page.locator('.artboard .element-button .lucide-share-2')).toBeVisible();
  await expect(page.locator('.artboard .element-button')).toHaveCSS(
    'flex-direction',
    'row-reverse',
  );
});

test('form row alignment mode persists, defaults center calendar controls and clears offsets on mobile', async ({
  page,
}) => {
  const spec = createSpec(),
    row = createNode('container'),
    input = createNode('input'),
    date = createNode('input'),
    range = createNode('dateRange'),
    button = createNode('button');
  date.props.controlType = 'date';
  row.style = { direction: 'row', gap: 12, padding: 12 };
  row.responsive.mobile = { direction: 'column' };
  row.children = [input, date, range, button];
  spec.root.children = [row];
  const { id } = await open(page, spec);
  const geometry = () =>
    page.locator(`[data-node-id="${row.id}"]`).evaluate((row) =>
      Array.from(row.querySelectorAll('[data-field-control],.element-button')).map((c) => {
        const b = c.getBoundingClientRect();
        return { center: b.y + b.height / 2, height: b.height };
      }),
    );
  await expect
    .poll(async () => {
      const values = await geometry();
      return Math.max(...values.map((v) => v.center)) - Math.min(...values.map((v) => v.center));
    })
    .toBeLessThan(1);
  await page.locator(`[data-node-id="${row.id}"]`).click({ position: { x: 3, y: 3 } });
  await page.getByRole('button', { name: '폼·버튼 정렬: 일반 배치' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.reload();
  await page.locator(`[data-node-id="${row.id}"]`).click({ position: { x: 3, y: 3 } });
  await expect(page.getByRole('button', { name: '폼·버튼 정렬: 일반 배치' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '폼·버튼 정렬: 입력칸에 맞춤' }).click();
  await page.getByTestId('node-button').click();
  await page.getByText('바깥 여백', { exact: true }).click();
  await page.locator('details[open] .side-top').getByLabel('위', { exact: true }).fill('35');
  await expect(page.getByTestId('node-button')).toHaveCSS('margin-top', '35px');
  await page.getByRole('button', { name: '위 바깥 여백 초기화' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  const saved = await (await page.request.get(`/api/pages/${id}`)).json();
  expect(saved.spec.root.children[0].style.controlAlignment).toBe('input');
  expect(saved.spec.root.children[0].children[3].style.marginTop).toBeUndefined();
  await page.getByRole('button', { name: '모바일', exact: true }).click();
  await expect(page.locator(`[data-node-id="${button.id}"]`)).toHaveCSS('margin-top', '0px');
});
