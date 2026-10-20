import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sitePage, createSitePageHandler } from '../server/site-pages.mjs';
import { sitePageFiles } from '../server/site-page-files.mjs';
import { assertSnapshots, verifySnapshots } from '../scripts/verify-snapshots.mjs';
import { flyerEntries, syncFlyers } from '../scripts/sync-event-flyers.mjs';

const request = (path, method = 'GET') => new Request('https://jamaaltreasures.com' + path, { method });

test('every registered page resolves with and without trailing slash and .html', async () => {
  for (const file of sitePageFiles) {
    if(file==='reviews.html')continue;
    const route = file === 'index.html' ? '' : '/' + file.replace(/\.html$/, '');
    const response = sitePage(request(route || '/'));
    assert.equal(response.status, 200, file);
    assert.equal(response.headers.get('x-jt-snapshot-key'), file);
    const html = await response.text();
    assert.ok(html.includes(readFileSync(file, 'utf8').match(/<title>.*?<\/title>/)[0]), file);
    for (const variant of [route + '/', '/' + file, '/' + file + '/']) {
      const result = sitePage(request(variant));
      assert.equal(result.status, 200, variant);
      assert.equal(await result.text(), html, variant);
    }
    assert.equal(await sitePage(request(route || '/', 'HEAD')).text(), '');
  }
});

test('missing known pages fail closed; unknown paths never select index.html', async () => {
  const broken = createSitePageHandler({ 'index.html': '<h1>Homepage</h1>' });
  for (const route of ['/dessert-wars-orlando', '/dessert-wars-orlando/']) {
    const response = broken(request(route));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(!(await response.text()).includes('Homepage'));
    assert.equal(await broken(request(route, 'HEAD')).text(), '');
  }
  assert.equal(broken(request('/unknown-deploy-check')), null);
  assert.equal(sitePage(request('/dessert-wars-orlando', 'POST')).status, 405);
});

test('all committed snapshot entries equal their shells and previous contents', () => verifySnapshots('HEAD'));

test('snapshot checks reject stale, missing, inconsistent and unrelated changes', () => {
  const shell = { 'index.html': 'home', 'story.html': 'new story' };
  const previous = { 'index.html': 'home', 'story.html': 'old story' };
  assert.doesNotThrow(() => assertSnapshots(shell, shell, shell, previous, previous));
  assert.throws(() => assertSnapshots(previous, previous, shell), /differs from shell/);
  assert.throws(() => assertSnapshots({ 'index.html': 'home' }, {}, shell), /page list/);
  assert.throws(() => assertSnapshots(shell, previous, shell), /JSON snapshots/);
  assert.throws(() => assertSnapshots(shell, shell, shell, previous, shell), /Unchanged shell/);
});

const entries = flyerEntries(['same', 'changed', 'new', 'fail'].map(name => ({ imageKey: `event-flyers/${name}.jpg` })), () => Buffer.from('flyer'));
const etagResponse = etag => new Response(null, { headers: { etag } });
const quiet = () => {};

test('delta sync skips identical originals, uploads only changed/new, and retries failed puts', async () => {
  const stored = new Map([[entries[0].key, entries[0].md5], [entries[1].key, 'old']]);
  const uploaded = [];
  const probe = async entry => stored.has(entry.key) ? etagResponse(`"${stored.get(entry.key)}"`) : new Response(null, { status: 404 });
  const upload = async entry => {
    uploaded.push(entry.key);
    if (entry.key.includes('fail')) throw new Error('simulated R2 outage');
    stored.set(entry.key, entry.md5);
  };
  const first = await syncFlyers(entries, { probe, upload, log: quiet });
  assert.deepEqual(first, { checked: 4, unchanged: 1, pending: 3, uploaded: 2, failed: 1 });
  assert.ok(!uploaded.includes(entries[0].key));
  uploaded.length = 0;
  const retry = await syncFlyers(entries, { probe, upload: async entry => uploaded.push(entry.key), log: quiet });
  assert.equal(retry.unchanged, 3);
  assert.deepEqual(uploaded, [entries[3].key]);
});

test('probe outages never trigger bulk uploads, and checks never write', async () => {
  let uploads = 0;
  const upload = async () => { uploads++; };
  const failure = await syncFlyers(entries, { probe: async () => new Response(null, { status: 503 }), upload, log: quiet });
  assert.equal(failure.failed, 4);
  assert.equal(uploads, 0);
  const check = await syncFlyers(entries, { probe: async () => new Response(null, { status: 404 }), upload, checkOnly: true });
  assert.equal(check.pending, 4);
  assert.equal(uploads, 0);
  const expired = await syncFlyers(entries, { probe: async () => { throw new Error('should not probe'); }, upload, signal: AbortSignal.abort(), log: quiet });
  assert.equal(expired.failed, 4);
});

test('weak/multipart ETags cannot falsely skip uploads; duplicate and invalid keys are handled', async () => {
  let uploads = 0;
  for (const etag of [`W/"${entries[0].md5}"`, `"${entries[0].md5}-2"`]) {
    await syncFlyers(entries.slice(0, 1), { probe: async () => etagResponse(etag), upload: async () => { uploads++; } });
  }
  assert.equal(uploads, 2);
  assert.equal(flyerEntries([{ imageKey: entries[0].key }, { imageKey: entries[0].key }], () => Buffer.from('x')).length, 1);
  assert.throws(() => flyerEntries([{ imageKey: 'event-flyers/../secret.jpg' }]), /Invalid/);
  assert.throws(() => flyerEntries([{ imageKey: 'event-flyers/missing.jpg' }], () => { throw new Error('missing original'); }), /missing original/);
});

test('a failed flyer sync does not fail the build; page-build failures still do; preview never syncs', t => {
  const root = mkdtempSync(path.resolve('.deployment-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'scripts'));
  writeFileSync(path.join(root, 'prepare-public.mjs'), 'process.exit(0);');
  writeFileSync(path.join(root, 'scripts/run-framework.mjs'), 'process.exit(0);');
  writeFileSync(path.join(root, 'scripts/sync-event-flyers.mjs'), 'console.log("SYNC_INVOKED");process.exit(7);');
  const run = args => spawnSync(process.execPath, [path.resolve('scripts/build-cloudflare.mjs'), ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, WORKERS_CI: '1', CLOUDFLARE_D1_DATABASE_ID: '00000000-0000-4000-8000-000000000000', CLOUDFLARE_R2_BUCKET: 'test-unused' },
  });
  const failedSync = run([]);
  assert.equal(failedSync.status, 0);
  assert.match(failedSync.stderr, /continuing page deployment/);
  const preview = run(['--preview']);
  assert.equal(preview.status, 0);
  assert.doesNotMatch(preview.stdout, /SYNC_INVOKED/);
  writeFileSync(path.join(root, 'prepare-public.mjs'), 'process.exit(3);');
  assert.equal(run([]).status, 3);
});

test('legacy Reviews URLs preserve the Discography reviews destination',()=>{
 for(const path of ['/reviews','/reviews/','/reviews.html','/reviews.html/'])for(const method of ['GET','HEAD']){const response=sitePage(request(path+'?from=old-link',method));assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://jamaaltreasures.com/music?from=old-link#testimonials')}
 assert.equal(sitePage(request('/reviews','POST')).status,405);
});
