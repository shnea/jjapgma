import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { findNode } from '@jjapgma/ui-spec';
import { config } from '../config.js';
import { Database } from '../database/database.js';
import { PagesService } from '../pages/pages.service.js';
import { projectAccess } from '../projects/access.js';
import { readWebhookReply, WebhookResponseError } from './webhook-response.js';
import { FileClient, fileIdSchema } from '../files/file-client.js';
import { hash, randomToken } from '../auth/crypto.js';
import { UsageService } from './usage.service.js';

const requestTimeoutMs = 5 * 60 * 1000;
// Keep MCP valid through the full request, with a short allowance for setup/persistence.
const runLifetimeSeconds = requestTimeoutMs / 1000 + 30;

export const chatInput = z
  .object({
    threadId: z.uuid().optional(),
    imageFileId: fileIdSchema.optional(),
    pageId: z.uuid(),
    message: z.string().trim().min(1).max(6000),
    currentRevision: z.number().int().positive(),
    selectedNodeIds: z.array(z.string().max(80)).max(20),
    currentBreakpoint: z.enum(['desktop', 'tablet', 'mobile']),
  })
  .strict();
export type ChatInput = z.infer<typeof chatInput>;
@Injectable()
export class ChatService {
  private stopping = false;
  private readonly accepting = new Set<Promise<unknown>>();
  private readonly executions = new Map<
    string,
    { controller: AbortController; task: Promise<void> }
  >();
  constructor(
    @Inject(Database) readonly db: Database,
    @Inject(PagesService) readonly pages: PagesService,
    @Inject(UsageService) readonly usage: UsageService,
  ) {}
  async history(projectId: string, userId: string) {
    await projectAccess(this.db.pool, projectId, userId);
    await this.db.pool.query(
      "UPDATE ai_runs SET status='failed',completed_at=now(),reply='작업 시간이 초과되었습니다. 다시 요청해 주세요.' WHERE project_id=$1 AND user_id=$2 AND status='running' AND expires_at<now()",
      [projectId, userId],
    );
    const threads = (
      await this.db.pool.query(
        'SELECT id,title,created_at FROM ai_threads WHERE project_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 30',
        [projectId, userId],
      )
    ).rows;
    const runs = (
      await this.db.pool.query(
        "SELECT id,thread_id,page_id,prompt,reply,status,created_at,completed_at,context->'image' AS image FROM ai_runs WHERE project_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 100",
        [projectId, userId],
      )
    ).rows.reverse();
    return { enabled: config.AI_ENABLED === 'true', threads, runs };
  }
  async send(projectId: string, userId: string, input: ChatInput) {
    if (this.stopping)
      throw new ServiceUnavailableException(
        '서버를 재시작하고 있습니다. 잠시 후 다시 요청해 주세요.',
      );
    const pending = this.accept(projectId, userId, input);
    this.accepting.add(pending);
    try {
      return await pending;
    } finally {
      this.accepting.delete(pending);
    }
  }

  async shutdown() {
    this.stopping = true;
    // Finish accepting requests before aborting, so no run can be left between INSERT and tracking.
    await Promise.allSettled(this.accepting);
    const executions = [...this.executions.values()];
    executions.forEach(({ controller }) => controller.abort());
    await Promise.allSettled(executions.map(({ task }) => task));
  }

