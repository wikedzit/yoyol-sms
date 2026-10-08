CREATE TABLE IF NOT EXISTS domain_events (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  event_name text NOT NULL,
  payload_version integer NOT NULL,
  payload_json text NOT NULL,
  status text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  available_at integer NOT NULL,
  last_error text
);

CREATE INDEX IF NOT EXISTS domain_events_pending
  ON domain_events (status, available_at);

CREATE TABLE IF NOT EXISTS extension_exports (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  extension_key text NOT NULL,
  body text NOT NULL,
  exported_at integer NOT NULL
);
