CREATE TABLE IF NOT EXISTS analysis_runs (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  requested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_owner_requested
  ON analysis_runs(owner_id, requested_at);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_requested
  ON analysis_runs(requested_at);
