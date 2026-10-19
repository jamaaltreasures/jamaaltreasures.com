import site from './sites-worker';
import { cloudflareRequest } from '../server/cloudflare-auth.mjs';
import { policy } from '../server/journal-store.mjs';

declare const __SITE_REVISION__: string;

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const path = new URL(request.url).pathname;
    if (path === '/__deployment' && ['GET', 'HEAD'].includes(request.method)) {
      return Response.json({ commit: __SITE_REVISION__, host: 'Cloudflare Workers' }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    const response = await site.fetch(cloudflareRequest(request, env, policy.ownerEmail), env, ctx);
    if (!response.headers.get('Content-Type')?.includes('text/html')) return response;
    const result = new Response(response.body, response);
    result.headers.set('X-JT-Deployment', __SITE_REVISION__);
    const ray = request.headers.get('cf-ray');
    if (ray) result.headers.set('X-JT-Request-ID', ray);
    // Temporary, path-only evidence for the first-tap incident. No queries,
    // cookies, IPs or user agents. Expire automatically after the follow-up day.
    if (Date.now() < Date.parse('2026-10-20T23:00:00Z') && /^\/(?:events\/?|dessert-wars-orlando(?:\.html)?\/?)?$/.test(path)) {
      console.log(JSON.stringify({ event: 'page_response', path, status: result.status,
        snapshot: result.headers.get('X-JT-Snapshot-Key'), commit: __SITE_REVISION__, ray,
        colo: request.cf?.colo ?? null,
        // Cloudflare may add its final cache status after the Worker returns.
        upstreamCacheStatus: response.headers.get('cf-cache-status'),
      }));
    }
    return result;
  },
};
