// Every bundled extension is a folder under extensions/<key>/.
// The same files are what a future zip package is allowed to contain,
// plus README.md and src/, which stay in the repository and are not packed.

export const extensionManifestFile = 'yoyol.extension.json';
export const extensionEntrypointFile = 'entrypoint.ts';
export const extensionReadmeFile = 'README.md';

// These tables stay in the kernel. An extension migration must not create them.
export const kernelOwnedTables = [
  'users',
  'sessions',
  'roles',
  'permissions',
  'role_permissions',
  'school',
  'campus',
  'school_memberships',
  'invitations',
  'academic_years',
  'terms',
  'audit_events',
  'sign_in_attempts',
  'password_resets',
  'extensions',
  'extension_versions',
  'extension_migrations',
  'extension_settings',
  'hook_registrations',
  'event_subscriptions',
  'school_extensions',
  'school_themes',
  'domain_events',
  'extension_exports',
  'notifications',
] as const;

const requiredFiles = [
  extensionManifestFile,
  extensionEntrypointFile,
  extensionReadmeFile,
  'locales/en.json',
  'locales/sw.json',
] as const;

const sharedRootEntries = new Set([
  extensionManifestFile,
  extensionEntrypointFile,
  extensionReadmeFile,
  'locales',
  'src',
  'assets',
]);

export function extensionLayoutProblems(extension: {
  key: string;
  type: 'plugin' | 'module';
  files: readonly string[];
}): string[] {
  const problems: string[] = [];
  const present = new Set(extension.files);

  for (const required of requiredFiles) {
    if (!present.has(required)) {
      problems.push(`${extension.key} is missing ${required}.`);
    }
  }

  const schemaFiles = extension.files.filter((file) => file.startsWith('schema/'));
  if (extension.type === 'plugin' && schemaFiles.length > 0) {
    problems.push(`${extension.key} is a plugin, so it cannot contain schema migrations.`);
  }

  for (const file of schemaFiles) {
    const name = file.slice('schema/'.length);
    if (name.includes('/') || !/^\d{3}_[a-z0-9_]+\.json$/.test(name)) {
      problems.push(`${extension.key} schema file ${file} must look like schema/001_initial.json.`);
    }
  }

  for (const file of extension.files) {
    const root = file.split('/')[0];
    if (sharedRootEntries.has(root)) {
      continue;
    }
    if (root === 'schema' && extension.type === 'module') {
      continue;
    }
    if (root === 'themes' && extension.key === 'themes') {
      continue;
    }
    problems.push(`${extension.key} has ${root}, which is not part of the extension layout.`);
  }

  return problems;
}
