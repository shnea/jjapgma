CREATE TABLE users (
  id uuid PRIMARY KEY, issuer text NOT NULL, subject text NOT NULL,
  display_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer, subject)
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  csrf_token text NOT NULL, expires_at timestamptz NOT NULL,
  refresh_token text, access_expires_at timestamptz
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE login_attempts (
  state_hash text PRIMARY KEY, nonce text NOT NULL, verifier text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE projects (
  id uuid PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id), role text NOT NULL CHECK (role IN ('OWNER','EDITOR','VIEWER')),
  PRIMARY KEY(project_id,user_id)
);
CREATE TABLE pages (
  id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL, spec jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pages_project ON pages(project_id);
CREATE TABLE page_revisions (
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE, revision integer NOT NULL,
  name text NOT NULL, spec jsonb NOT NULL, author_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(page_id,revision)
);
CREATE TABLE audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  project_id uuid REFERENCES projects(id), action text NOT NULL, target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
