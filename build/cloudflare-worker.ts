import site from './sites-worker';
import { cloudflareRequest } from '../server/cloudflare-auth.mjs';
import { policy } from '../server/journal-store.mjs';

declare const __SITE_REVISION__: string;

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const path = new URL(request.url).pathname;
    if (path === '/__deployment' && ['GET', 'HEAD'].includes(request.method)) {
      return Response.json({ commit: __SITE_REVISION__, host: 'Cloudflare Workers' }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    return site.fetch(cloudflareRequest(request, env, policy.ownerEmail), env, ctx);
  },
};
