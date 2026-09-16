ALTER TABLE users ADD COLUMN nickname text CHECK (char_length(nickname) BETWEEN 1 AND 40);
CREATE TABLE ai_usage_runs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  project_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed')),
  complete boolean NOT NULL DEFAULT false,
  report_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days'
);
CREATE INDEX ai_usage_user_time ON ai_usage_runs(user_id,created_at DESC);
CREATE TABLE ai_usage_calls (
  run_id uuid NOT NULL REFERENCES ai_usage_runs(id) ON DELETE CASCADE,
  call_id text NOT NULL,
  model text,
  input_tokens bigint NOT NULL CHECK(input_tokens>=0),
  output_tokens bigint NOT NULL CHECK(output_tokens>=0),
  total_tokens bigint NOT NULL CHECK(total_tokens>=input_tokens+output_tokens),
  PRIMARY KEY(run_id,call_id)
);
