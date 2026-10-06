ALTER TABLE school ADD COLUMN status text NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS permissions (
  key text PRIMARY KEY NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id integer NOT NULL,
  permission_key text NOT NULL,
  PRIMARY KEY (role_id, permission_key),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE cascade,
  FOREIGN KEY (permission_key) REFERENCES permissions(key)
);

INSERT INTO permissions (key, label)
SELECT 'school.profile.read', 'View the school'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'school.profile.read');
INSERT INTO permissions (key, label)
SELECT 'school.profile.update', 'Update the school profile'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'school.profile.update');
INSERT INTO permissions (key, label)
SELECT 'school.archive', 'Archive or restore the school'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'school.archive');
INSERT INTO permissions (key, label)
SELECT 'school.member.manage', 'Manage school members'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'school.member.manage');
INSERT INTO permissions (key, label)
SELECT 'school.role.manage', 'Manage school roles'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'school.role.manage');
INSERT INTO permissions (key, label)
SELECT 'campus.manage', 'Manage campuses'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'campus.manage');
INSERT INTO permissions (key, label)
SELECT 'students.record.read', 'View student records'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'students.record.read');
INSERT INTO permissions (key, label)
SELECT 'students.record.write', 'Change student records'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'students.record.write');
INSERT INTO permissions (key, label)
SELECT 'staff.record.read', 'View staff records'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'staff.record.read');
INSERT INTO permissions (key, label)
SELECT 'staff.record.write', 'Change staff records'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'staff.record.write');

INSERT INTO role_permissions (role_id, permission_key)
SELECT roles.id, permissions.key
FROM roles
CROSS JOIN permissions
WHERE roles.key = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_permissions.role_id = roles.id
      AND role_permissions.permission_key = permissions.key
  );

INSERT INTO role_permissions (role_id, permission_key)
SELECT roles.id, 'school.profile.read'
FROM roles
WHERE roles.key IN ('teacher', 'finance', 'student', 'parent')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_permissions.role_id = roles.id
      AND role_permissions.permission_key = 'school.profile.read'
  );

INSERT INTO role_permissions (role_id, permission_key)
SELECT roles.id, 'students.record.read'
FROM roles
WHERE roles.key = 'teacher'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_permissions.role_id = roles.id
      AND role_permissions.permission_key = 'students.record.read'
  );
