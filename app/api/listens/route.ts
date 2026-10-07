import { env } from 'cloudflare:workers';
import { handleListens } from '../../../server/listens.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleListens(request, env); }
export function POST(request: Request) { return handleListens(request, env); }
