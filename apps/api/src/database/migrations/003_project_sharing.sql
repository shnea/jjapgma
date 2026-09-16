ALTER TABLE users ADD COLUMN email text;
CREATE INDEX users_email ON users(email) WHERE email IS NOT NULL;

CREATE TABLE project_invitations (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('EDITOR','VIEWER')),
  mode text NOT NULL CHECK (mode IN ('auto','email')),
  status text NOT NULL CHECK (status IN ('PENDING','ACCEPTED','REVOKED')),
  user_id uuid REFERENCES users(id),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  token_hash text UNIQUE,
  notification_payload text,
  notification_id text,
  notification_status text NOT NULL DEFAULT 'NONE'
    CHECK (notification_status IN ('NONE','READY','QUEUED','FAILED'))
);
CREATE UNIQUE INDEX project_invitation_pending_email ON project_invitations(project_id,email)
  WHERE status='PENDING';
CREATE INDEX project_invitation_email ON project_invitations(email) WHERE status='PENDING';
