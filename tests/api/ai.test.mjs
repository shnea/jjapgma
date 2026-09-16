import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { z } from 'zod';
import { patchSchema, propsSchema, styleSchema, registry, propertySchema } from '@jjapgma/ui-spec';
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL }),
  base = process.env.BASE_URL;
after(() => db.end());
async function identity() {
  const id = randomUUID(),
    token = randomUUID(),
    csrf = randomUUID();
  await db.query(
    'INSERT INTO users(id,issuer,subject,display_name) VALUES($1::uuid,$2,$1::text,$3)',
    [id, 'jjapgma:development', 'AI 테스트'],
  );
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
    [createHash('sha256').update(token).digest('hex'), id, csrf],
  );
  return { id, token, csrf };
}
async function request(path, who, method = 'GET', body) {
  await delay(110);
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      Cookie: `jjapgma_session=${who.token}`,
      'X-CSRF-Token': who.csrf,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function connect(projectId, token) {
  const client = new Client({ name: 'test-local-agent', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${base}/api/mcp/projects/${projectId}`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  return client;
}
test('project MCP scopes, structured proposals, revisions, idempotency and revocation', async () => {
  const owner = await identity(),
    viewer = await identity(),
    stranger = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: 'MCP 테스트' })).json();
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', {
      name: '원본',
    })
  ).json();
  await db.query("INSERT INTO members VALUES($1,$2,'VIEWER')", [project.id, viewer.id]);
  assert.equal(
    (
      await request(`/projects/${project.id}/mcp-connections`, viewer, 'POST', {
        name: '금지',
        scope: 'write',
      })
    ).status,
    403,
  );
  const readonly = await (
    await request(`/projects/${project.id}/mcp-connections`, owner, 'POST', {
      name: '조회',
    })
  ).json();
  const read = await connect(project.id, readonly.token);
  assert.equal(
    (await read.listTools()).tools.some((t) => t.name === 'apply_ui_patch'),
    false,
  );
  assert.equal(
    (
      await read.callTool({
        name: 'get_page_spec',
        arguments: { pageId: page.id },
      })
    ).isError,
    undefined,
  );
  await read.close();
  const writable = await (
    await request(`/projects/${project.id}/mcp-connections`, owner, 'POST', {
      name: '편집',
      scope: 'write',
    })
  ).json();
  const client = await connect(project.id, writable.token);
  try {
    const args = {
      pageId: page.id,
      baseRevision: 1,
      summary: '버튼 추가',
      operations: [
        {
          op: 'add',
          parentId: page.spec.root.id,
          id: 'created-button',
          type: 'button',
          props: { text: '생성된 버튼' },
        },
      ],
    };
    const result = await client.callTool({
      name: 'apply_ui_patch',
      arguments: args,
    });
    assert.ok(!result.isError);
    const p = JSON.parse(result.content[0].text);
    assert.equal((await (await request(`/pages/${page.id}`, owner)).json()).revision, 1);
    assert.equal((await request(`/proposals/${p.proposalId}`, stranger)).status, 404);
    const saved = await (await request(`/proposals/${p.proposalId}/apply`, owner, 'POST')).json();
    assert.equal(saved.revision, 2);
    assert.equal(saved.spec.root.children[0].props.text, '생성된 버튼');
    assert.equal(
      (await (await request(`/proposals/${p.proposalId}/apply`, owner, 'POST')).json()).revision,
      2,
    );
    assert.equal(
      (await client.callTool({ name: 'apply_ui_patch', arguments: args })).isError,
      true,
    );
    assert.equal(
      (
        await client.callTool({
          name: 'get_page_spec',
          arguments: { pageId: randomUUID() },
        })
      ).isError,
      true,
    );
    const revision = (
      await db.query(
        'SELECT source,proposal_id FROM page_revisions WHERE page_id=$1 AND revision=2',
        [page.id],
      )
    ).rows[0];
    assert.equal(revision.source, 'ai');
    assert.equal(revision.proposal_id, p.proposalId);
    const listed = await (await request(`/projects/${project.id}/mcp-connections`, owner)).json();
    assert.ok(!JSON.stringify(listed).includes(writable.token));
    assert.ok(!JSON.stringify(listed).includes('token_hash'));
    await request(`/projects/${project.id}/mcp-connections/${writable.id}`, owner, 'DELETE');
    await assert.rejects(() => client.listTools());
  } finally {
    await client.close();
  }
});
test('MCP batches only relevant design schemas and builds a responsive main screen in one proposal', async () => {
  const owner = await identity();
  const project = await (
    await request('/projects', owner, 'POST', { name: '빠른 화면 구성' })
  ).json();
  const connection = await (
    await request(`/projects/${project.id}/mcp-connections`, owner, 'POST', {
      name: '설계',
      scope: 'write',
    })
  ).json();
  const client = await connect(project.id, connection.token);
  try {
    const tools = (await client.listTools()).tools;
    const createTool = tools.find((t) => t.name === 'create_page');
    const oldOperationsBytes = Buffer.byteLength(
      JSON.stringify(z.toJSONSchema(patchSchema, { unrepresentable: 'any' })),
    );
    const newOperationsBytes = Buffer.byteLength(
      JSON.stringify(createTool.inputSchema.properties.operations),
    );
    assert.ok(newOperationsBytes < oldOperationsBytes * 0.3);
    const response = await client.callTool({
      name: 'get_design_context',
      arguments: { types: ['container', 'navbar', 'heading', 'button'] },
    });
    assert.ok(!response.isError);
    const context = JSON.parse(response.content[0].text);
    assert.equal(context.rootId, 'page-root');
    assert.equal(context.page, undefined);
    assert.equal(context.components.container.node.type, 'container');
    assert.equal(context.components.button.props.properties.table, undefined);
    assert.equal(context.components.button.props.properties.chatMessages, undefined);
    assert.equal(context.components.button.props.properties.customCss, undefined);
    assert.ok(context.components.button.props.properties.overlayAction);
    assert.ok(context.components.navbar.props.properties.items);
    assert.ok(context.style.properties.direction);
    assert.ok(context.templates.some((t) => t.id === 'dashboard'));
    const legacyBytes =
      Buffer.byteLength(JSON.stringify({ components: registry, properties: propertySchema })) +
      4 *
        Buffer.byteLength(
          JSON.stringify({
            props: z.toJSONSchema(propsSchema, { unrepresentable: 'any' }),
            style: z.toJSONSchema(styleSchema),
          }),
        );
    const batchBytes = Buffer.byteLength(response.content[0].text);
    assert.ok(batchBytes < legacyBytes * 0.4);
    console.log(
      `design schema bytes: legacy ${legacyBytes}, batched ${batchBytes}; operation metadata: ${oldOperationsBytes} -> ${newOperationsBytes}`,
    );
    const operations = [
      {
        op: 'add',
        parentId: 'page-root',
        id: 'header',
        type: 'container',
        style: { direction: 'row', justify: 'space-between', height: '64px' },
      },
      { op: 'add', parentId: 'header', id: 'title', type: 'heading', props: { text: '메인 화면' } },
      { op: 'add', parentId: 'header', id: 'account', type: 'button', props: { text: '내 계정' } },
      {
        op: 'add',
        parentId: 'page-root',
        id: 'body',
        type: 'container',
        style: { direction: 'row' },
      },
      { op: 'add', parentId: 'body', id: 'sidebar', type: 'container', style: { width: '220px' } },
      {
        op: 'add',
        parentId: 'sidebar',
        id: 'menu',
        type: 'navbar',
        props: { items: '홈\n작업\n설정' },
        style: { direction: 'column' },
      },
      { op: 'add', parentId: 'body', id: 'main', type: 'container', style: { width: '100%' } },
      {
        op: 'add',
        parentId: 'main',
        id: 'welcome',
        type: 'heading',
        props: { text: '환영합니다' },
      },
      { op: 'update', nodeId: 'body', breakpoint: 'mobile', style: { direction: 'column' } },
      { op: 'update', nodeId: 'sidebar', breakpoint: 'mobile', style: { width: '100%' } },
    ];
    const result = await client.callTool({
      name: 'create_page',
      arguments: { name: '메인 화면', summary: '헤더·사이드바·본문', operations },
    });
    assert.ok(!result.isError, JSON.stringify(result));
    const proposal = JSON.parse(result.content[0].text);
    const calls = (
      await db.query(
        "SELECT action FROM audit WHERE target_id=$1 AND action LIKE 'mcp.%' AND action <> 'mcp.create' ORDER BY created_at",
        [connection.id],
      )
    ).rows;
    assert.deepEqual(
      calls.map((r) => r.action),
      ['mcp.get_design_context', 'mcp.create_page'],
    );
    const applied = await (
      await request(`/proposals/${proposal.proposalId}/apply`, owner, 'POST')
    ).json();
    const saved = await (await request(`/pages/${applied.id}`, owner)).json();
    assert.equal(saved.spec.root.children[0].children[0].props.text, '메인 화면');
    assert.equal(saved.spec.root.children[1].responsive.mobile.direction, 'column');
    assert.equal(saved.spec.root.children[1].children[0].responsive.mobile.width, '100%');
    for (const style of [{ width: 'calc(100% - 10px)' }, { background: 'javascript:bad' }]) {
      const invalid = await client.callTool({
        name: 'create_page',
        arguments: {
          name: '금지',
          summary: '잘못된 값',
          operations: [{ ...operations[0], style }],
        },
      });
      assert.equal(invalid.isError, true);
      assert.ok(JSON.parse(invalid.content[0].text).issues.length);
    }
    assert.equal(
      (
        await client.callTool({
          name: 'create_page',
          arguments: {
            name: '금지',
            summary: 'CSS 금지',
            operations: [{ ...operations[0], props: { customCss: 'body{}' } }],
          },
        })
      ).isError,
      true,
    );
    assert.equal(
      (await client.callTool({ name: 'get_design_context', arguments: { types: ['invented'] } }))
        .isError,
      true,
    );
    const repeated = await client.callTool({
      name: 'get_design_context',
      arguments: { types: Array(50).fill('button') },
    });
    assert.ok(!repeated.isError);
    assert.deepEqual(Object.keys(JSON.parse(repeated.content[0].text).components), ['button']);
    const single = JSON.parse(
      (await client.callTool({ name: 'get_component_schema', arguments: { type: 'chat' } }))
        .content[0].text,
    );
    assert.ok(single.props.properties.chatMessages);
    assert.equal(single.props.properties.table, undefined);
    const edit = JSON.parse(
      (
        await client.callTool({
          name: 'get_design_context',
          arguments: { pageId: saved.id, types: ['table'] },
        })
      ).content[0].text,
    );
    assert.equal(edit.page.revision, saved.revision);
    assert.ok(edit.components.table.props.properties.table);
  } finally {
    await client.close();
  }
});

test('MCP loads all registered component types and creates, applies and reloads a page containing every type', async () => {
  const owner = await identity();
  const project = await (
    await request('/projects', owner, 'POST', { name: '전체 종류 화면' })
  ).json();
  const connection = await (
    await request(`/projects/${project.id}/mcp-connections`, owner, 'POST', {
      name: '전체 명세',
      scope: 'write',
    })
  ).json();
  const client = await connect(project.id, connection.token);
  try {
    const types = Object.keys(registry);
    assert.ok(types.length > 12);
    const tools = (await client.listTools()).tools;
    assert.equal(
      tools.find((t) => t.name === 'get_design_context').inputSchema.properties.types.maxItems,
      undefined,
    );
    const response = await client.callTool({
      name: 'get_design_context',
      arguments: { types: [...types, ...types] },
    });
    assert.ok(!response.isError, JSON.stringify(response));
    const context = JSON.parse(response.content[0].text);
    assert.deepEqual(Object.keys(context.components).sort(), [...types].sort());
    const operations = [
      { op: 'add', parentId: 'page-root', id: 'content', type: 'container' },
      ...types.map((type) => ({
        op: 'add',
        parentId: 'content',
        id: `element-${type}`,
        type,
        props: context.components[type].node.props,
        style: context.components[type].node.style,
      })),
      {
        op: 'update',
        nodeId: 'content',
        breakpoint: 'mobile',
        style: { direction: 'column', padding: 12 },
      },
    ];
    const result = await client.callTool({
      name: 'create_page',
      arguments: {
        name: '전체 컴포넌트',
        summary: '12종을 넘는 화면 구성',
        operations,
      },
    });
    assert.ok(!result.isError, JSON.stringify(result));
    const proposal = JSON.parse(result.content[0].text);
    assert.equal(proposal.elementCount, types.length + 1);
    const applied = await request(`/proposals/${proposal.proposalId}/apply`, owner, 'POST');
    assert.equal(applied.status, 201);
    const page = await applied.json();
    const reloaded = await (await request(`/pages/${page.id}`, owner)).json();
    assert.deepEqual(
      reloaded.spec.root.children[0].children.map((n) => n.type).sort(),
      [...types].sort(),
    );
    assert.equal(reloaded.spec.root.children[0].responsive.mobile.padding, 12);
    const empty = await client.callTool({ name: 'get_design_context', arguments: { types: [] } });
    assert.equal(empty.isError, true);
    assert.equal(JSON.parse(empty.content[0].text).issues[0].minimum, 1);
  } finally {
    await client.close();
  }
});

test('n8n MCP rejects malformed creation, explains the contract and accepts a corrected request on the same client', async () => {
  const owner = await identity();
  const project = await (
    await request('/projects', owner, 'POST', { name: '생성 오류 복구' })
  ).json();
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', { name: '원본' })
  ).json();
  const threadId = randomUUID(),
    runId = randomUUID();
  await db.query('INSERT INTO ai_threads(id,project_id,user_id,title) VALUES($1,$2,$3,$4)', [
    threadId,
    project.id,
    owner.id,
    '규격 검증',
  ]);
  await db.query(
    "INSERT INTO ai_runs(id,thread_id,project_id,user_id,page_id,context,prompt,status,expires_at) VALUES($1,$2,$3,$4,$5,'{}','생성 검사','running',now()+interval '5 minutes')",
    [runId, threadId, project.id, owner.id, page.id],
  );
  const client = new Client({ name: 'n8n-validation-test', version: '1.0.0' });
  const countProposals = async () =>
    Number(
      (await db.query('SELECT count(*) FROM ui_proposals WHERE run_id=$1', [runId])).rows[0].count,
    );
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/api/mcp/n8n/${runId}`), {
        requestInit: {
          headers: { Authorization: 'Bearer isolated-ai-mcp-service-token-32-characters' },
        },
      }),
    );
    // Reproduce the reported create/componentType syntax; no parent relation was supplied.
    const malformed = await client.callTool({
      name: 'create_page',
      arguments: {
        name: '새페이지',
        summary: '사이드바 + 헤더 + 중앙 컨테이너 레이아웃',
        operations: [
          {
            op: 'create',
            id: 'root',
            componentType: 'container',
            style: { direction: 'column', height: '100%' },
          },
          { op: 'create', id: 'header', componentType: 'navbar', style: { padding: '0 24px' } },
          { op: 'create', id: 'body', componentType: 'container', style: { flex: '1' } },
        ],
      },
    });
    assert.equal(malformed.isError, true);
    const error = JSON.parse(malformed.content[0].text);
    assert.deepEqual(error.issues[0].path, ['operations', 0, 'op']);
    assert.equal(error.operationGuide.examples.add.op, 'add');
    assert.equal(error.operationGuide.examples.add.parentId, 'page-root');
    assert.equal(await countProposals(), 0);
    const invalidStyle = await client.callTool({
      name: 'create_page',
      arguments: {
        name: '새페이지',
        summary: '스타일 오류',
        operations: [
          { ...error.operationGuide.examples.add, style: { padding: '0 24px', flex: 1 } },
        ],
      },
    });
    assert.equal(invalidStyle.isError, true);
    const issues = JSON.parse(invalidStyle.content[0].text).issues;
    assert.ok(
      issues.some(
        (i) => i.path.join('.') === 'operations.0.style.padding' && i.expected === 'number',
      ),
    );
    assert.ok(
      issues.some((i) => i.code === 'unrecognized_keys' && i.unexpectedKeys.includes('flex')),
    );
    assert.ok(!JSON.stringify(issues).includes('0 24px'));
    const outOfRange = await client.callTool({
      name: 'create_page',
      arguments: {
        name: '잘못된 여백',
        summary: '범위 검사',
        operations: [{ ...error.operationGuide.examples.add, style: { padding: 999 } }],
      },
    });
    assert.equal(outOfRange.isError, true);
    const rangeIssue = JSON.parse(outOfRange.content[0].text).issues[0];
    assert.equal(rangeIssue.maximum, 160);
    assert.equal(rangeIssue.inclusive, true);
    assert.equal(await countProposals(), 0);
    const missingParent = await client.callTool({
      name: 'create_page',
      arguments: {
        name: '새페이지',
        summary: '부모 누락',
        operations: [{ op: 'add', id: 'header', type: 'container' }],
      },
    });
    assert.equal(missingParent.isError, true);
    assert.ok(
      JSON.parse(missingParent.content[0].text).issues.some(
        (i) => i.path.join('.') === 'operations.0.parentId',
      ),
    );
    const context = JSON.parse(
      (await client.callTool({ name: 'get_design_context', arguments: { types: ['container'] } }))
        .content[0].text,
    );
    assert.deepEqual(context.operationGuide, error.operationGuide);
    const corrected = await client.callTool({
      name: 'create_page',
      arguments: {
        name: '수정한 화면',
        summary: '정확한 규격으로 복구',
        operations: [
          context.operationGuide.examples.update,
          context.operationGuide.examples.add,
          {
            op: 'add',
            parentId: 'content',
            id: 'title',
            type: 'heading',
            props: { text: '정상 생성' },
            style: { paddingTop: 0, paddingRight: 24, paddingBottom: 0, paddingLeft: 24 },
          },
          context.operationGuide.examples.mobile,
        ],
      },
    });
    assert.ok(!corrected.isError, JSON.stringify(corrected));
    assert.equal(await countProposals(), 1);
    const preview = await (
      await request(`/proposals/${JSON.parse(corrected.content[0].text).proposalId}`, owner)
    ).json();
    assert.equal(preview.spec.root.children[0].children[0].props.text, '정상 생성');
    assert.equal(preview.spec.root.children[0].responsive.mobile.width, '100%');
    assert.equal(
      (await db.query('SELECT revision FROM pages WHERE id=$1', [page.id])).rows[0].revision,
      1,
    );
  } finally {
    await client.close();
    await db.query("UPDATE ai_runs SET status='completed',completed_at=now() WHERE id=$1", [runId]);
  }
});

