import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chooseCloudflareEnv } from './choose-cloudflare-env.mjs';
import {
  BUILD_WRANGLER_CONFIG_PATH,
  writeBuildWranglerConfig,
} from './write-build-wrangler-config.mjs';

const require = createRequire(import.meta.url);
const BUILD_SCRIPT_MARKER = 'wrangler-env-v3';

function currentGitCommit() {
  const gitResult = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  });

  if (gitResult.status !== 0) {
    return 'unknown';
  }

  return gitResult.stdout.trim();
}

const PRODUCTION_WORKER_NAME = 'yoyol-students-system';
const DEVELOPMENT_WORKER_NAME = 'yoyol-students-system-development';
const PRODUCTION_DATABASE_ID = '6923e920-0852-40ef-bc6b-49aa8bb4a7f4';
const DEVELOPMENT_DATABASE_ID = '32375355-5046-4098-9719-553a036ab578';

function reactRouterCliPath() {
  const packageJsonPath = require.resolve('@react-router/dev/package.json');
  return path.join(path.dirname(packageJsonPath), 'bin.js');
}

/** @param {string} cloudflareEnv */
function expectedBinding(cloudflareEnv) {
  if (cloudflareEnv === 'development') {
    return {
      workerName: DEVELOPMENT_WORKER_NAME,
      databaseId: DEVELOPMENT_DATABASE_ID,
      databaseName: 'yoyol-student-system-development',
    };
  }

  return {
    workerName: PRODUCTION_WORKER_NAME,
    databaseId: PRODUCTION_DATABASE_ID,
    databaseName: 'yoyol-student-system',
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
function rewriteFlattenedBinding(cloudflareEnv) {
  const wranglerPath = findFlattenedWranglerPath();
  const flattenedConfig = JSON.parse(readFileSync(wranglerPath, 'utf8'));
  const expected = expectedBinding(cloudflareEnv);
  const actualDatabaseId = flattenedConfig.d1_databases?.[0]?.database_id;
  const actualWorkerName = flattenedConfig.name;

  if (
    actualWorkerName === expected.workerName &&
    actualDatabaseId === expected.databaseId
  ) {
    return;
  }

  console.warn(
    `Vite flattened name=${actualWorkerName} database=${actualDatabaseId}; rewriting to ${expected.workerName} / ${expected.databaseId}`,
  );

  flattenedConfig.name = expected.workerName;
  flattenedConfig.targetEnvironment = cloudflareEnv;

  if (flattenedConfig.topLevelName) {
    flattenedConfig.topLevelName = expected.workerName;
  }

  if (flattenedConfig.d1_databases?.[0]) {
    flattenedConfig.d1_databases[0].database_id = expected.databaseId;
    flattenedConfig.d1_databases[0].database_name = expected.databaseName;
  }

  writeFileSync(wranglerPath, `${JSON.stringify(flattenedConfig, null, '\t')}\n`);
}

function removeBuildWranglerConfig() {
  const buildWranglerPath = path.join(process.cwd(), BUILD_WRANGLER_CONFIG_PATH);

  if (existsSync(buildWranglerPath)) {
    unlinkSync(buildWranglerPath);
  }
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
      `targetEnvironment=${flattenedConfig.targetEnvironment ?? 'unset'}`,
      `expected name=${expected.workerName} database=${expected.databaseId}`,
      `actual   name=${actualWorkerName} database=${actualDatabaseId}`,
      `wranglerPath=${wranglerPath}`,
    ].join('\n'),
  );
  process.exit(1);
}

console.log(
  `Build script marker=${BUILD_SCRIPT_MARKER} commit=${currentGitCommit()}`,
);

const cloudflareEnv = chooseCloudflareEnv();
process.env.CLOUDFLARE_ENV = cloudflareEnv;

if (process.env.WORKERS_CI === '1') {
  console.log(
    `Workers CI branch "${process.env.WORKERS_CI_BRANCH ?? 'unknown'}" → ${cloudflareEnv}`,
  );
}

console.log(`Building Cloudflare env: ${cloudflareEnv}`);

const buildWranglerPath = writeBuildWranglerConfig(cloudflareEnv);
console.log(`Wrote single-env Wrangler config: ${buildWranglerPath}`);

try {
  const buildResult = spawnSync(
    process.execPath,
    [reactRouterCliPath(), 'build'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        CLOUDFLARE_ENV: cloudflareEnv,
      },
    },
  );

  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }
} finally {
  removeBuildWranglerConfig();
}

rewriteFlattenedBinding(cloudflareEnv);
assertFlattenedBinding(cloudflareEnv);
