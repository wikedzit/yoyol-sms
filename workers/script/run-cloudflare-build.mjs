import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PRODUCTION_WORKER_NAME = 'yoyol-students-system';
const DEVELOPMENT_WORKER_NAME = 'yoyol-students-system-development';
const PRODUCTION_DATABASE_ID = '6923e920-0852-40ef-bc6b-49aa8bb4a7f4';
const DEVELOPMENT_DATABASE_ID = '32375355-5046-4098-9719-553a036ab578';

function chooseCloudflareEnv() {
  if (process.env.CLOUDFLARE_ENV) {
    return process.env.CLOUDFLARE_ENV;
  }

  // Workers Builds injects WORKERS_CI=1 and WORKERS_CI_BRANCH.
  // Production ships from main; every other CI branch is the development Worker.
  if (process.env.WORKERS_CI === '1') {
    const branchName = process.env.WORKERS_CI_BRANCH ?? '';
    const selectedEnv = branchName === 'main' ? 'production' : 'development';
    console.log(
      `Workers CI branch "${branchName || 'unknown'}" → ${selectedEnv}`,
    );
    return selectedEnv;
  }

  return 'production';
}

/** @param {string} cloudflareEnv */
function expectedBinding(cloudflareEnv) {
  if (cloudflareEnv === 'development') {
    return {
      workerName: DEVELOPMENT_WORKER_NAME,
      databaseId: DEVELOPMENT_DATABASE_ID,
    };
  }

  return {
    workerName: PRODUCTION_WORKER_NAME,
    databaseId: PRODUCTION_DATABASE_ID,
  };
}

function findFlattenedWranglerPath() {
  const buildPath = path.join(process.cwd(), 'build/server/wrangler.json');
  const distPath = path.join(process.cwd(), 'dist/server/wrangler.json');

  if (existsSync(buildPath)) {
    return buildPath;
  }

  if (existsSync(distPath)) {
    return distPath;
  }

  throw new Error(
    'Could not find flattened wrangler.json in build/server or dist/server.',
  );
}

/** @param {string} cloudflareEnv */
function assertFlattenedBinding(cloudflareEnv) {
  const wranglerPath = findFlattenedWranglerPath();
  const flattenedConfig = JSON.parse(readFileSync(wranglerPath, 'utf8'));
  const actualDatabaseId = flattenedConfig.d1_databases?.[0]?.database_id;
  const actualWorkerName = flattenedConfig.name;
  const expected = expectedBinding(cloudflareEnv);

  if (
    actualWorkerName === expected.workerName &&
    actualDatabaseId === expected.databaseId
  ) {
    console.log(
      `Cloudflare build ok: ${actualWorkerName} → D1 ${actualDatabaseId}`,
    );
    return;
  }

  console.error(
    [
      'Flattened Worker config does not match CLOUDFLARE_ENV.',
      `CLOUDFLARE_ENV=${cloudflareEnv}`,
      `expected name=${expected.workerName} database=${expected.databaseId}`,
      `actual   name=${actualWorkerName} database=${actualDatabaseId}`,
      'Workers Builds must set CLOUDFLARE_ENV at build time (development or production).',
    ].join('\n'),
  );
  process.exit(1);
}

const cloudflareEnv = chooseCloudflareEnv();
const buildEnv = { ...process.env, CLOUDFLARE_ENV: cloudflareEnv };

console.log(`Building Cloudflare env: ${cloudflareEnv}`);

const buildResult = spawnSync('pnpm', ['exec', 'react-router', 'build'], {
  stdio: 'inherit',
  env: buildEnv,
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

assertFlattenedBinding(cloudflareEnv);
