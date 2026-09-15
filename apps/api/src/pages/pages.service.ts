import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createSpec, validateSpec, type UiSpec } from '@jjapgma/ui-spec';
import { Database } from '../database/database.js';
import { projectAccess } from '../projects/access.js';
@Injectable()
export class PagesService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(projectId: string, userId: string) {
    await projectAccess(this.db.pool, projectId, userId);
    return (
      await this.db.pool.query(
        'SELECT id,name,revision,updated_at FROM pages WHERE project_id=$1 ORDER BY created_at,id LIMIT 500',
        [projectId],
      )
    ).rows;
  }
  async create(projectId: string, userId: string, name: string) {
    return this.db.transaction(async (client) => {
      await projectAccess(client, projectId, userId, true);
      const id = randomUUID();
      const spec = createSpec();
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
    });
  }
  async get(pageId: string, userId: string) {
    const page = (await this.db.pool.query('SELECT * FROM pages WHERE id=$1', [pageId])).rows[0];
    if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다.');
    const role = await projectAccess(this.db.pool, page.project_id, userId);
    return { ...page, role };
  }
  async save(
    pageId: string,
    userId: string,
    input: { name: string; baseRevision: number; spec: unknown },
  ) {
    let spec: UiSpec;
    try {
      spec = validateSpec(input.spec);
    } catch {
      throw new BadRequestException('화면 구조를 확인해 주세요.');
    }
    return this.db.transaction(async (client) => {
      const page = (await client.query('SELECT * FROM pages WHERE id=$1 FOR UPDATE', [pageId]))
        .rows[0];
      if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다.');
      await projectAccess(client, page.project_id, userId, true);
      if (page.revision !== input.baseRevision)
        throw new ConflictException(
          '다른 곳에서 저장한 변경이 있습니다. 내 변경을 내려받거나 최신 화면을 불러오세요.',
        );
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
    });
  }
}
