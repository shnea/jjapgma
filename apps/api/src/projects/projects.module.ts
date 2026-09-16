import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database } from '../database/database.js';
import { AuthModule, AuthGuard } from '../auth/auth.module.js';
import type { AuthRequest } from '../auth/auth.service.js';
import { parse, uuid } from '../common/http.js';
import { projectAccess, ownerAccess } from './access.js';
import { claimAutoShares } from '../sharing/claim.js';
const projectInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).default(''),
  })
  .strict();
@Controller('api/projects')
@UseGuards(AuthGuard)
class ProjectsController {
  constructor(@Inject(Database) private readonly db: Database) {}
  @Get() async list(@Req() request: AuthRequest) {
    await this.db.transaction((client) => claimAutoShares(client, request.identity.id));
    return (
      await this.db.pool.query(
        'SELECT p.*,m.role,(SELECT count(*)::int FROM pages WHERE project_id=p.id AND deleted_at IS NULL) AS "pageCount" FROM projects p JOIN members m ON m.project_id=p.id WHERE m.user_id=$1 ORDER BY p.updated_at DESC LIMIT 200',
        [request.identity.id],
      )
    ).rows;
  }
  @Post() async create(@Req() request: AuthRequest, @Body() body: unknown) {
    const input = parse(projectInput, body);
    const id = randomUUID();
    return this.db.transaction(async (client) => {
      const result = await client.query(
        'INSERT INTO projects(id,name,description) VALUES($1,$2,$3) RETURNING *',
        [id, input.name, input.description],
      );
      await client.query("INSERT INTO members VALUES($1,$2,'OWNER')", [id, request.identity.id]);
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'project.create',$2)",
        [request.identity.id, id],
      );
      return { ...result.rows[0], role: 'OWNER', pageCount: 0 };
    });
  }
  @Get(':id') async get(@Req() request: AuthRequest, @Param('id') value: string) {
    const id = parse(uuid, value);
    const role = await projectAccess(this.db.pool, id, request.identity.id);
    return {
      ...(await this.db.pool.query('SELECT * FROM projects WHERE id=$1', [id])).rows[0],
      role,
    };
  }
  @Delete(':id') async delete(@Req() request: AuthRequest, @Param('id') value: string) {
    const id = parse(uuid, value);
    return this.db.transaction(async (client) => {
      await ownerAccess(client, id, request.identity.id);
      await client.query('UPDATE audit SET project_id=NULL WHERE project_id=$1', [id]);
      await client.query('DELETE FROM projects WHERE id=$1', [id]);
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,NULL,'project.delete',$2)",
        [request.identity.id, id],
      );
      return { success: true };
    });
  }
}
@Module({ imports: [AuthModule], controllers: [ProjectsController] })
export class ProjectsModule {}
