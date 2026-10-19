import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { sitePageFiles } from '../server/site-page-files.mjs';

export function unpack(source) {
  const encoded = JSON.parse(source.replace(/^export default /, '').replace(/;\s*$/, ''));
  return JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
}

export function assertSnapshots(pages, json, shells, previous, previousShells) {
  assert.deepEqual(Object.keys(pages).sort(), Object.keys(shells).sort(), 'Snapshot page list differs from registered shells');
  assert.deepEqual(pages, json, 'Packed and JSON snapshots differ');
  for (const [file, shell] of Object.entries(shells)) {
    assert.equal(pages[file], shell, `Snapshot differs from shell: ${file}`);
    if (previous && shell === previousShells[file]) {
      assert.equal(pages[file], previous[file], `Unchanged shell would overwrite previous snapshot: ${file}`);
    }
  }
}

export function verifySnapshots(baseRef) {
  const pages = unpack(readFileSync('server/site-pages-packed.mjs', 'utf8'));
  const json = JSON.parse(readFileSync('server/site-pages.json', 'utf8'));
  const shells = Object.fromEntries(sitePageFiles.map(file => [file, readFileSync(file, 'utf8')]));
  let previous, previousShells;
  if (baseRef) {
    // A caller must fetch/pull before selecting this ref. Never fetch or merge
    // implicitly while generating a prepared snapshot.
    const show = file => execFileSync('git', ['show', `${baseRef}:${file}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    previous = unpack(show('server/site-pages-packed.mjs'));
    previousShells = Object.fromEntries(Object.keys(previous).map(file => [file, show(file)]));
    for (const file of Object.keys(previous)) {
      assert.ok(Object.hasOwn(shells, file), `Previously published page removed: ${file}`);
    }
  }
  assertSnapshots(pages, json, shells, previous, previousShells);
  assert.equal(readFileSync('app/site-html.ts', 'utf8'), 'export default ' + JSON.stringify(shells['index.html']) + ';\n', 'Framework homepage differs from shell');
  console.log(`Snapshot integrity: ${sitePageFiles.length} pages match their shells${baseRef ? `; unchanged pages match ${baseRef} byte for byte` : ''}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.argv.find(arg => arg.startsWith('--base='))?.slice('--base='.length);
  verifySnapshots(base);
}
