import {env} from 'cloudflare:workers';
import {journalIndex} from '../../server/journal-render.mjs';
export const dynamic='force-dynamic';
export function GET(request:Request){return journalIndex(request,env);}
