import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const origin = 'https://jamaaltreasures.com';
const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export function flyerEntries(events, read = readFileSync) {
  return [...new Set(events.map(event => event.imageKey))].map(key => {
    if (!/^event-flyers\/[\w.-]+\.(?:jpg|jpeg|png|webp)$/i.test(key)) throw new Error(`Invalid event flyer key: ${key}`);
    const filename = key.split('/').at(-1);
    const file = `assets/events/originals/${filename}`;
    const bytes = read(file);
    return { key, filename, file, md5: createHash('md5').update(bytes).digest('hex'),
      contentType: mimeTypes[filename.split('.').at(-1).toLowerCase()] };
  });
}

// The public route returns R2's strong HTTP ETag. Wrangler single-part uploads
// use the original bytes' MD5. A weak/multipart/different ETag never counts as
// unchanged. Check storage each run, so a failed upload is retried next time;
// neither a Git diff nor an ephemeral CI cache can falsely mark it uploaded.
export async function syncFlyers(entries, { probe, upload, concurrency = 8, checkOnly = false, signal, log = console.log }) {
  const result = { checked: 0, unchanged: 0, pending: 0, uploaded: 0, failed: 0 };
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, async () => {
    while (next < entries.length) {
      const entry = entries[next++];
      if (signal?.aborted) { result.failed++; continue; }
      try {
        const response = await probe(entry, signal);
        result.checked++;
        if (response.ok && response.headers.get('etag')?.toLowerCase() === `"${entry.md5}"`) {
          result.unchanged++;
          continue;
        }
        if (!response.ok && response.status !== 404) throw new Error(`Flyer probe HTTP ${response.status}`);
        result.pending++;
        if (!checkOnly) {
          await upload(entry, signal);
          result.uploaded++;
        }
      } catch (error) {
        result.failed++;
        log(`Flyer deferred: ${entry.key}: ${error.message}`);
      }
    }
  }));
  return result;
}

function uploadFlyer(entry, signal) {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  if (!bucket) throw new Error('Set CLOUDFLARE_R2_BUCKET before uploading event flyers.');
  if (process.env.WORKERS_CI && !process.env.CLOUDFLARE_API_TOKEN) throw new Error('Cloudflare Workers Builds must provide CLOUDFLARE_API_TOKEN.');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'r2', 'object', 'put',
      `${bucket}/${entry.key}`, `--file=${entry.file}`, `--content-type=${entry.contentType}`,
      '--cache-control=public, max-age=31536000, immutable', '--force', '--remote'],
    { stdio: 'inherit', signal, timeout: 30_000, killSignal: 'SIGKILL' });
    child.once('error', reject);
    child.once('close', (code, killed) => code === 0 ? resolve() : reject(new Error(`Upload exited ${code ?? killed}`)));
  });
}

export async function main() {
  const started = performance.now();
  const events = JSON.parse(readFileSync('server/oracle-events.json', 'utf8'));
  const entries = flyerEntries(events);
  const signal = AbortSignal.timeout(90_000);
  const checkOnly = process.argv.includes('--check');
  const result = await syncFlyers(entries, {
    checkOnly, signal, upload: uploadFlyer,
    probe: (entry, batchSignal) => {
      const url = new URL(`/events/flyer/${entry.filename}`, origin);
      // Unique query + no-cache prevents an old HTTP cache entry hiding a change.
      url.searchParams.set('sync', `${Date.now()}-${entry.md5}`);
      return fetch(url, { method: 'HEAD', redirect: 'error',
        headers: { 'User-Agent': 'JamaalTreasuresPreviewCheck/1.0', 'Cache-Control': 'no-cache' },
        signal: AbortSignal.any([batchSignal, AbortSignal.timeout(8_000)]) });
    },
  });
  console.log(`Flyer delta ${checkOnly ? 'check' : 'sync'}: ${JSON.stringify(result)} in ${((performance.now() - started) / 1000).toFixed(2)}s`);
  if (result.failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
