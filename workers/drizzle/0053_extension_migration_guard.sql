CREATE UNIQUE INDEX IF NOT EXISTS extension_migrations_school_key_version
  ON extension_migrations (school_id, extension_key, version);
