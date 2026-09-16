CREATE TABLE mcp_connections (
  id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id), name text NOT NULL,
  scope text NOT NULL CHECK(scope IN ('read','write')), token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL, revoked_at timestamptz, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mcp_connections_project ON mcp_connections(project_id,user_id);
CREATE TABLE ai_threads (
  id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id), title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ai_runs (
  id uuid PRIMARY KEY, thread_id uuid NOT NULL REFERENCES ai_threads(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE, context jsonb NOT NULL,
  prompt text NOT NULL, reply text, status text NOT NULL CHECK(status IN ('running','completed','failed')),
  token_hash text UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_runs_thread ON ai_runs(thread_id,created_at);
CREATE TABLE ui_proposals (
  id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id), page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  run_id uuid REFERENCES ai_runs(id) ON DELETE CASCADE,
  name text NOT NULL, summary text NOT NULL, spec jsonb NOT NULL, base_revision integer,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied','rejected')),
  applied_revision integer, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ui_proposals_project ON ui_proposals(project_id,user_id,created_at);
ALTER TABLE page_revisions ADD COLUMN source text NOT NULL DEFAULT 'user';
ALTER TABLE page_revisions ADD COLUMN proposal_id uuid;
