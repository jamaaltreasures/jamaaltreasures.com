import {env} from 'cloudflare:workers';
import {sitemap} from '../../server/journal-render.mjs';
export const dynamic='force-dynamic';
export function GET(){return sitemap(env);}
