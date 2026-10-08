import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  builtWorker,
  localDevLines,
  packageFileList,
  packedPackageProblems,
  refusalToCreateExtension,
  refusalToSign,
  scaffoldExtension,
  signPackage,
  sourceProblems,
  storeZip,
} from '../workers/kernel/extension-cli.ts';

const command = process.argv[2];
const directory = option('--dir') ?? process.cwd();

if (command === 'create') {
  const key = process.argv[3] ?? '';
  const kind = option('--kind') ?? 'plugin';
  const refusal = refusalToCreateExtension(key, kind);
  if (refusal || (kind !== 'plugin' && kind !== 'module')) {
    fail(refusal ?? 'Choose a plugin or a module.');
  }
  const files = scaffoldExtension({ key, kind: kind as 'plugin' | 'module' });
  for (const [path, contents] of Object.entries(files)) {
    const target = join(directory, path);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, contents);
  }
  console.log(`Created ${kind} ${key} in ${directory}.`);
} else if (command === 'validate' || command === 'dev') {
  const files = readTree(directory);
  const problems = sourceProblems(files);
  const lines = command === 'dev' ? localDevLines(problems) : problems;
  if (lines.length === 0) console.log('The extension validates.');
  else console.log(lines.join('\n'));
  if (problems.length > 0) process.exitCode = 1;
} else if (command === 'build') {
  const files = readTree(directory);
  const problems = sourceProblems(files);
  if (problems.length > 0) fail(problems.join('\n'));
  const target = join(directory, 'dist/server.js');
  mkdirSync(join(directory, 'dist'), { recursive: true });
  writeFileSync(target, builtWorker(files));
  console.log(`Wrote ${target}.`);
} else if (command === 'pack') {
  const files = readTree(directory);
  const workerPath = join(directory, 'dist/server.js');
  const worker = readOptional(workerPath) ?? builtWorker(files);
  const packed = packageFileList(files, worker);
  const problems = packedPackageProblems(packed);
  if (problems.length > 0) fail(problems.join('\n'));
  const out = option('--out') ?? join(directory, 'extension.zip');
  writeFileSync(out, storeZip(packed));
  console.log(`Wrote ${out}.`);
} else if (command === 'sign') {
  const refusal = refusalToSign(process.env.YOYOL_SIGNING_KEY);
  if (refusal) fail(refusal);
  const files = readTree(directory);
  const worker = readOptional(join(directory, 'dist/server.js'));
  if (!worker) fail('Run yoyol-ext build before signing.');
  const packed = packageFileList(files, worker);
  const signature = await signPackage({
    files: packed,
    privateKeyPkcs8Base64: process.env.YOYOL_SIGNING_KEY ?? '',
    publisher: option('--publisher') ?? 'local',
    keyId: option('--key-id') ?? 'ci',
  });
  writeFileSync(join(directory, 'signature.json'), `${JSON.stringify(signature, null, 2)}\n`);
  console.log('Wrote signature.json.');
} else {
  fail('Use create, validate, build, pack, sign, or dev.');
}

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function readTree(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const path of filesUnder(root)) {
    if (path === 'dist/server.js' || path === 'signature.json' || path.endsWith('.zip')) continue;
    files[path] = readFileSync(join(root, path), 'utf8');
  }
  return files;
}

function filesUnder(root: string, directory = root): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      found.push(...filesUnder(root, path));
      continue;
    }
    found.push(relative(root, path).split(sep).join('/'));
  }
  return found;
}

function readOptional(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
