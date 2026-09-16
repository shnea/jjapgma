import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { Database } from '../database/database.js';
import { projectAccess } from '../projects/access.js';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export type McpActor = {
  userId: string;
  projectId: string;
  write: boolean;
  connectionId?: string;
  runId?: string;
  pageId?: string;
  context?: { selectedNodeIds: string[]; currentRevision: number; currentBreakpoint: string };
};
@Injectable()
export class McpAccessService {
  constructor(@Inject(Database) readonly db: Database) {}
  async list(projectId: string, userId: string) {
    const role = await projectAccess(this.db.pool, projectId, userId);
    return (
      await this.db.pool.query(
        'SELECT id,name,scope,user_id,expires_at,revoked_at,last_used_at,created_at FROM mcp_connections WHERE project_id=$1 AND ($3 OR user_id=$2) ORDER BY created_at DESC LIMIT 200',
        [projectId, userId, role === 'OWNER'],
      )
    ).rows;
  }
  async create(
    projectId: string,
    userId: string,
    input: { name: string; scope: 'read' | 'write'; days: number },
  ) {
    return this.db.transaction(async (db) => {
      await projectAccess(db, projectId, userId, input.scope === 'write');
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const count = (
        await db.query(
          'SELECT count(*)::int AS count FROM mcp_connections WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now()',
          [userId],
        )
      ).rows[0].count;
      if (count >= 50) throw new BadRequestException('활성 MCP 연결은 최대 50개입니다.');
      const id = randomUUID(),
        token = `jmcp_${newToken()}`;
      const row = (
        await db.query(
          "INSERT INTO mcp_connections(id,project_id,user_id,name,scope,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+$7*interval '1 day') RETURNING id,name,scope,expires_at",
          [id, projectId, userId, input.name, input.scope, tokenHash(token), input.days],
        )
      ).rows[0];
      await db.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'mcp.create',$3)",
        [userId, projectId, id],
      );
      return { ...row, token };
    });
  }
  async revoke(projectId: string, userId: string, id: string) {
    return this.db.transaction(async (db) => {
      const role = await projectAccess(db, projectId, userId);
      const row = (
        await db.query(
          'UPDATE mcp_connections SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND project_id=$2 AND ($4 OR user_id=$3) RETURNING id',
          [id, projectId, userId, role === 'OWNER'],
        )
      ).rows[0];
      if (!row) throw new NotFoundException('연결을 찾을 수 없습니다.');
      await db.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'mcp.revoke',$3)",
        [userId, projectId, id],
      );
      return row;
    });
  }
  async authenticate(token: string, projectId?: string, runId?: string): Promise<McpActor> {
    if (runId) {
      if (
        config.AI_MCP_TOKEN.length < 32 ||
        !timingSafeEqual(Buffer.from(tokenHash(token)), Buffer.from(tokenHash(config.AI_MCP_TOKEN)))
      )
        throw new UnauthorizedException('MCP 서비스 인증이 필요합니다.');
      const row = (
        await this.db.pool.query(
          "SELECT * FROM ai_runs WHERE id=$1 AND expires_at>now() AND status='running'",
          [runId],
        )
      ).rows[0];
      if (!row) throw new UnauthorizedException('AI 요청 권한이 만료되었습니다.');
      const role = await projectAccess(this.db.pool, row.project_id, row.user_id);
      return {
        userId: row.user_id,
        projectId: row.project_id,
        write: role !== 'VIEWER',
        runId: row.id,
        pageId: row.page_id,
        context: row.context,
      };
    }
    if (!/^jmcp_[\w-]{43}$/.test(token)) throw new UnauthorizedException('MCP 인증이 필요합니다.');
    if (projectId) {
      const row = (
        await this.db.pool.query(
          'SELECT * FROM mcp_connections WHERE token_hash=$1 AND project_id=$2 AND revoked_at IS NULL AND expires_at>now()',
          [tokenHash(token), projectId],
        )
      ).rows[0];
      if (!row) throw new UnauthorizedException('MCP 연결이 만료되었거나 취소되었습니다.');
      const role = await projectAccess(this.db.pool, projectId, row.user_id);
      await this.db.pool.query('UPDATE mcp_connections SET last_used_at=now() WHERE id=$1', [
        row.id,
      ]);
      return {
        userId: row.user_id,
        projectId,
        write: row.scope === 'write' && role !== 'VIEWER',
        connectionId: row.id,
      };
    }
    throw new UnauthorizedException('MCP 인증이 필요합니다.');
  }
  async check(actor: McpActor, write = false) {
    await projectAccess(this.db.pool, actor.projectId, actor.userId, write);
    if (write && !actor.write) throw new ForbiddenException('읽기 전용 MCP 연결입니다.');
    if (actor.connectionId) {
      const exists = await this.db.pool.query(
        'SELECT id FROM mcp_connections WHERE id=$1 AND revoked_at IS NULL AND expires_at>now()',
        [actor.connectionId],
      );
      if (!exists.rowCount)
        throw new UnauthorizedException('MCP 연결이 만료되었거나 취소되었습니다.');
    }
    if (actor.runId) {
      const exists = await this.db.pool.query(
        "SELECT id FROM ai_runs WHERE id=$1 AND status='running' AND expires_at>now()",
        [actor.runId],
      );
      if (!exists.rowCount) throw new UnauthorizedException('AI 요청 권한이 만료되었습니다.');
    }
  }
}