test('MCP customizes inspected template elements and adds missing header/sidebar before a single apply', async () => {
  const owner = await identity();
  const project = await (
    await request('/projects', owner, 'POST', { name: '템플릿 재구성' })
  ).json();
  const connection = await (
    await request(`/projects/${project.id}/mcp-connections`, owner, 'POST', {
      name: '화면 설계',
      scope: 'write',
    })
  ).json();
  const client = await connect(project.id, connection.token);
  const readTemplate = async () =>
    JSON.parse(
      (await client.callTool({ name: 'get_template', arguments: { templateId: 'dashboard' } }))
        .content[0].text,
    );
  try {
    const template = await readTemplate();
    assert.deepEqual(await readTemplate(), template);
    assert.equal(template.root.id, 'page-root');
    const catalog = JSON.parse(
      (await client.callTool({ name: 'get_templates', arguments: {} })).content[0].text,
    );
    assert.deepEqual(
      catalog.find((t) => t.id === 'dashboard').sections.map((s) => s.type),
      ['heading', 'text', 'grid', 'card', 'card'],
    );
    const [title, subtitle, metrics, recent, chart] = template.root.children;
    const operations = [
      { op: 'update', nodeId: 'page-root', style: { padding: 0, gap: 0 } },
      { op: 'update', nodeId: title.id, props: { text: '내 업무 공간' } },
      {
        op: 'update',
        nodeId: metrics.children[0].children[0].id,
        props: { text: '나의 프로젝트' },
      },
      { op: 'remove', nodeId: subtitle.id },
      {
        op: 'add',
        parentId: 'page-root',
        id: 'main-header',
        type: 'container',
        style: { direction: 'row', height: '64px', justify: 'space-between' },
      },
      {
        op: 'add',
        parentId: 'main-header',
        id: 'brand',
        type: 'heading',
        props: { text: 'WORKSPACE' },
      },
      {
        op: 'add',
        parentId: 'main-header',
        id: 'profile',
        type: 'button',
        props: { text: '내 계정' },
      },
      {
        op: 'add',
        parentId: 'page-root',
        id: 'main-body',
        type: 'container',
        style: { direction: 'row' },
      },
      {
        op: 'add',
        parentId: 'main-body',
        id: 'main-sidebar',
        type: 'container',
        style: { width: '220px' },
      },
      {
        op: 'add',
        parentId: 'main-sidebar',
        id: 'main-menu',
        type: 'navbar',
        props: { items: '홈\n프로젝트\n설정' },
        style: { direction: 'column' },
      },
      {
        op: 'add',
        parentId: 'main-body',
        id: 'main-content',
        type: 'container',
        style: { width: '100%' },
      },
      ...[title, metrics, recent, chart].map((node) => ({
        op: 'move',
        nodeId: node.id,
        parentId: 'main-content',
      })),
      { op: 'update', nodeId: 'main-body', breakpoint: 'mobile', style: { direction: 'column' } },
      { op: 'update', nodeId: 'main-sidebar', breakpoint: 'mobile', style: { width: '100%' } },
    ];
    const result = await client.callTool({
      name: 'create_page',
      arguments: {
        name: '범용 메인',
        summary: '대시보드 본문에 헤더·사이드바 추가',
        templateId: 'dashboard',
        operations,
      },
    });
    assert.ok(!result.isError, JSON.stringify(result));
    const proposal = JSON.parse(result.content[0].text);
    const pending = await (await request(`/proposals/${proposal.proposalId}`, owner)).json();
    assert.equal(pending.status, 'pending');
    assert.deepEqual(
      pending.spec.root.children.map((n) => n.id),
      ['main-header', 'main-body'],
    );
    const content = pending.spec.root.children[1].children[1];
    assert.equal(content.id, 'main-content');
    assert.equal(content.children[0].props.text, '내 업무 공간');
    assert.equal(content.children[1].children[0].children[0].props.text, '나의 프로젝트');
    assert.deepEqual(pending.spec.theme, template.theme);
    const saved = await (
      await request(`/proposals/${proposal.proposalId}/apply`, owner, 'POST')
    ).json();
    assert.equal(saved.revision, 1);
    assert.equal(saved.spec.root.children[1].responsive.mobile.direction, 'column');
    assert.equal(
      saved.spec.root.children[1].children[0].children[0].props.items,
      '홈\n프로젝트\n설정',
    );
    assert.deepEqual(await readTemplate(), template, 'official template is never mutated');
    const second = JSON.parse(
      (
        await client.callTool({
          name: 'create_page',
          arguments: { name: '원본 대시보드', summary: '원본 재사용', templateId: 'dashboard' },
        })
      ).content[0].text,
    );
    const other = await (
      await request(`/proposals/${second.proposalId}/apply`, owner, 'POST')
    ).json();
    assert.equal(other.spec.root.children[0].props.text, title.props.text);
    assert.notEqual(saved.id, other.id);
    const patch = JSON.parse(
      (
        await client.callTool({
          name: 'apply_ui_patch',
          arguments: {
            pageId: saved.id,
            baseRevision: 1,
            summary: '첫 페이지만 수정',
            operations: [{ op: 'update', nodeId: title.id, props: { text: '수정된 제목' } }],
          },
        })
      ).content[0].text,
    );
    await request(`/proposals/${patch.proposalId}/apply`, owner, 'POST');
    assert.equal(
      (await (await request(`/pages/${other.id}`, owner)).json()).spec.root.children[0].props.text,
      title.props.text,
    );
    const before = (await (await request(`/projects/${project.id}/proposals`, owner)).json())
      .length;
    assert.equal(
      (
        await client.callTool({
          name: 'create_page',
          arguments: {
            name: '잘못된 변경',
            summary: '잘못된 ID',
            templateId: 'dashboard',
            operations: [{ op: 'remove', nodeId: 'missing-template-node' }],
          },
        })
      ).isError,
      true,
    );
    assert.equal(
      (await (await request(`/projects/${project.id}/proposals`, owner)).json()).length,
      before,
    );
  } finally {
    await client.close();
  }
});

