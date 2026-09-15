CREATE TABLE project_files (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id varchar(128) NOT NULL,
  original_name varchar(200) NOT NULL,
  mime_type varchar(100) NOT NULL,
  byte_size integer NOT NULL CHECK(byte_size > 0),
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, file_id)
);
