CREATE TABLE personal_templates (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  spec jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_templates_user ON personal_templates(user_id, created_at DESC, id);

CREATE TABLE template_files (
  template_id uuid NOT NULL REFERENCES personal_templates(id) ON DELETE CASCADE,
  file_id varchar(128) NOT NULL,
  original_name varchar(200) NOT NULL,
  mime_type varchar(100) NOT NULL,
  byte_size integer NOT NULL CHECK(byte_size > 0),
  PRIMARY KEY(template_id, file_id)
);