test('MCP creates a custom page with nested elements without a template and rejects accidental empty proposals', async () => {
  const owner = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '직접 구성' })).json();
  const original = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', {
      name: '기존 화면',
    })
  ).json();
  const connection = await (
    await request(`/projects/${project.id}/mcp-connections`, owner, 'POST', {
      name: '화면 생성',
      scope: 'write',
    })
  ).json();
  const client = await connect(project.id, connection.token);
  try {
    const metadata = { name: '채팅 화면', summary: '대화 목록과 입력 영역' };
    const before = (await (await request(`/projects/${project.id}/proposals`, owner)).json())
      .length;
    assert.equal(
      (await client.callTool({ name: 'create_page', arguments: metadata })).isError,
      true,
    );
    assert.equal(
      (
        await client.callTool({
          name: 'create_page',
          arguments: {
            ...metadata,
            operations: [{ op: 'update', nodeId: 'page-root', style: { padding: 20 } }],
          },
        })
      ).isError,
      true,
    );
    const operations = [
      {
        op: 'add',
        id: 'chat-layout',
        parentId: 'page-root',
        type: 'container',
        style: { direction: 'row' },
      },
      {
        op: 'add',
        id: 'chat-history',
        parentId: 'chat-layout',
        type: 'list',
        props: { items: '이전 대화\n오늘 대화' },
      },
      {
        op: 'add',
        id: 'chat-input',
        parentId: 'chat-layout',
        type: 'input',
        props: { text: '메시지', placeholder: '메시지를 입력하세요' },
      },
      {
        op: 'add',
        id: 'chat-send',
        parentId: 'chat-layout',
        type: 'button',
        props: { text: '전송' },
      },
      {
        op: 'update',
        nodeId: 'chat-layout',
        breakpoint: 'mobile',
        style: { direction: 'column' },
      },
    ];
    assert.equal(
      (
        await client.callTool({
          name: 'create_page',
          arguments: {
            ...metadata,
            operations: [
              ...operations,
              {
                op: 'add',
                id: 'broken',
                parentId: 'missing-parent',
                type: 'text',
              },
            ],
          },
        })
      ).isError,
      true,
    );
    assert.equal(
      (await (await request(`/projects/${project.id}/proposals`, owner)).json()).length,
      before,
    );
    const result = await client.callTool({
      name: 'create_page',
      arguments: { ...metadata, operations },
    });
    assert.ok(!result.isError, JSON.stringify(result));
    const generated = JSON.parse(result.content[0].text);
    assert.equal(generated.elementCount, 4);
    assert.deepEqual(generated.componentCounts, {
      container: 1,
      list: 1,
      input: 1,
      button: 1,
    });
    assert.equal((await (await request(`/projects/${project.id}/pages`, owner)).json()).length, 1);
    const preview = await (await request(`/proposals/${generated.proposalId}`, owner)).json();
    assert.equal(preview.spec.root.id, 'page-root');
    assert.equal(preview.spec.root.children[0].children.length, 3);
    assert.equal(preview.spec.root.children[0].responsive.mobile.direction, 'column');
    const applied = await (
      await request(`/proposals/${generated.proposalId}/apply`, owner, 'POST')
    ).json();
    assert.equal(applied.revision, 1);
    assert.notEqual(applied.id, original.id);
    assert.deepEqual(applied.spec, preview.spec);
    assert.equal((await (await request(`/pages/${original.id}`, owner)).json()).revision, 1);
    assert.equal(
      (await (await request(`/proposals/${generated.proposalId}/apply`, owner, 'POST')).json()).id,
      applied.id,
    );
    assert.equal((await (await request(`/projects/${project.id}/pages`, owner)).json()).length, 2);
    const blank = await client.callTool({
      name: 'create_page',
      arguments: { name: '빈 화면', summary: '요청한 빈 화면', blank: true },
    });
    assert.equal(JSON.parse(blank.content[0].text).elementCount, 0);
    const template = await client.callTool({
      name: 'create_page',
      arguments: {
        name: '로그인',
        summary: '기존 템플릿',
        templateId: 'login',
      },
    });
    assert.ok(JSON.parse(template.content[0].text).elementCount > 0);
  } finally {
    await client.close();
  }
});

