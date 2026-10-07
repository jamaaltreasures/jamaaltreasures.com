import catalog from './listen-catalog.json' with { type: 'json' };

const TTL = 24 * 60 * 60 * 1000;
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const validId = id => typeof id === 'string' && Object.hasOwn(catalog, id);
export const thresholdFor = id => {
  const duration = catalog[id];
  return typeof duration === 'number' && duration > 0 ? Math.max(1, Math.min(30, Math.ceil(duration * .8))) : 30;
};

// D1 batches are atomic. The conditional INSERT and UPDATE share one transaction,
// so simultaneous retries cannot increment a play twice.
export async function handleListens(request, env, now = Date.now()) {
  if (!env.DB) return json({ error: 'Site listen counts are temporarily unavailable.' }, 503);
  try {
    if (request.method === 'GET') {
      const ids = [...new Set(new URL(request.url).searchParams.get('ids')?.split(',').filter(Boolean) || [])];
      if (!ids.length || ids.length > 100 || ids.some(id => !validId(id))) return json({ error: 'Choose between 1 and 100 available native tracks.' }, 400);
      const rows = await env.DB.prepare(`SELECT track_id, listens FROM site_listen_totals WHERE track_id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
      const counts = Object.fromEntries(ids.map(id => [id, 0]));
      for (const row of rows.results) counts[row.track_id] = Number(row.listens);
      return json({ counts, metric: 'site listens', rule: '30 seconds of active playback, or 80% of a shorter track. Replays can count; these are not unique listeners.' });
    }
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
    const origin = request.headers.get('Origin');
    const fetchSite = request.headers.get('Sec-Fetch-Site');
    if (origin !== new URL(request.url).origin || (fetchSite && fetchSite !== 'same-origin')) return json({ error: 'Use the player on this site.' }, 403);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);
    if (Number(request.headers.get('Content-Length') || 0) > 2048) return json({ error: 'Request too large.' }, 413);
    const bodyText = await request.text();
    if (bodyText.length > 2048) return json({ error: 'Request too large.' }, 413);
    let body;
    try { body = JSON.parse(bodyText); } catch { return json({ error: 'Invalid JSON.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid request.' }, 400);
    if (body.action === 'start') {
      if (!validId(body.trackId)) return json({ error: 'This is not an available native track.' }, 400);
      const eventId = crypto.randomUUID();
      const thresholdSeconds = thresholdFor(body.trackId);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM site_listen_events WHERE id IN (SELECT id FROM site_listen_events WHERE expires_at < ? LIMIT 100)').bind(now),
        env.DB.prepare('INSERT INTO site_listen_events (id,track_id,started_at,expires_at,threshold_seconds,counted_at) VALUES (?,?,?,?,?,NULL)').bind(eventId, body.trackId, now, now + TTL, thresholdSeconds),
      ]);
      return json({ eventId, trackId: body.trackId, thresholdSeconds, expiresAt: now + TTL }, 201);
    }
    if (body.action !== 'complete' || typeof body.eventId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.eventId) || !validId(body.trackId)) return json({ error: 'Invalid play event.' }, 400);
    const event = await env.DB.prepare('SELECT track_id,started_at,expires_at,threshold_seconds,counted_at FROM site_listen_events WHERE id = ?').bind(body.eventId).first();
    if (!event || event.track_id !== body.trackId || event.expires_at < now) return json({ error: 'This play event has expired.' }, 410);
    const activeSeconds = Number(body.activeSeconds);
    if (!Number.isFinite(activeSeconds) || activeSeconds < event.threshold_seconds || now - event.started_at < event.threshold_seconds * 1000 || activeSeconds > (now - event.started_at) / 1000 + 2) return json({ error: 'This play has not reached the listening threshold.' }, 422);
    const [insertResult] = await env.DB.batch([
      env.DB.prepare('INSERT INTO site_listen_totals (track_id,listens,updated_at) SELECT track_id,1,? FROM site_listen_events WHERE id=? AND track_id=? AND counted_at IS NULL AND expires_at>=? ON CONFLICT(track_id) DO UPDATE SET listens=site_listen_totals.listens+1,updated_at=excluded.updated_at').bind(now, body.eventId, body.trackId, now),
      env.DB.prepare('UPDATE site_listen_events SET counted_at=? WHERE id=? AND track_id=? AND counted_at IS NULL AND expires_at>=?').bind(now, body.eventId, body.trackId, now),
    ]);
    const total = await env.DB.prepare('SELECT listens FROM site_listen_totals WHERE track_id=?').bind(body.trackId).first();
    return json({ trackId: body.trackId, count: Number(total?.listens || 0), counted: Boolean(insertResult.meta?.changes), metric: 'site listens' });
  } catch (error) {
    // No request payload, play token or personal information is logged here.
    console.error('Site listen storage request failed:', error?.name || 'Error');
    return json({ error: 'Site listen counts are temporarily unavailable.' }, 503);
  }
}
