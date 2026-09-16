import { HttpException } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { styleSchema, patchSchema, type UiNode } from '@jjapgma/ui-spec';
import { McpAccessService, type McpActor } from './mcp-access.service.js';
import { ProposalsService } from './proposals.service.js';
import { createMcpTemplate, templateCatalog } from './template-context.js';
import {
  componentCatalog,
  componentSchema,
  componentTypeInput,
  compactPatchInput,
  designContext,
  designContextInput,
  operationGuide,
} from './design-context.js';
const pageInput = z.object({ pageId: z.uuid() }).strict();
const summary = z.string().trim().min(1).max(500);
export async function serveMcp(
  req: Request,
  res: Response,
  actor: McpActor,
  access: McpAccessService,
  proposals: ProposalsService,
) {
  const server = new Server({ name: 'jjapgma', version: '1.0.0' }, { capabilities: { tools: {} } });
  const tools: {
    name: string;
    description: string;
    schema: z.ZodType;
    advertisedSchema?: z.ZodType;
    write?: boolean;
    run: (args: Record<string, unknown>) => Promise<unknown> | unknown;
  }[] = [];
  const add = (
    name: string,
    description: string,
    schema: z.ZodType,
    run: (args: Record<string, unknown>) => Promise<unknown> | unknown,
    write = false,
    advertisedSchema?: z.ZodType,
  ) => tools.push({ name, description, schema, run, write, advertisedSchema });
  const none = z.object({}).strict();
  add('get_project', '연결된 프로젝트와 권한 조회', none, async () => ({
    ...(
      await access.db.pool.query('SELECT id,name,description FROM projects WHERE id=$1', [
        actor.projectId,
      ])
    ).rows[0],
    canPropose: actor.write,
  }));
  add(
    'get_current_selection',
    '내장 채팅의 현재 페이지·선택 요소·화면 크기. 외부 연결은 선택 문맥 없음.',
    none,
    () => ({ pageId: actor.pageId ?? null, ...actor.context }),
  );
  add('get_pages', '프로젝트의 저장된 페이지 목록', none, () =>
    proposals.pages.list(actor.projectId, actor.userId),
  );
  add('get_page_spec', '페이지 명세와 revision 조회. 화면 수정 전에 반드시 호출.', pageInput, (a) =>
    proposals.page(actor, a.pageId as string),
  );
  add(
    'get_design_context',
    '화면 생성의 첫 조회 도구. 필요한 여러 types의 속성과 공통 스타일·템플릿을 한 번에 반환. 모든 등록 종류를 함께 조회할 수 있고 중복은 제거함. 새 페이지는 pageId 생략, 기존 화면 수정만 pageId 지정. 이후 create_page 또는 apply_ui_patch 한 번으로 전체 변경을 제안. 개별 명세 반복 조회 불필요.',
    designContextInput,
    async (a) => ({
      ...designContext(a.types as Parameters<typeof designContext>[0]),
      ...(a.pageId ? { page: await proposals.page(actor, a.pageId as string) } : {}),
    }),
  );
  add(
    'get_component_registry',
    '공식 요소 종류의 간결한 목록. 화면 생성에는 get_design_context로 여러 요소 명세를 한 번에 조회하세요.',
    none,
    () => ({ components: componentCatalog() }),
  );
  add(
    'get_component_schema',
    '추가로 필요한 요소 하나의 기본 노드와 해당 속성만 조회. 여러 요소는 get_design_context(types) 한 번으로 조회. 이미 조회한 명세는 재사용.',
    z.object({ type: componentTypeInput }).strict(),
    (a) => ({
      ...componentSchema(a.type as z.infer<typeof componentTypeInput>),
      style: z.toJSONSchema(styleSchema),
    }),
  );
  add(
    'get_templates',
    '공식 템플릿 목록과 실제 포함 영역. 템플릿은 선택 가능한 재료다. 요청에 없는/빠진 영역을 확인하고 필요한 컴포넌트를 추가·수정해야 하며 이름만 비슷한 템플릿을 완성 결과로 반환하지 않는다.',
    none,
    templateCatalog,
  );
  add(
    'get_template',
    '템플릿을 재료로 쓸 때 실제 트리와 안정적인 요소 ID 조회. 이 ID로 기존 요소를 수정·이동·삭제하고 부족한 요소를 추가한 operations를 create_page의 templateId와 함께 전달한다. 새 기본 화면에는 조회가 필수가 아니다.',
    z.object({ templateId: z.string().max(60) }).strict(),
    (a) => createMcpTemplate(a.templateId as string),
  );
  add('get_theme', '페이지 테마와 디자인 토큰', pageInput, async (a) => ({
    theme: (await proposals.page(actor, a.pageId as string)).spec.theme ?? null,
  }));
  add(
    'get_actions',
    '페이지 요소의 모달·다이얼로그 동작 조회. 업무 API 바인딩은 아직 지원하지 않음.',
    pageInput,
    async (a) => {
      const actions: unknown[] = [];
      const visit = (n: UiNode) => {
        if (n.props.overlayAction) actions.push({ nodeId: n.id, ...n.props.overlayAction });
        n.children.forEach(visit);
      };
      visit((await proposals.page(actor, a.pageId as string)).spec.root);
      return { actions, bindingsSupported: false };
    },
  );
  add(
    'get_revision',
    '페이지의 저장 버전 조회',
    z.object({ pageId: z.uuid(), revision: z.number().int().positive() }).strict(),
    async (a) => {
      await proposals.page(actor, a.pageId as string);
      return proposals.pages.getRevision(a.pageId as string, actor.userId, a.revision as number);
    },
  );
  add('get_proposals', '현재 사용자의 프로젝트 변경 제안 목록', none, () =>
    proposals.list(actor.projectId, actor.userId),
  );
  add(
    'apply_ui_patch',
    '여러 요소 변경을 하나의 미리보기 제안으로 저장. 즉시 적용되지 않으며 사용자 적용 후 한 버전으로 저장됨.',
    z
      .object({
        pageId: z.uuid(),
        baseRevision: z.number().int().positive(),
        summary,
        operations: patchSchema,
      })
      .strict(),
    (a) => proposals.propose(actor, a as unknown as Parameters<ProposalsService['propose']>[1]),
    true,
    z
      .object({
        pageId: z.uuid(),
        baseRevision: z.number().int().positive(),
        summary,
        operations: compactPatchInput,
      })
      .strict(),
  );
  add(
    'create_page',
    '사용자가 요청한 모든 영역을 구성한 새 화면 제안. 템플릿 없이 operations로 직접 조합하거나 templateId와 operations를 함께 전달하여 템플릿에 없는 요소를 추가하고 기존 요소를 수정/이동/삭제한다. templateId만 전달하는 것은 요청이 이미 완전히 충족되거나 사용자가 원본 템플릿을 원할 때만 가능. 기존 템플릿 요소 ID는 get_template 결과를 사용. 루트는 page-root. 부모부터 추가하고 모바일 변경까지 한 번에 구성. blank=true는 명시적인 빈 페이지 요청만 허용. 사용자 적용 전에는 저장되지 않음.',
    z
      .object({
        name: z.string().trim().min(1).max(100),
        summary,
        templateId: z.string().max(60).optional(),
        operations: patchSchema.optional(),
        blank: z.boolean().optional(),
      })
      .strict(),
    (a) => proposals.propose(actor, a as unknown as Parameters<ProposalsService['propose']>[1]),
    true,
    z
      .object({
        name: z.string().trim().min(1).max(100),
        summary,
        templateId: z.string().max(60).optional(),
        operations: compactPatchInput.optional(),
        blank: z.boolean().optional(),
      })
      .strict(),
  );
  add(
    'rename_page',
    '페이지 이름 변경 제안',
    z
      .object({
        pageId: z.uuid(),
        baseRevision: z.number().int().positive(),
        name: z.string().trim().min(1).max(100),
        summary,
      })
      .strict(),
    (a) => proposals.propose(actor, a as unknown as Parameters<ProposalsService['propose']>[1]),
    true,
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    await access.check(actor);
    return {
      tools: tools
        .filter((t) => !t.write || actor.write)
        .map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: z.toJSONSchema(t.advertisedSchema ?? t.schema, {
            unrepresentable: 'any',
          }) as { type: 'object' },
          annotations: { readOnlyHint: !t.write, destructiveHint: false, openWorldHint: false },
        })),
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const started = Date.now();
    let toolName = 'unknown';
    let outcome = 'error';
    let validationCodes: string[] | undefined;
    try {
      const tool = tools.find((t) => t.name === request.params.name);
      if (!tool) throw new Error('알 수 없는 도구입니다.');
      toolName = tool.name;
      await access.check(actor, tool.write);
      const input = tool.schema.safeParse(request.params.arguments ?? {});
      if (!input.success) {
        validationCodes = [...new Set(input.error.issues.map((issue) => issue.code))];
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error:
                  '입력 검증 실패로 변경을 저장하지 않았습니다. issues의 경로·기대 값·허용 범위를 보고 수정하세요. unexpectedKeys는 지원하지 않는 필드입니다. 이미 받은 명세를 반복 조회하거나 같은 인자를 재전송하지 마세요.',
                issues: input.error.issues.slice(0, 10).map((issue) => ({
                  path: issue.path,
                  code: issue.code,
                  ...(issue.code === 'invalid_type' ? { expected: issue.expected } : {}),
                  ...(issue.code === 'invalid_value' ? { allowed: issue.values } : {}),
                  ...(issue.code === 'too_big'
                    ? { maximum: Number(issue.maximum), inclusive: issue.inclusive }
                    : {}),
                  ...(issue.code === 'too_small'
                    ? { minimum: Number(issue.minimum), inclusive: issue.inclusive }
                    : {}),
                  ...(issue.code === 'unrecognized_keys'
                    ? { unexpectedKeys: issue.keys.slice(0, 10).map((key) => key.slice(0, 80)) }
                    : {}),
                  ...(issue.code === 'invalid_union' && issue.path.at(-1) === 'op'
                    ? { allowed: ['add', 'update', 'move', 'remove', 'template'] }
                    : {}),
                })),
                ...(tool.name === 'create_page' || tool.name === 'apply_ui_patch'
                  ? { operationGuide }
                  : {}),
              }),
            },
          ],
        };
      }
      const result = await tool.run(input.data as Record<string, unknown>);
      await access.db.pool.query(
        'INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,$3,$4)',
        [actor.userId, actor.projectId, `mcp.${tool.name}`, actor.runId ?? actor.connectionId],
      );
      outcome = 'ok';
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text:
              error instanceof HttpException
                ? error.message
                : '도구 실행에 실패했습니다. 입력과 프로젝트 권한을 확인해 주세요.',
          },
        ],
      };
    } finally {
      console.info(
        JSON.stringify({
          event: 'mcp_tool_finished',
          runId: actor.runId,
          connectionId: actor.connectionId,
          tool: toolName,
          outcome,
          ...(validationCodes ? { validationCodes } : {}),
          elapsedMs: Date.now() - started,
        }),
      );
    }
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