test('chat images use authorized file-service references and persist without raw image data', async () => {
  const owner = await identity(),
    viewer = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '이미지 대화' })).json();
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', {
      name: '원본',
    })
  ).json();
  await db.query("INSERT INTO members VALUES($1,$2,'VIEWER')", [project.id, viewer.id]);
  const input = {
    pageId: page.id,
    message: '참고 이미지로 그려줘',
    currentRevision: 1,
    selectedNodeIds: [],
    currentBreakpoint: 'desktop',
  };
  assert.equal(
    (
      await request(`/projects/${project.id}/chat`, owner, 'POST', {
        ...input,
        imageFileId: 'not-in-project',
      })
    ).status,
    404,
  );
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cOxkAAAAASUVORK5CYII=',
    'base64',
  );
  const form = new FormData();
  form.set('file', new Blob([bytes], { type: 'image/png' }), 'reference.png');
  const upload = await fetch(`${base}/api/files/upload?projectId=${project.id}`, {
    method: 'POST',
    headers: {
      Origin: base,
      Cookie: `jjapgma_session=${owner.token}`,
      'X-CSRF-Token': owner.csrf,
    },
    body: form,
  });
  assert.equal(upload.status, 201);
  const file = await upload.json();
  assert.equal(
    (
      await request(`/projects/${project.id}/chat`, viewer, 'POST', {
        ...input,
        imageFileId: file.fileId,
      })
    ).status,
    403,
  );
  await db.query(
    'INSERT INTO project_files(project_id,file_id,original_name,mime_type,byte_size,uploaded_by) VALUES($1,$2,$3,$4,$5,$6)',
    [project.id, 'not-image', 'text.txt', 'text/plain', 10, owner.id],
  );
  assert.equal(
    (
      await request(`/projects/${project.id}/chat`, owner, 'POST', {
        ...input,
        imageFileId: 'not-image',
      })
    ).status,
    400,
  );
  const sent = await (
    await request(`/projects/${project.id}/chat`, owner, 'POST', {
      ...input,
      imageFileId: file.fileId,
    })
  ).json();
  let run;
  for (let i = 0; i < 40; i++) {
    const history = await (await request(`/projects/${project.id}/chat`, owner)).json();
    run = history.runs.find((r) => r.id === sent.runId);
    if (run?.status !== 'running') break;
    await delay(100);
  }
  assert.equal(run.status, 'completed', run.reply);
  assert.equal(run.image.fileId, file.fileId);
  assert.ok(run.completed_at);
  const stored = (await db.query('SELECT context FROM ai_runs WHERE id=$1', [sent.runId])).rows[0]
    .context;
  assert.deepEqual(stored.image, {
    fileId: file.fileId,
    name: 'reference.png',
    mimeType: 'image/png',
  });
  assert.ok(!JSON.stringify(stored).includes('base64'));
  const unconfirmed = await (
    await request(`/projects/${project.id}/chat`, owner, 'POST', {
      ...input,
      imageFileId: file.fileId,
      message: '이미지 확인 누락 테스트',
    })
  ).json();
  for (let i = 0; i < 40; i++) {
    const state = (await db.query('SELECT status FROM ai_runs WHERE id=$1', [unconfirmed.runId]))
      .rows[0];
    if (state.status !== 'running') {
      assert.equal(state.status, 'failed');
      break;
    }
    await delay(100);
  }
  const hidden = (
    await db.query('SELECT id FROM ui_proposals WHERE run_id=$1', [unconfirmed.runId])
  ).rows[0];
  assert.ok(hidden);
  assert.equal((await request(`/proposals/${hidden.id}/apply`, owner, 'POST')).status, 409);
  assert.ok(
    !(await (await request(`/projects/${project.id}/proposals`, owner)).json()).some(
      (p) => p.id === hidden.id,
    ),
  );
});

