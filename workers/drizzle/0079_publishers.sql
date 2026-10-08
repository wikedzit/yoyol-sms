CREATE TABLE trusted_publishers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publisher TEXT NOT NULL,
  key_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX trusted_publishers_key ON trusted_publishers (publisher, key_id);

CREATE TABLE revoked_extension_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  extension_key TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX revoked_extension_versions_key
  ON revoked_extension_versions (extension_key, version);
