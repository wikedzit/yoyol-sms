ALTER TABLE users ADD COLUMN totp_secret text;
ALTER TABLE users ADD COLUMN totp_enabled integer NOT NULL DEFAULT 0;
ALTER TABLE school ADD COLUMN require_privileged_totp integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY NOT NULL,
  user_id integer NOT NULL,
  refresh_hash text NOT NULL,
  expires_at integer NOT NULL,
  revoked_at integer,
  ip text,
  user_agent text,
  created_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS sign_in_attempts (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  email text NOT NULL,
  ip text,
  succeeded integer NOT NULL,
  created_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer,
  user_id integer,
  action text NOT NULL,
  detail text,
  ip text,
  created_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS invitations (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  school_id integer NOT NULL,
  email text,
  phone text,
  role_id integer NOT NULL,
  token_hash text NOT NULL UNIQUE,
  teacher_id integer,
  student_id integer,
  expires_at integer NOT NULL,
  accepted_at integer,
  created_by integer NOT NULL,
  created_at integer NOT NULL,
  FOREIGN KEY (school_id) REFERENCES school(id) ON DELETE cascade,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE restrict,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS password_resets (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  token_hash text NOT NULL UNIQUE,
  user_id integer,
  expires_at integer NOT NULL,
  used_at integer,
  created_at integer NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade
);