test('long AI runs keep MCP access after three minutes, prevent overlap and reject expired access and late replies', async () => {
  const owner = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '긴 AI 작업' })).json();
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', {
      name: '원본',
    })
  ).json();
  const input = {
    pageId: page.id,
    message: '느린 응답 검증',
    currentRevision: 1,
    selectedNodeIds: [],
    currentBreakpoint: 'desktop',
  };
  const sent = await (await request(`/projects/${project.id}/chat`, owner, 'POST', input)).json();
  assert.ok(sent.runId);
  const lifetime = (
    await db.query(
      'SELECT extract(epoch FROM expires_at-created_at)::int AS seconds FROM ai_runs WHERE id=$1',
      [sent.runId],
    )
  ).rows[0].seconds;
  assert.equal(lifetime, 330);
  // Advance the persisted execution clock rather than keeping the test idle for three minutes.
  await db.query(
    "UPDATE ai_runs SET created_at=created_at-interval '3 minutes',expires_at=expires_at-interval '3 minutes' WHERE id=$1",
    [sent.runId],
  );
  const history = await (await request(`/projects/${project.id}/chat`, owner)).json();
  assert.equal(history.runs[0].status, 'running');
  assert.equal((await request(`/projects/${project.id}/chat`, owner, 'POST', input)).status, 409);
  const client = new Client({ name: 'long-run-test', version: '1.0.0' });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/api/mcp/n8n/${sent.runId}`), {
        requestInit: {
          headers: {
            Authorization: 'Bearer isolated-ai-mcp-service-token-32-characters',
          },
        },
      }),
    );
    assert.ok((await client.listTools()).tools.length);
    await db.query("UPDATE ai_runs SET expires_at=now()-interval '1 second' WHERE id=$1", [
      sent.runId,
    ]);
    await assert.rejects(() => client.listTools());
    const expired = await (await request(`/projects/${project.id}/chat`, owner)).json();
    assert.equal(expired.runs[0].status, 'failed');
    assert.ok(expired.runs[0].completed_at);
    await delay(5100);
    const result = (await db.query('SELECT status,reply FROM ai_runs WHERE id=$1', [sent.runId]))
      .rows[0];
    assert.equal(result.status, 'failed');
    assert.notEqual(result.reply, '늦게 도착한 응답');
  } finally {
    await client.close();
  }
});

test('chat delegates through authenticated n8n contract to request-scoped MCP, records history and fails explicitly', async () => {
  const owner = await identity(),
    stranger = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '채팅 테스트' })).json();
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', {
      name: '채팅 화면',
    })
  ).json();
  const input = {
    pageId: page.id,
    message: '버튼을 추가해줘',
    currentRevision: 1,
    selectedNodeIds: [page.spec.root.id],
    currentBreakpoint: 'mobile',
  };
  const sent = await (await request(`/projects/${project.id}/chat`, owner, 'POST', input)).json();
  assert.ok(sent.runId);
  let history;
  for (let i = 0; i < 30; i++) {
    history = await (await request(`/projects/${project.id}/chat`, owner)).json();
    if (history.runs[0]?.status !== 'running') break;
    await delay(100);
  }
  assert.equal(history.runs[0].status, 'completed');
  assert.ok(Date.parse(history.runs[0].completed_at) >= Date.parse(history.runs[0].created_at));
  assert.ok(!JSON.stringify(history).includes('jrun_'));
  const proposals = await (await request(`/projects/${project.id}/proposals`, owner)).json();
  assert.equal(proposals[0].run_id, sent.runId);
  assert.equal((await (await request(`/pages/${page.id}`, owner)).json()).revision, 1);
  assert.equal((await request(`/projects/${project.id}/chat`, stranger)).status, 404);
  assert.equal(
    (await db.query('SELECT status FROM ai_runs WHERE id=$1', [sent.runId])).rows[0].status,
    'completed',
  );
  const failed = await (
    await request(`/projects/${project.id}/chat`, owner, 'POST', {
      ...input,
      threadId: sent.threadId,
      message: '실패 테스트',
    })
  ).json();
  for (let i = 0; i < 30; i++) {
    history = await (await request(`/projects/${project.id}/chat`, owner)).json();
    if (history.runs.find((r) => r.id === failed.runId)?.status === 'failed') break;
    await delay(100);
  }
  assert.equal(history.runs.find((r) => r.id === failed.runId).status, 'failed');
  assert.match(history.runs.find((r) => r.id === failed.runId).reply, /HTTP 503/);
  const otherPage = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', {
      name: '다른 화면',
    })
  ).json();
  const scopedId = randomUUID();
  await db.query(
    "INSERT INTO ai_runs(id,thread_id,project_id,user_id,page_id,context,prompt,status,expires_at) VALUES($1,$2,$3,$4,$5,$6,'범위 검사','running',now()+interval '2 minutes')",
    [
      scopedId,
      sent.threadId,
      project.id,
      owner.id,
      page.id,
      { selectedNodeIds: [], currentRevision: 1, currentBreakpoint: 'desktop' },
    ],
  );
  const scoped = new Client({ name: 'n8n-scope-test', version: '1.0.0' });
  try {
    await scoped.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/api/mcp/n8n/${scopedId}`), {
        requestInit: {
          headers: {
            Authorization: 'Bearer isolated-ai-mcp-service-token-32-characters',
          },
        },
      }),
    );
    assert.equal(
      (
        await scoped.callTool({
          name: 'get_page_spec',
          arguments: { pageId: otherPage.id },
        })
      ).isError,
      true,
    );
    assert.equal(
      (await scoped.callTool({ name: 'get_design_context', arguments: { pageId: otherPage.id } }))
        .isError,
      true,
    );
    await db.query("UPDATE ai_runs SET status='completed' WHERE id=$1", [scopedId]);
    await assert.rejects(() => scoped.listTools());
  } finally {
    await scoped.close();
  }
});

