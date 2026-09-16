import type { PoolClient } from 'pg';
import { recordShareNotification } from '../notifications/record.js';

// Serialize email resolution with grant creation, including first-login races.
export async function lockEmail(client: PoolClient, email: string) {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [email]);
}

export async function claimAutoShares(client: PoolClient, userId: string) {
  const user = (await client.query('SELECT email FROM users WHERE id=$1', [userId])).rows[0];
  if (!user?.email) return;
  await lockEmail(client, user.email);
  const matches = await client.query('SELECT id FROM users WHERE email=$1', [user.email]);
  if (matches.rowCount !== 1) return;
  const pending = await client.query(
    "SELECT id,project_id,role FROM project_invitations WHERE email=$1 AND mode='auto' AND status='PENDING' ORDER BY project_id FOR UPDATE",
    [user.email],
  );
  for (const invitation of pending.rows) {
    await client.query(
      'INSERT INTO members(project_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
      [invitation.project_id, userId, invitation.role],
    );
    await client.query("UPDATE project_invitations SET status='ACCEPTED',user_id=$2 WHERE id=$1", [
      invitation.id,
      userId,
    ]);
    await recordShareNotification(client, invitation.id, userId);
    await client.query(
      "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'share.claim',$3)",
      [userId, invitation.project_id, invitation.id],
    );
  }
}
