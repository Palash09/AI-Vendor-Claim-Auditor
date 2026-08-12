CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  product_url TEXT,
  product_description TEXT,
  intended_use TEXT,
  data_sensitivity TEXT,
  decision_impact TEXT,
  assumptions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  current_step INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audits_owner_updated ON audits(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_audits_expires_at ON audits(expires_at);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  original_file_name TEXT,
  storage_key TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sources_audit ON sources(audit_id);
CREATE INDEX IF NOT EXISTS idx_sources_owner ON sources(owner_id);

CREATE TABLE IF NOT EXISTS analysis_results (
  audit_id TEXT PRIMARY KEY REFERENCES audits(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  summary TEXT NOT NULL,
  findings_json TEXT NOT NULL,
  questions_json TEXT NOT NULL,
  extraction_warnings_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_owner ON analysis_results(owner_id);

CREATE TABLE IF NOT EXISTS source_fragments (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_location TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_fragments_audit ON source_fragments(audit_id);
CREATE INDEX IF NOT EXISTS idx_source_fragments_owner ON source_fragments(owner_id);
