CREATE TABLE IF NOT EXISTS extensions (
  key text PRIMARY KEY NOT NULL,
  type text NOT NULL,
  publisher text NOT NULL,
  required integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS extension_versions (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  extension_key text NOT NULL,
  version text NOT NULL,
  manifest_json text NOT NULL,
  FOREIGN KEY (extension_key) REFERENCES extensions(key) ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS extension_versions_key_version
  ON extension_versions (extension_key, version);

CREATE TABLE IF NOT EXISTS extension_migrations (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  extension_key text NOT NULL,
  version text NOT NULL,
  applied_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS extension_settings (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  extension_key text NOT NULL,
  setting_key text NOT NULL,
  setting_value text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS extension_settings_school_key
  ON extension_settings (school_id, extension_key, setting_key);

CREATE TABLE IF NOT EXISTS hook_registrations (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  extension_key text NOT NULL,
  hook_name text NOT NULL,
  priority integer NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS event_subscriptions (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  extension_key text NOT NULL,
  event_name text NOT NULL
);
