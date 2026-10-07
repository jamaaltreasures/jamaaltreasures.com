const baseHeaders = { 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff' };
export function mediaFailure(message, status, extra = {}) {
  return new Response(message, { status, headers: { ...baseHeaders, 'Cache-Control': 'no-store', ...extra } });
}

// R2 remains the source of the audio and covers. Media is not copied into the
// public deployment bundle. The manifest limits reads to deliberately published files.
export async function serveListedMedia(request, env, manifest, prefix, contentType) {
  if (!['GET', 'HEAD'].includes(request.method)) return mediaFailure('Method not allowed', 405, { Allow: 'GET, HEAD' });
  const name = new URL(request.url).pathname.split('/').pop();
  if (!Object.hasOwn(manifest, name)) return mediaFailure('Media not found', 404);
  const entry = manifest[name], key = prefix + name;
  if (!env.BUCKET) return mediaFailure('Media temporarily unavailable', 503);
  const info = await env.BUCKET.head(key);
  if (!info || info.size !== entry.bytes || (info.customMetadata?.sha256 && info.customMetadata.sha256 !== entry.sha256)) return mediaFailure('Media temporarily unavailable', 503);
  const headers = new Headers({ ...baseHeaders, 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable', ETag: info.httpEtag, 'X-Media-SHA256': entry.sha256 });
  if (contentType === 'audio/mp4') headers.set('X-Audio-SHA256', entry.sha256);
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && (ifNoneMatch === '*' || ifNoneMatch.split(',').some(tag => tag.trim().replace(/^W\//, '') === info.httpEtag))) return new Response(null, { status: 304, headers });
  let offset = 0, length = info.size, status = 200;
  const range = request.headers.get('range');
  if (range && (!request.headers.has('if-range') || request.headers.get('if-range') === info.httpEtag)) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return unsatisfiable(headers, info.size);
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) return unsatisfiable(headers, info.size);
      length = Math.min(suffix, info.size); offset = info.size - length;
    } else {
      offset = Number(match[1]);
      const requestedEnd = match[2] ? Number(match[2]) : info.size - 1;
      if (!Number.isSafeInteger(requestedEnd)) return unsatisfiable(headers, info.size);
      length = Math.min(requestedEnd, info.size - 1) - offset + 1;
    }
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= info.size || length <= 0) return unsatisfiable(headers, info.size);
    status = 206; headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${info.size}`);
  }
  headers.set('Content-Length', String(length));
  if (request.method === 'HEAD') return new Response(null, { status, headers });
  const object = await env.BUCKET.get(key, status === 206 ? { range: { offset, length } } : {});
  if (!object) return mediaFailure('Media temporarily unavailable', 503);
  return new Response(object.body, { status, headers });
}

function unsatisfiable(headers, size) {
  headers.set('Content-Range', 'bytes */' + size);
  return new Response(null, { status: 416, headers });
}
