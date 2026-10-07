import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareRequest } from '../server/cloudflare-auth.mjs';
import { mcp } from '../server/journal-mcp.mjs';

const token = 'test-only-token-'.repeat(4);
const owner = 'inzxain@icloud.com';
function request(headers = {}) {
  return new Request('https://preview.example/mcp', { method: 'POST', headers,
    body: JSON.stringify({jsonrpc:'2.0', id:1, method:'tools/call', params:{name:'journal_editorial_brief'}}) });
}
test('forged Sites identity cannot access the owner publishing tools', async () => {
  const r = cloudflareRequest(request({ 'oai-authenticated-user-id':'forged', 'oai-authenticated-user-email':owner }), {}, owner);
  assert.equal((await mcp(r, {})).status, 403);
});
test('invalid and unconfigured bearer tokens remain unauthorized', async () => {
  for (const env of [{}, {JOURNAL_PUBLISH_TOKEN:token}]) {
    const r = cloudflareRequest(request({authorization:'Bearer invalid'}), env, owner);
    assert.equal((await mcp(r, {})).status, 403);
  }
});
test('configured token preserves the existing owner only publishing interface', async () => {
  const r = cloudflareRequest(request({authorization:'Bearer '+token}), {JOURNAL_PUBLISH_TOKEN:token}, owner);
  assert.equal(r.headers.get('authorization'), null);
  const response = await mcp(r, {BUCKET:{get:async()=>null}});
  assert.equal(response.status,200);
  assert.equal((await response.json()).result.isError,false);
});
test('tokens never add owner identity to public page requests', () => {
  const r=cloudflareRequest(new Request('https://preview.example/events',{headers:{authorization:'Bearer '+token}}),{JOURNAL_PUBLISH_TOKEN:token},owner);
  assert.equal(r.headers.get('oai-authenticated-user-id'),null);
});
