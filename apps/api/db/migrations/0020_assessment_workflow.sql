CREATE TABLE IF NOT EXISTS assessment_workflow_tasks (
  club_id TEXT NOT NULL REFERENCES clubs(id),
  task_id TEXT NOT NULL REFERENCES assessment_tasks(id),
  template_version_id TEXT NOT NULL REFERENCES assessment_template_versions(id),
  PRIMARY KEY (club_id, task_id)
);

CREATE TABLE IF NOT EXISTS assessment_workflow_students (
  club_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES student_profiles(id),
  state_json TEXT NOT NULL CHECK (json_valid(state_json)),
  PRIMARY KEY (club_id, task_id, student_id),
  FOREIGN KEY (club_id, task_id) REFERENCES assessment_workflow_tasks(club_id, task_id)
);
