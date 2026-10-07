import { timingSafeEqual } from 'node:crypto';

// Sites normally authenticates these headers at its edge. A directly hosted
// Worker must discard visitor supplied identities before handling any request.
export function cloudflareRequest(request, env, ownerEmail) {
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('oai-')) headers.delete(name);
  }
  const expected = env.JOURNAL_PUBLISH_TOKEN;
  const authorization = headers.get('authorization') || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const publishingPath = /^\/mcp\/?$/.test(new URL(request.url).pathname);
  if (publishingPath && typeof expected === 'string' && expected.length >= 32) {
    const a = Buffer.from(supplied), b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      headers.set('oai-authenticated-user-id', 'cloudflare-owner');
      headers.set('oai-authenticated-user-email', ownerEmail);
    }
  }
  headers.delete('authorization');
  return new Request(request, { headers });
}
