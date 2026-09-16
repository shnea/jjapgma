import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createSpec, createTemplate, validateSpec, type UiSpec } from '@jjapgma/ui-spec';
import { Database } from '../database/database.js';
import { projectAccess } from '../projects/access.js';
import { validateFileReferences } from '../files/references.js';
@Injectable()
export class PagesService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(projectId: string, userId: string) {
    await projectAccess(this.db.pool, projectId, userId);
    return (
      await this.db.pool.query(
        'SELECT id,name,revision,updated_at FROM pages WHERE project_id=$1 AND deleted_at IS NULL ORDER BY created_at,id LIMIT 500',
        [projectId],
      )
    ).rows;
  }
  async create(
    projectId: string,
    userId: string,
    name: string,
    templateId?: string,
    suppliedSpec?: UiSpec,
    connection?: PoolClient,
  ) {
    const execute = async (client: PoolClient) => {
      await projectAccess(client, projectId, userId, true);
      const id = randomUUID();
      let spec: UiSpec;
      try {
        spec = suppliedSpec
          ? validateSpec(suppliedSpec)
          : templateId
            ? createTemplate(templateId)
            : createSpec();
      } catch {
        throw new BadRequestException('템플릿을 찾을 수 없습니다.');
      }
      await validateFileReferences(client, spec, projectId);
      const page = (
        await client.query(
          'INSERT INTO pages(id,project_id,name,spec) VALUES($1,$2,$3,$4) RETURNING *',
          [id, projectId, name, spec],
        )
      ).rows[0];
      await client.query(
        'INSERT INTO page_revisions(page_id,revision,name,spec,author_id) VALUES($1,1,$2,$3,$4)',
        [id, name, spec, userId],
      );
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'page.create',$3)",
        [userId, projectId, id],
      );
      return page;
    };
    return connection ? execute(connection) : this.db.transaction(execute);
  }
  async get(pageId: string, userId: string) {
    const page = (
      await this.db.pool.query('SELECT * FROM pages WHERE id=$1 AND deleted_at IS NULL', [pageId])
    ).rows[0];
    if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다.');
    const role = await projectAccess(this.db.pool, page.project_id, userId);
    return { ...page, role };
  }
  async save(
    pageId: string,
    userId: string,
    input: { name: string; baseRevision: number; spec: unknown },
    connection?: PoolClient,
  ) {
    let spec: UiSpec;
    try {
      spec = validateSpec(input.spec);
    } catch {
      throw new BadRequestException('화면 구조를 확인해 주세요.');
    }
    const execute = async (client: PoolClient) => {
      const page = (await client.query('SELECT * FROM pages WHERE id=$1 FOR UPDATE', [pageId]))
        .rows[0];
      if (!page || page.deleted_at) throw new NotFoundException('페이지를 찾을 수 없습니다.');
      await projectAccess(client, page.project_id, userId, true);
      if (page.revision !== input.baseRevision)
        throw new ConflictException(
          '다른 곳에서 저장한 변경이 있습니다. 내 변경을 내려받거나 최신 화면을 불러오세요.',
        );
      await validateFileReferences(client, spec, page.project_id);
      const revision = page.revision + 1;
      const saved = (
        await client.query(
          'UPDATE pages SET name=$2,spec=$3,revision=$4,updated_at=now() WHERE id=$1 RETURNING *',
          [pageId, input.name, spec, revision],
        )
      ).rows[0];
      await client.query(
        'INSERT INTO page_revisions(page_id,revision,name,spec,author_id) VALUES($1,$2,$3,$4,$5)',
        [pageId, revision, input.name, spec, userId],
      );
      await client.query('UPDATE projects SET updated_at=now() WHERE id=$1', [page.project_id]);
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'page.save',$3)",
        [userId, page.project_id, pageId],
      );
      return saved;
    };
    return connection ? execute(connection) : this.db.transaction(execute);
  }
  async listRevisions(pageId: string, userId: string, before = 2147483647) {
    const page = (
      await this.db.pool.query('SELECT project_id,deleted_at FROM pages WHERE id=$1', [pageId])
    ).rows[0];
    if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다.');
    await projectAccess(this.db.pool, page.project_id, userId, Boolean(page.deleted_at));
    return (
      await this.db.pool.query(
        'SELECT page_id, revision, name, author_id, created_at FROM page_revisions WHERE page_id=$1 AND revision<$2 ORDER BY revision DESC LIMIT 50',
        [pageId, before],
      )
    ).rows;
  }
  async delete(pageId: string, userId: string, baseRevision: number) {
    return this.db.transaction(async (client) => {
      const page = (
        await client.query(
          'SELECT project_id,revision,deleted_at FROM pages WHERE id=$1 FOR UPDATE',
          [pageId],
        )
      ).rows[0];
      if (!page || page.deleted_at) throw new NotFoundException('페이지를 찾을 수 없습니다.');
      await projectAccess(client, page.project_id, userId, true);
      if (page.revision !== baseRevision)
        throw new ConflictException(
          '다른 곳에서 수정한 페이지입니다. 최신 화면을 불러온 뒤 삭제해 주세요.',
        );
      await client.query('UPDATE pages SET deleted_at=now(),updated_at=now() WHERE id=$1', [
        pageId,
      ]);
      await client.query('UPDATE projects SET updated_at=now() WHERE id=$1', [page.project_id]);
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'page.delete',$3)",
        [userId, page.project_id, pageId],
      );
      return { id: pageId };
    });
  }
  async getRevision(pageId: string, userId: string, revisionNumber: number) {
    const page = (
      await this.db.pool.query('SELECT project_id,deleted_at FROM pages WHERE id=$1', [pageId])
    ).rows[0];
    if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다.');
    await projectAccess(this.db.pool, page.project_id, userId, Boolean(page.deleted_at));
    const revision = (
      await this.db.pool.query('SELECT * FROM page_revisions WHERE page_id=$1 AND revision=$2', [
        pageId,
        revisionNumber,
      ])
    ).rows[0];
    if (!revision) throw new NotFoundException('해당 버전을 찾을 수 없습니다.');
    return revision;
  }
  async trash(projectId: string, userId: string) {
    await projectAccess(this.db.pool, projectId, userId, true);
    return (
      await this.db.pool.query(
        'SELECT id,name,revision,deleted_at FROM pages WHERE project_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC,id LIMIT 500',
        [projectId],
      )
    ).rows;
  }
  async restore(pageId: string, userId: string, baseRevision: number, sourceRevision: number) {
    return this.db.transaction(async (client) => {
      const page = (await client.query('SELECT * FROM pages WHERE id=$1 FOR UPDATE', [pageId]))
        .rows[0];
      if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다.');
      const role = await projectAccess(client, page.project_id, userId, true);
      if (!page.deleted_at || page.revision !== baseRevision)
        throw new ConflictException(
          '페이지 상태가 변경되었습니다. 삭제된 페이지 목록을 다시 불러오세요.',
        );
      const source = (
        await client.query(
          'SELECT name,spec FROM page_revisions WHERE page_id=$1 AND revision=$2',
          [pageId, sourceRevision],
        )
      ).rows[0];
      if (!source) throw new NotFoundException('해당 버전을 찾을 수 없습니다.');
      const spec = validateSpec(source.spec);
      await validateFileReferences(client, spec, page.project_id);
      const revision = page.revision + 1;
      const saved = (
        await client.query(
          'UPDATE pages SET deleted_at=NULL,name=$2,spec=$3,revision=$4,updated_at=now() WHERE id=$1 RETURNING *',
          [pageId, source.name, spec, revision],
        )
      ).rows[0];
      await client.query(
        'INSERT INTO page_revisions(page_id,revision,name,spec,author_id) VALUES($1,$2,$3,$4,$5)',
        [pageId, revision, source.name, spec, userId],
      );
      await client.query('UPDATE projects SET updated_at=now() WHERE id=$1', [page.project_id]);
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'page.restore',$3)",
        [userId, page.project_id, pageId],
      );
      return { ...saved, role };
    });
  }
}
