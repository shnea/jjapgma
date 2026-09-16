import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { applyUiPatch, createSpec, validateSpec, type UiNode, type UiSpec } from '@jjapgma/ui-spec';
import { Database } from '../database/database.js';
import { PagesService } from '../pages/pages.service.js';
import { projectAccess } from '../projects/access.js';
import { validateFileReferences } from '../files/references.js';
import { McpAccessService, type McpActor } from './mcp-access.service.js';
import { createMcpTemplate } from './template-context.js';
import { mergeProposal } from './merge-proposal.js';
import type { PoolClient } from 'pg';
@Injectable()
export class ProposalsService {
  constructor(
    @Inject(Database) readonly db: Database,
    @Inject(PagesService) readonly pages: PagesService,
    @Inject(McpAccessService) readonly access: McpAccessService,
  ) {}
  async page(actor: McpActor, id: string) {
    if (actor.pageId && actor.pageId !== id)
      throw new NotFoundException('현재 AI 요청의 페이지가 아닙니다.');
    const page = await this.pages.get(id, actor.userId);
    if (page.project_id !== actor.projectId)
      throw new NotFoundException('페이지를 찾을 수 없습니다.');
    return page;
  }
  async propose(
    actor: McpActor,
    input: {
      pageId?: string;
      baseRevision?: number;
      name?: string;
      summary: string;
      operations?: unknown;
      templateId?: string;
      blank?: boolean;
    },
  ) {
    await this.access.check(actor, true);
    let spec: UiSpec,
      name = input.name ?? 'AI 페이지';
    if (input.pageId) {
      const page = await this.page(actor, input.pageId);
      if (page.revision !== input.baseRevision)
        throw new ConflictException(
          '페이지가 변경되었습니다. 최신 버전을 읽고 다시 제안해 주세요.',
        );
      if (actor.context && actor.context.currentRevision !== page.revision)
        throw new ConflictException('대화 시작 이후 페이지가 변경되었습니다.');
      name = input.name ?? page.name;
      try {
        spec = input.operations
          ? applyUiPatch(page.spec, input.operations)
          : validateSpec(page.spec);
      } catch {
        throw new BadRequestException('화면 변경이 요소 규칙 또는 잠금 조건에 맞지 않습니다.');
      }
    } else {
      if (!input.templateId && !input.operations && !input.blank)
        throw new BadRequestException(
          '화면 구성 내용이 없습니다. templateId 또는 operations로 실제 요소를 전달하세요. 새 루트 ID는 page-root입니다. 빈 페이지만 요청받은 경우에만 blank=true를 사용하세요.',
        );
      try {
        spec = input.templateId ? createMcpTemplate(input.templateId) : createSpec();
        const previousRootId = spec.root.id;
        spec.root.id = 'page-root';
        const remapRootAction = (node: UiNode) => {
          if (node.props.overlayAction?.targetId === previousRootId)
            node.props.overlayAction.targetId = spec.root.id;
          node.children.forEach(remapRootAction);
        };
        remapRootAction(spec.root);
        if (input.operations) spec = applyUiPatch(spec, input.operations);
      } catch {
        throw new BadRequestException('페이지 생성 내용을 확인해 주세요.');
      }
      if (!input.blank && !spec.root.children.length)
        throw new BadRequestException(
          '생성할 화면에 요소가 없습니다. operations로 실제 화면 요소를 추가하세요.',
        );
    }
    return this.db.transaction(async (db) => {
      await projectAccess(db, actor.projectId, actor.userId, true);
      await validateFileReferences(db, spec, actor.projectId);
      const id = randomUUID();
      await db.query(
        'INSERT INTO ui_proposals(id,project_id,user_id,page_id,run_id,name,summary,spec,base_revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          id,
          actor.projectId,
          actor.userId,
          input.pageId ?? null,
          actor.runId ?? null,
          name,
          input.summary,
          spec,
          input.baseRevision ?? null,
        ],
      );
      await db.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'ai.propose',$3)",
        [actor.userId, actor.projectId, id],
      );
      const componentCounts: Record<string, number> = {};
      let elementCount = 0;
      const countElements = (node: UiNode) => {
        elementCount++;
        componentCounts[node.type] = (componentCounts[node.type] ?? 0) + 1;
        node.children.forEach(countElements);
      };
      spec.root.children.forEach(countElements);
      return {
        proposalId: id,
        status: 'pending',
        rootId: spec.root.id,
        elementCount,
        componentCounts,
        message:
          '변경 제안을 저장했습니다. 사용자가 짭그마 AI 탭에서 미리보고 적용해야 화면에 저장됩니다.',
      };
    });
  }
  async list(projectId: string, userId: string) {
    await projectAccess(this.db.pool, projectId, userId);
    return (
      await this.db.pool.query(
        "SELECT id,page_id,run_id,name,summary,base_revision,status,applied_revision,created_at FROM ui_proposals WHERE project_id=$1 AND user_id=$2 AND NOT EXISTS(SELECT 1 FROM ai_runs r WHERE r.id=ui_proposals.run_id AND r.context ? 'image' AND r.status <> 'completed') ORDER BY created_at DESC LIMIT 50",
        [projectId, userId],
      )
    ).rows;
  }
  async get(id: string, userId: string) {
    const row = (
      await this.db.pool.query('SELECT * FROM ui_proposals WHERE id=$1 AND user_id=$2', [
        id,
        userId,
      ])
    ).rows[0];
    if (!row) throw new NotFoundException('제안을 찾을 수 없습니다.');
    await projectAccess(this.db.pool, row.project_id, userId);
    return row;
  }
  private async resolution(
    p: { page_id: string | null; base_revision: number; name: string; spec: UiSpec },
    connection = this.db.pool as Pick<PoolClient, 'query'>,
  ) {
    if (!p.page_id)
      return { revision: null, merged: { name: p.name, spec: p.spec }, conflicts: [] as string[] };
    const latest = (
      await connection.query(
        'SELECT name,spec,revision FROM pages WHERE id=$1 AND deleted_at IS NULL',
        [p.page_id],
      )
    ).rows[0];
    if (!latest) throw new NotFoundException('페이지를 찾을 수 없습니다.');
    if (latest.revision === p.base_revision)
      return {
        revision: latest.revision,
        merged: { name: p.name, spec: p.spec },
        conflicts: [] as string[],
      };
    const base = (
      await connection.query(
        'SELECT name,spec FROM page_revisions WHERE page_id=$1 AND revision=$2',
        [p.page_id, p.base_revision],
      )
    ).rows[0];
    return {
      revision: latest.revision,
      ...(base
        ? mergeProposal(
            base,
            { name: latest.name, spec: latest.spec },
            { name: p.name, spec: p.spec },
          )
        : { merged: null, conflicts: ['AI가 참고한 원본 버전이 없어 자동 병합할 수 없습니다.'] }),
    };
  }
  async review(id: string, userId: string) {
    const proposal = await this.get(id, userId);
    return { ...proposal, review: await this.resolution(proposal) };
  }
  async apply(
    id: string,
    userId: string,
    options: { mode?: 'merge' | 'overwrite'; expectedRevision?: number } = {},
  ) {
    return this.db.transaction(async (db) => {
      const p = (
        await db.query('SELECT * FROM ui_proposals WHERE id=$1 AND user_id=$2 FOR UPDATE', [
          id,
          userId,
        ])
      ).rows[0];
      if (!p) throw new NotFoundException('제안을 찾을 수 없습니다.');
      const role = await projectAccess(db, p.project_id, userId, true);
      if (p.status === 'applied') {
        const page = (
          await db.query('SELECT * FROM pages WHERE id=$1 AND deleted_at IS NULL', [p.page_id])
        ).rows[0];
        if (!page) throw new NotFoundException('적용된 페이지를 찾을 수 없습니다.');
        return { ...page, role };
      }
      if (p.status !== 'pending') throw new ConflictException('이미 처리한 제안입니다.');
      if (p.run_id) {
        const run = (await db.query('SELECT status,context FROM ai_runs WHERE id=$1', [p.run_id]))
          .rows[0];
        if (run?.context.image && run.status !== 'completed')
          throw new ConflictException('참고 이미지 처리가 완료된 제안만 적용할 수 있습니다.');
      }
      let document = { name: p.name, spec: p.spec },
        baseRevision = p.base_revision;
      if (p.page_id && options.mode) {
        await db.query('SELECT id FROM pages WHERE id=$1 FOR UPDATE', [p.page_id]);
        const review = await this.resolution(p, db);
        if (options.expectedRevision !== review.revision)
          throw new ConflictException(
            '미리보기 이후 화면이 다시 변경되었습니다. 미리보기를 새로 확인해 주세요.',
          );
        if (options.mode === 'merge') {
          if (!review.merged)
            throw new ConflictException(
              '같은 요소의 변경이 겹칩니다. AI 제안으로 덮어쓸지 선택해 주세요.',
            );
          document = review.merged;
        }
        baseRevision = review.revision;
      }
      const page = p.page_id
        ? await this.pages.save(p.page_id, userId, { ...document, baseRevision }, db)
        : await this.pages.create(p.project_id, userId, p.name, undefined, p.spec, db);
      await db.query(
        "UPDATE page_revisions SET source='ai',proposal_id=$3 WHERE page_id=$1 AND revision=$2",
        [page.id, page.revision, id],
      );
      await db.query(
        "UPDATE ui_proposals SET status='applied',page_id=$2,applied_revision=$3 WHERE id=$1",
        [id, page.id, page.revision],
      );
      await db.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'ai.apply',$3)",
        [userId, p.project_id, id],
      );
      return { ...page, role };
    });
  }
  async reject(id: string, userId: string) {
    const p = await this.get(id, userId);
    await this.db.pool.query(
      "UPDATE ui_proposals SET status='rejected' WHERE id=$1 AND user_id=$2 AND status='pending'",
      [p.id, userId],
    );
    return { id };
  }
}
