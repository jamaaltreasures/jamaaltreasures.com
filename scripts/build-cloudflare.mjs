import { spawnSync, execFileSync } from 'node:child_process';

const preview = process.argv.includes('--preview');
const env = {
  ...process.env,
  SITE_DEPLOY_TARGET: 'cloudflare',
  SITE_GIT_COMMIT: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
};
if (!preview && !/^[a-f0-9-]{36}$/i.test(env.CLOUDFLARE_D1_DATABASE_ID || '')) {
  throw new Error('Set CLOUDFLARE_D1_DATABASE_ID to the provisioned database ID before a deployment build.');
}
if (!preview && !env.CLOUDFLARE_R2_BUCKET) {
  throw new Error('Set CLOUDFLARE_R2_BUCKET to the migrated media bucket before a deployment build.');
}
for (const args of [['prepare-public.mjs'], ['scripts/run-framework.mjs', 'build']]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status);
}
