import type { PoolClient } from 'pg';

export async function recordShareNotification(
  client: PoolClient,
  invitationId: string,
  userId: string,
) {
  await client.query(
    `INSERT INTO user_notifications(user_id,project_id,invitation_id)
     SELECT $2,i.project_id,i.id FROM project_invitations i
     JOIN members m ON m.project_id=i.project_id AND m.user_id=$2
     WHERE i.id=$1 AND i.status='ACCEPTED' AND m.role<>'OWNER'
     ON CONFLICT DO NOTHING`,
    [invitationId, userId],
  );
}
