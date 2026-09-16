import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { validateSpec, type UiNode, type UiSpec } from '@jjapgma/ui-spec';
import { Database } from '../database/database.js';
import { projectAccess } from '../projects/access.js';
import { validateFileReferences } from '../files/references.js';

@Injectable()
export class TemplatesService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(userId: string) {
    return (
      await this.db.pool.query(
        'SELECT id,name,created_at FROM personal_templates WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 100',
        [userId],
      )
    ).rows;
  }
  async get(id: string, userId: string, db: Pool | PoolClient = this.db.pool) {
    const item = (
      await db.query(
        'SELECT id,name,spec,created_at FROM personal_templates WHERE id=$1 AND user_id=$2',
        [id, userId],
      )
    ).rows[0];
    if (!item) throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    return item;
  }
  async save(userId: string, input: { name: string; sourcePageId: string; spec: unknown }) {
    let spec: UiSpec;
    try {
      spec = validateSpec(input.spec);
    } catch {
      throw new BadRequestException('화면 구조를 확인해 주세요.');
    }
    return this.db.transaction(async (client) => {
      const page = (
        await client.query(
          'SELECT project_id FROM pages WHERE id=$1 AND deleted_at IS NULL FOR SHARE',
          [input.sourcePageId],
        )
      ).rows[0];
      if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다.');
      await projectAccess(client, page.project_id, userId, true);
      await validateFileReferences(client, spec, page.project_id);
      // Serialize the account limit across tabs without locking other accounts.
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const count = (
        await client.query(
          'SELECT count(*)::int AS total FROM personal_templates WHERE user_id=$1',
          [userId],
        )
      ).rows[0].total;
      if (count >= 100)
        throw new BadRequestException('내 템플릿은 최대 100개까지 저장할 수 있습니다.');
      const id = randomUUID();
      const item = (
        await client.query(
          'INSERT INTO personal_templates(id,user_id,name,spec) VALUES($1,$2,$3,$4) RETURNING id,name,created_at',
          [id, userId, input.name, spec],
        )
      ).rows[0];
      const files = new Set<string>();
      function visit(node: UiNode) {
        if (node.props.attachment) files.add(node.props.attachment.fileId);
        node.children.forEach(visit);
      }
      visit(spec.root);
      await client.query(
        `INSERT INTO template_files(template_id,file_id,original_name,mime_type,byte_size)
        SELECT $1,file_id,original_name,mime_type,byte_size FROM project_files WHERE project_id=$2 AND file_id=ANY($3::text[])`,
        [id, page.project_id, [...files]],
      );
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'template.create',$3)",
        [userId, page.project_id, id],
      );
      return item;
    });
  }
  async use(id: string, userId: string, projectId: string) {
    return this.db.transaction(async (client) => {
      await projectAccess(client, projectId, userId, true);
      // Keep the snapshot and its file references together during concurrent deletion.
      await client.query('SELECT id FROM personal_templates WHERE id=$1 AND user_id=$2 FOR SHARE', [
        id,
        userId,
      ]);
      const item = await this.get(id, userId, client);
      await client.query(
        `INSERT INTO project_files(project_id,file_id,original_name,mime_type,byte_size,uploaded_by)
        SELECT $1,file_id,original_name,mime_type,byte_size,$2 FROM template_files WHERE template_id=$3
        ON CONFLICT(project_id,file_id) DO NOTHING`,
        [projectId, userId, id],
      );
      await validateFileReferences(client, validateSpec(item.spec), projectId);
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'template.use',$3)",
        [userId, projectId, id],
      );
      return item;
    });
  }
  async delete(id: string, userId: string) {
    const result = await this.db.pool.query(
      'DELETE FROM personal_templates WHERE id=$1 AND user_id=$2 RETURNING id',
      [id, userId],
    );
    if (!result.rowCount) throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    return { id };
  }
}