test('SIGTERM records interrupted AI runs before closing the database and leaves other API workers alone', async () => {
  const owner = await identity();
  const project = await (await request('/projects', owner, 'POST', { name: '재시작 검증' })).json();
  const page = await (
    await request(`/projects/${project.id}/pages`, owner, 'POST', { name: '화면' })
  ).json();
  const unrelated = randomUUID(),
    thread = randomUUID();
  await db.query('INSERT INTO ai_threads(id,project_id,user_id,title) VALUES($1,$2,$3,$4)', [
    thread,
    project.id,
    owner.id,
    '별도 실행',
  ]);
  // A run belonging to another process must not be failed globally on startup/shutdown.
  const other = await identity();
  await db.query(
    "INSERT INTO ai_runs(id,thread_id,project_id,user_id,page_id,context,prompt,status,expires_at) VALUES($1,$2,$3,$4,$5,'{}','다른 프로세스','running',now()+interval '5 minutes')",
    [unrelated, thread, project.id, other.id, page.id],
  );
  const child = spawn(process.execPath, ['apps/api/dist/main.js'], {
    env: {
      ...process.env,
      AI_ENABLED: 'true',
      AI_WEBHOOK_URL: 'http://file-service:8080/ai',
      AI_WEBHOOK_TOKEN: 'isolated-ai-webhook-token-32-characters',
      AI_MCP_TOKEN: 'isolated-ai-mcp-service-token-32-characters',
    },
    stdio: 'ignore',
  });
  const exited = once(child, 'exit');
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        ready = (await fetch('http://127.0.0.1:3000/api/health')).ok;
      } catch {
        /* startup */
      }
      if (ready || child.exitCode !== null) break;
      await delay(50);
    }
    assert.ok(ready, 'isolated API process starts');
    const sent = await fetch(`http://127.0.0.1:3000/api/projects/${project.id}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: base,
        Cookie: `jjapgma_session=${owner.token}`,
        'X-CSRF-Token': owner.csrf,
      },
      body: JSON.stringify({
        pageId: page.id,
        message: '느린 응답 검증',
        currentRevision: 1,
        selectedNodeIds: [],
        currentBreakpoint: 'desktop',
      }),
    });
    assert.equal(sent.status, 201);
    const { runId } = await sent.json();
    await delay(150);
    child.kill('SIGTERM');
    const stopped = await Promise.race([
      exited,
      delay(8000, undefined, { ref: false }).then(() => {
        throw new Error('API did not stop cleanly');
      }),
    ]);
    assert.equal(stopped[0], 0);
    const run = (
      await db.query('SELECT status,reply,completed_at FROM ai_runs WHERE id=$1', [runId])
    ).rows[0];
    assert.equal(run.status, 'failed');
    assert.match(run.reply, /서버 재시작/);
    assert.ok(run.completed_at);
    assert.equal(
      (await db.query('SELECT status FROM ai_runs WHERE id=$1', [unrelated])).rows[0].status,
      'running',
    );
    const rejected = await fetch(`${base}/api/mcp/n8n/${runId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer isolated-ai-mcp-service-token-32-characters',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(rejected.status, 401);
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGKILL');
      await exited;
    }
    await db.query("UPDATE ai_runs SET status='failed',completed_at=now() WHERE id=$1", [
      unrelated,
    ]);
  }
});
