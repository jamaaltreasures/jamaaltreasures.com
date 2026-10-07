import { env } from 'cloudflare:workers';
import { serveMusicCover } from '../../../../server/music-cover-api.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return serveMusicCover(request, env); }
export function HEAD(request: Request) { return serveMusicCover(request, env); }
