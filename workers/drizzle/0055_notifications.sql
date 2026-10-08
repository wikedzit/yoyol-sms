ALTER TABLE audit_events ADD COLUMN extension_key text;
ALTER TABLE audit_events ADD COLUMN target text;

CREATE TABLE IF NOT EXISTS notifications (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  user_id integer,
  extension_key text NOT NULL,
  channel text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL,
  read_at integer,
  created_at integer NOT NULL
);
