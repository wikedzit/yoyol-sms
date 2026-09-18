import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const BUILD_WRANGLER_CONFIG_PATH = '.wrangler-build.json';

function parseJsonc(fileContents) {
  const withoutComments = fileContents
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const withoutTrailingCommas = withoutComments.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(withoutTrailingCommas);
}

/**
 * The Vite plugin flattens top-level wrangler.jsonc when CLOUDFLARE_ENV
 * never reaches it. Workers CI does that, so we write a one-environment
 * file and point the plugin at it.
 */
export function writeBuildWranglerConfig(cloudflareEnv, cwd = process.cwd()) {
  const sourcePath = path.join(cwd, 'wrangler.jsonc');
  const sourceConfig = parseJsonc(readFileSync(sourcePath, 'utf8'));
  const environmentConfig = sourceConfig.env?.[cloudflareEnv];

  if (!environmentConfig) {
    throw new Error(`wrangler.jsonc has no env.${cloudflareEnv} block.`);
  }

  const buildConfig = {
    $schema: sourceConfig.$schema,
    name: environmentConfig.name ?? sourceConfig.name,
    compatibility_date:
      environmentConfig.compatibility_date ?? sourceConfig.compatibility_date,
    main: environmentConfig.main ?? sourceConfig.main,
    vars: environmentConfig.vars ?? sourceConfig.vars,
    observability: environmentConfig.observability ?? sourceConfig.observability,
    d1_databases: environmentConfig.d1_databases ?? sourceConfig.d1_databases,
  };

  const outputPath = path.join(cwd, BUILD_WRANGLER_CONFIG_PATH);
  writeFileSync(outputPath, `${JSON.stringify(buildConfig, null, '\t')}\n`);

  return outputPath;
}