  private async accept(projectId: string, userId: string, input: ChatInput) {
    if (config.AI_ENABLED !== 'true')
      throw new ServiceUnavailableException(
        'n8n 인증과 MCP 연결 설정 후 AI 채팅을 사용할 수 있습니다.',
      );
    const page = await this.pages.get(input.pageId, userId);
    if (page.project_id !== projectId) throw new NotFoundException('페이지를 찾을 수 없습니다.');
    if (page.revision !== input.currentRevision)
      throw new ConflictException('최신 페이지를 불러온 후 요청해 주세요.');
    let image: { fileId: string; name: string; mimeType: string } | undefined;
    if (input.imageFileId) {
      const file = (
        await this.db.pool.query(
          'SELECT file_id,original_name,mime_type,byte_size FROM project_files WHERE project_id=$1 AND file_id=$2',
          [projectId, input.imageFileId],
        )
      ).rows[0];
      if (!file) throw new NotFoundException('프로젝트의 참고 이미지를 찾을 수 없습니다.');
      if (
        !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mime_type) ||
        Number(file.byte_size) > 5 * 1024 * 1024
      )
        throw new BadRequestException(
          '참고 이미지는 PNG, JPEG, WebP, GIF 형식의 5 MB 이하 파일이어야 합니다.',
        );
      image = {
        fileId: file.file_id,
        name: file.original_name,
        mimeType: file.mime_type,
      };
    }
    const context = {
      selectedNodeIds: input.selectedNodeIds.filter((id) => findNode(page.spec.root, id)),
      currentRevision: page.revision,
      currentBreakpoint: input.currentBreakpoint,
      ...(image ? { image } : {}),
    };
    const runId = randomUUID();
    const usageToken = randomToken();
    const threadId = await this.db.transaction(async (db) => {
      await projectAccess(db, projectId, userId, Boolean(image));
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const recent = (
        await db.query(
          "SELECT count(*)::int AS total,count(*) FILTER(WHERE status='running' AND expires_at>now())::int AS active FROM ai_runs WHERE user_id=$1 AND created_at>now()-interval '1 minute'",
          [userId],
        )
      ).rows[0];
      const active = (
        await db.query(
          "SELECT id FROM ai_runs WHERE user_id=$1 AND status='running' AND expires_at>now() LIMIT 1",
          [userId],
        )
      ).rowCount;
      if (active || recent.total >= 6)
        throw new ConflictException('이전 AI 작업이 끝난 뒤 잠시 후 다시 요청해 주세요.');
      let thread = input.threadId;
      if (thread) {
        const exists = await db.query(
          'SELECT id FROM ai_threads WHERE id=$1 AND project_id=$2 AND user_id=$3',
          [thread, projectId, userId],
        );
        if (!exists.rowCount) throw new NotFoundException('대화를 찾을 수 없습니다.');
      } else {
        thread = randomUUID();
        await db.query('INSERT INTO ai_threads(id,project_id,user_id,title) VALUES($1,$2,$3,$4)', [
          thread,
          projectId,
          userId,
          input.message.slice(0, 80),
        ]);
      }
      await db.query(
        "INSERT INTO ai_runs(id,thread_id,project_id,user_id,page_id,context,prompt,status,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,'running',now()+$8*interval '1 second')",
        [runId, thread, projectId, userId, page.id, context, input.message, runLifetimeSeconds],
      );
      await db.query(
        'INSERT INTO ai_usage_runs(id,user_id,project_id,report_token_hash) VALUES($1,$2,$3,$4)',
        [runId, userId, projectId, hash(usageToken)],
      );
      return thread;
    });
    const controller = new AbortController();
    const task = this.execute(
      runId,
      threadId,
      projectId,
      userId,
      input,
      context,
      controller.signal,
      usageToken,
    )
      .catch(() => {
        console.error(JSON.stringify({ event: 'ai_run_persistence_failed', runId }));
      })
      .finally(() => this.executions.delete(runId));
    this.executions.set(runId, { controller, task });
    return { runId, threadId };
  }
  private async execute(
    runId: string,
    threadId: string,
    projectId: string,
    userId: string,
    input: ChatInput,
    context: unknown,
    stopSignal: AbortSignal,
    usageToken: string,
  ) {
    const started = Date.now();
    let stage = 'prepare';
    let httpStatus: number | undefined;
    try {
      const history = (
        await this.db.pool.query(
          "SELECT prompt,reply FROM ai_runs WHERE thread_id=$1 AND status='completed' ORDER BY created_at DESC LIMIT 15",
          [threadId],
        )
      ).rows.reverse();
      const messages = history.flatMap((r) => [
        { role: 'user', content: r.prompt },
        { role: 'assistant', content: r.reply },
      ]);
      messages.push({ role: 'user', content: input.message });
      await projectAccess(this.db.pool, projectId, userId);
      const reference = (
        context as {
          image?: { fileId: string; name: string; mimeType: string };
        }
      ).image;
      const image = reference
        ? {
            ...reference,
            url: new FileClient(
              config.FILE_SERVICE_BASE_URL,
              config.FILE_SERVICE_BEARER_TOKEN,
            ).downloadUrl(reference.fileId),
          }
        : undefined;
      stage = 'request';
      const response = await fetch(config.AI_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.AI_WEBHOOK_TOKEN}`,
        },
        body: JSON.stringify({
          messages,
          ...(image ? { image } : {}),
          context: { projectId, pageId: input.pageId, ...(context as object) },
          mcp: { url: `${config.APP_URL}/api/mcp/n8n/${runId}` },
          requestId: runId,
          usageReport: { url: `${config.APP_URL}/api/ai/usage/${runId}`, token: usageToken },
        }),
        redirect: 'error',
        signal: AbortSignal.any([AbortSignal.timeout(requestTimeoutMs), stopSignal]),
      });
      httpStatus = response.status;
      stage = 'response';
      const reply = await readWebhookReply(response, image?.fileId, async (body) => {
        try {
          await this.usage.report(runId, usageToken, body);
        } catch {
          console.error(JSON.stringify({ event: 'ai_usage_report_failed', runId }));
        }
      });
      stopSignal.throwIfAborted();
      stage = 'save';
      await projectAccess(this.db.pool, projectId, userId);
      await this.db.pool.query(
        "UPDATE ai_runs SET status='completed',reply=$2,completed_at=now() WHERE id=$1 AND status='running'",
        [runId, reply],
      );
      await this.db.pool.query(
        "UPDATE ai_usage_runs SET status='completed',finished_at=now() WHERE id=$1",
        [runId],
      );
    } catch (error) {
      const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
      const network = stage === 'request' || stage === 'response';
      const code = stopSignal.aborted
        ? 'server_restart'
        : error instanceof WebhookResponseError
          ? error.code
          : timeout
            ? 'timeout'
            : network
              ? 'network'
              : 'internal';
      const reply = stopSignal.aborted
        ? '서버 재시작으로 AI 요청이 중단되었습니다. 다시 요청해 주세요.'
        : error instanceof WebhookResponseError
          ? error.message
          : timeout
            ? 'AI 응답 대기 시간(5분)을 초과했습니다. n8n Executions에서 실행 상태를 확인해 주세요.'
            : network
              ? 'n8n 연결이 끊겼거나 응답을 읽지 못했습니다. 연결 상태를 확인해 주세요.'
              : 'AI 결과를 저장하지 못했습니다. 프로젝트 접근 권한을 확인하고 다시 요청해 주세요.';
      console.error(
        JSON.stringify({
          event: 'ai_run_failed',
          runId,
          stage,
          code,
          httpStatus,
          elapsedMs: Date.now() - started,
        }),
      );
      await this.db.pool.query(
        "UPDATE ai_runs SET status='failed',reply=$2,completed_at=now() WHERE id=$1 AND status='running'",
        [runId, reply],
      );
      await this.db.pool.query(
        "UPDATE ai_usage_runs SET status='failed',finished_at=now() WHERE id=$1",
        [runId],
      );
    }
  }
}
