import { env } from 'cloudflare:workers';
import { serveMusic } from '../../../../server/music-api.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return serveMusic(request, env); }
export function HEAD(request: Request) { return serveMusic(request, env); }
