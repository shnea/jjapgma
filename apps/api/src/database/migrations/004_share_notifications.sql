CREATE TABLE user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES project_invitations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE(user_id, invitation_id)
);
CREATE INDEX user_notifications_inbox ON user_notifications(user_id, created_at DESC);

INSERT INTO user_notifications(user_id,project_id,invitation_id,created_at)
SELECT i.user_id,i.project_id,i.id,i.created_at
FROM project_invitations i JOIN members m ON m.project_id=i.project_id AND m.user_id=i.user_id
WHERE i.status='ACCEPTED' AND m.role<>'OWNER'
ON CONFLICT DO NOTHING;
