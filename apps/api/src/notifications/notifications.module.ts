import {
  Controller,
  Get,
  Inject,
  Module,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthModule } from '../auth/auth.module.js';
import type { AuthRequest } from '../auth/auth.service.js';
import { Database } from '../database/database.js';
import { parse, uuid } from '../common/http.js';
import { claimAutoShares } from '../sharing/claim.js';

const visible = `EXISTS (SELECT 1 FROM members m WHERE m.project_id=n.project_id AND m.user_id=n.user_id)
  AND EXISTS (SELECT 1 FROM project_invitations i WHERE i.id=n.invitation_id AND i.status='ACCEPTED')`;

@Controller('api/notifications')
@UseGuards(AuthGuard)
class NotificationsController {
  constructor(@Inject(Database) private readonly db: Database) {}
  @Get() async list(@Req() request: AuthRequest) {
    return this.db.transaction(async (client) => {
      await claimAutoShares(client, request.identity.id);
      const items = await client.query(
        `SELECT n.id,n.project_id AS "projectId",p.name AS "projectName",n.created_at AS "createdAt",n.read_at AS "readAt"
         FROM user_notifications n JOIN projects p ON p.id=n.project_id
         WHERE n.user_id=$1 AND ${visible} ORDER BY n.created_at DESC,n.id DESC LIMIT 100`,
        [request.identity.id],
      );
      const count = await client.query(
        `SELECT count(*)::int AS count FROM user_notifications n WHERE n.user_id=$1 AND n.read_at IS NULL AND ${visible}`,
        [request.identity.id],
      );
      return { items: items.rows, unreadCount: count.rows[0].count };
    });
  }
  @Patch('read-all') async readAll(@Req() request: AuthRequest) {
    await this.db.pool.query(
      `UPDATE user_notifications n SET read_at=now() WHERE n.user_id=$1 AND n.read_at IS NULL AND ${visible}`,
      [request.identity.id],
    );
    return { ok: true };
  }
  @Patch(':id/read') async read(@Req() request: AuthRequest, @Param('id') value: string) {
    const result = await this.db.pool.query(
      `UPDATE user_notifications n SET read_at=COALESCE(read_at,now()) WHERE n.id=$1 AND n.user_id=$2 AND ${visible}`,
      [parse(uuid, value), request.identity.id],
    );
    if (!result.rowCount) throw new NotFoundException('알림을 찾을 수 없습니다.');
    return { ok: true };
  }
}
@Module({ imports: [AuthModule], controllers: [NotificationsController] })
export class NotificationsModule {}
