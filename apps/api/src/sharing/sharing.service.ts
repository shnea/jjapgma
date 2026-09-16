import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { Database } from '../database/database.js';
import { ownerAccess } from '../projects/access.js';
import { config } from '../config.js';
import { encrypt, decrypt, hash, randomToken } from '../auth/crypto.js';
import { lockEmail } from './claim.js';
import { NotifyService } from './notify.service.js';
import { recordShareNotification } from '../notifications/record.js';

type Role = 'VIEWER' | 'EDITOR';
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

@Injectable()
export class SharingService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(NotifyService) private readonly notify: NotifyService,
  ) {}

  private async audit(
    client: PoolClient,
    userId: string,
    projectId: string,
    action: string,
    targetId: string,
  ) {
    await client.query(
      'INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,$3,$4)',
      [userId, projectId, action, targetId],
    );
  }

  async list(projectId: string, actor: string) {
    return this.db.transaction(async (client) => {
      await ownerAccess(client, projectId, actor);
      const members = await client.query(
        'SELECT u.id,COALESCE(u.nickname,u.display_name) AS "displayName",u.email,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 ORDER BY m.role,COALESCE(u.nickname,u.display_name),u.id',
        [projectId],
      );
      const invitations = await client.query(
        `SELECT id,email,role,mode,expires_at AS "expiresAt",notification_status AS "notificationStatus",
         (expires_at IS NOT NULL AND expires_at <= now()) AS expired
         FROM project_invitations WHERE project_id=$1 AND status='PENDING' ORDER BY created_at`,
        [projectId],
      );
      return {
        mode: config.SHARE_APPROVAL_MODE,
        members: members.rows,
        invitations: invitations.rows,
      };
    });
  }

  async add(projectId: string, actor: string, email: string, role: Role) {
    const id = randomUUID();
    await this.db.transaction(async (client) => {
      await lockEmail(client, email);
      await client.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE', [projectId]);
      await ownerAccess(client, projectId, actor);
      const users = await client.query('SELECT id FROM users WHERE email=$1', [email]);
      if (users.rows.length > 1)
        throw new ConflictException(
          '같은 이메일의 계정이 여러 개입니다. 계정 정보를 확인해 주세요.',
        );
      const userId: string | undefined = users.rows[0]?.id;
      if (
        userId &&
        (
          await client.query('SELECT 1 FROM members WHERE project_id=$1 AND user_id=$2', [
            projectId,
            userId,
          ])
        ).rowCount
      )
        throw new ConflictException('이미 공유된 사용자입니다. 목록에서 권한을 변경해 주세요.');
      // Expired email invitations may be replaced by a new, distinct event.
      await client.query(
        "UPDATE project_invitations SET status='REVOKED',notification_payload=NULL WHERE project_id=$1 AND email=$2 AND status='PENDING' AND expires_at<=now()",
        [projectId, email],
      );
      if (
        (
          await client.query(
            "SELECT 1 FROM project_invitations WHERE project_id=$1 AND email=$2 AND status='PENDING'",
            [projectId, email],
          )
        ).rowCount
      )
        throw new ConflictException('이미 추가된 이메일입니다. 대기 목록을 확인해 주세요.');
      const auto = config.SHARE_APPROVAL_MODE === 'auto';
      const token = auto ? null : randomToken();
      const project = (await client.query('SELECT name FROM projects WHERE id=$1', [projectId]))
        .rows[0];
      const payload = token
        ? encrypt(
            JSON.stringify({
              channel: 'EMAIL',
              to: { email },
              subject: `[짭그마] ${project.name} 프로젝트 공유 초대`,
              content: `<p>${escapeHtml(project.name)} 프로젝트에 초대되었습니다.</p><p>초대받은 이메일의 계정으로 로그인한 뒤 공유를 수락해 주세요.</p><p><a href="${config.APP_URL}/invitations#${token}">초대 확인</a></p><p>이 링크는 ${config.VERIFY_EMAIL_TTL_SECONDS / 3600}시간 동안 유효합니다.</p>`,
            }),
          )
        : null;
      await client.query(
        `INSERT INTO project_invitations(id,project_id,email,role,mode,status,user_id,created_by,expires_at,token_hash,notification_payload,notification_status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id,
          projectId,
          email,
          role,
          config.SHARE_APPROVAL_MODE,
          auto && userId ? 'ACCEPTED' : 'PENDING',
          auto ? (userId ?? null) : null,
          actor,
          auto ? null : new Date(Date.now() + config.VERIFY_EMAIL_TTL_SECONDS * 1000),
          token ? hash(token) : null,
          payload,
          auto ? 'NONE' : 'READY',
        ],
      );
      if (auto && userId)
        await client.query('INSERT INTO members(project_id,user_id,role) VALUES($1,$2,$3)', [
          projectId,
          userId,
          role,
        ]);
      await this.audit(client, actor, projectId, 'share.add', id);
      if (auto && userId) await recordShareNotification(client, id, userId);
    });
    if (config.SHARE_APPROVAL_MODE === 'email') await this.deliver(projectId, id, actor);
    return this.list(projectId, actor);
  }

  async deliver(projectId: string, id: string, actor: string) {
    await this.db.transaction(async (client) => {
      await ownerAccess(client, projectId, actor);
      const invitation = (
        await client.query(
          "SELECT * FROM project_invitations WHERE id=$1 AND project_id=$2 AND mode='email' AND status='PENDING' AND expires_at>now() FOR UPDATE",
          [id, projectId],
        )
      ).rows[0];
      if (!invitation) throw new NotFoundException('유효한 초대를 찾을 수 없습니다.');
      if (invitation.notification_status === 'QUEUED') return;
      const notificationId = await this.notify.send(
        id,
        JSON.parse(decrypt(invitation.notification_payload)),
      );
      await client.query(
        'UPDATE project_invitations SET notification_status=$2,notification_id=$3 WHERE id=$1',
        [id, notificationId ? 'QUEUED' : 'FAILED', notificationId],
      );
      await this.audit(
        client,
        actor,
        projectId,
        notificationId ? 'share.notify.queued' : 'share.notify.failed',
        id,
      );
    });
    return this.list(projectId, actor);
  }

  async member(projectId: string, actor: string, userId: string, role?: Role) {
    await this.db.transaction(async (client) => {
      await client.query('SELECT id FROM projects WHERE id=$1 FOR UPDATE', [projectId]);
      await ownerAccess(client, projectId, actor);
      const member = (
        await client.query(
          'SELECT role FROM members WHERE project_id=$1 AND user_id=$2 FOR UPDATE',
          [projectId, userId],
        )
      ).rows[0];
      if (!member) throw new NotFoundException('공유 사용자를 찾을 수 없습니다.');
      if (member.role === 'OWNER')
        throw new ForbiddenException('소유자는 공유 취소나 권한 변경 대상이 아닙니다.');
      if (role) {
        await client.query('UPDATE members SET role=$3 WHERE project_id=$1 AND user_id=$2', [
          projectId,
          userId,
          role,
        ]);
        await client.query(
          "UPDATE project_invitations SET role=$3 WHERE project_id=$1 AND user_id=$2 AND status='ACCEPTED'",
          [projectId, userId, role],
        );
      } else {
        await client.query('DELETE FROM members WHERE project_id=$1 AND user_id=$2', [
          projectId,
          userId,
        ]);
        await client.query(
          'UPDATE mcp_connections SET revoked_at=now() WHERE project_id=$1 AND user_id=$2 AND revoked_at IS NULL',
          [projectId, userId],
        );
        await client.query(
          "UPDATE ai_runs SET status='failed',reply='프로젝트 접근 권한이 취소되었습니다.' WHERE project_id=$1 AND user_id=$2 AND status='running'",
          [projectId, userId],
        );
        await client.query(
          "UPDATE project_invitations SET status='REVOKED',notification_payload=NULL WHERE project_id=$1 AND user_id=$2 AND status='ACCEPTED'",
          [projectId, userId],
        );
      }
      await this.audit(client, actor, projectId, role ? 'share.role' : 'share.revoke', userId);
    });
    return this.list(projectId, actor);
  }

  async invitation(projectId: string, actor: string, id: string, role?: Role) {
    await this.db.transaction(async (client) => {
      await ownerAccess(client, projectId, actor);
      const result = role
        ? await client.query(
            "UPDATE project_invitations SET role=$3 WHERE id=$1 AND project_id=$2 AND status='PENDING'",
            [id, projectId, role],
          )
        : await client.query(
            "UPDATE project_invitations SET status='REVOKED',notification_payload=NULL WHERE id=$1 AND project_id=$2 AND status='PENDING'",
            [id, projectId],
          );
      if (!result.rowCount)
        throw new ConflictException('공유 상태가 변경되었습니다. 목록을 새로고침해 주세요.');
      await this.audit(client, actor, projectId, role ? 'share.role' : 'share.revoke', id);
    });
    return this.list(projectId, actor);
  }

  async accept(token: string, actor: string, apply: boolean) {
    return this.db.transaction(async (client) => {
      const user = (await client.query('SELECT email FROM users WHERE id=$1', [actor])).rows[0];
      if (!user?.email)
        throw new ForbiddenException(
          '이메일을 확인할 수 없습니다. 로그아웃 후 다시 로그인해 주세요.',
        );
      await lockEmail(client, user.email);
      const invitation = (
        await client.query(
          `SELECT i.*,p.name AS "projectName" FROM project_invitations i JOIN projects p ON p.id=i.project_id
         WHERE token_hash=$1 AND mode='email' AND status IN ('PENDING','ACCEPTED') AND expires_at>now() FOR UPDATE OF i`,
          [hash(token)],
        )
      ).rows[0];
      if (!invitation) throw new NotFoundException('만료되었거나 취소된 초대입니다.');
      if (invitation.email !== user.email || (invitation.user_id && invitation.user_id !== actor))
        throw new ForbiddenException('초대받은 이메일의 계정으로 로그인해 주세요.');
      if ((await client.query('SELECT id FROM users WHERE email=$1', [user.email])).rowCount !== 1)
        throw new ConflictException('이메일에 연결된 계정을 확인해 주세요.');
      if (apply && invitation.status === 'PENDING') {
        await client.query(
          'INSERT INTO members(project_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [invitation.project_id, actor, invitation.role],
        );
        await client.query(
          "UPDATE project_invitations SET status='ACCEPTED',user_id=$2,notification_payload=NULL WHERE id=$1",
          [invitation.id, actor],
        );
        await this.audit(client, actor, invitation.project_id, 'share.accept', invitation.id);
        await recordShareNotification(client, invitation.id, actor);
      }
      return {
        projectId: invitation.project_id,
        projectName: invitation.projectName,
        role: invitation.role,
        accepted: apply || invitation.status === 'ACCEPTED',
      };
    });
  }
}
