ALTER TABLE pages ADD COLUMN deleted_at timestamptz;
CREATE INDEX pages_trash ON pages(project_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;
