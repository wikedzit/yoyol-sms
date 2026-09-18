export function chooseCloudflareEnv(env = process.env) {
  if (env.CLOUDFLARE_ENV) {
    return env.CLOUDFLARE_ENV;
  }

  // Workers Builds injects WORKERS_CI=1 and WORKERS_CI_BRANCH.
  // Production ships from main; every other CI branch is the development Worker.
  if (env.WORKERS_CI === '1') {
    return env.WORKERS_CI_BRANCH === 'main' ? 'production' : 'development';
  }

  return 'production';
}
