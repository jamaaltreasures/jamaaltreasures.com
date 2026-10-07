import {env} from 'cloudflare:workers';
import {eventsPage} from '../../server/events-render.mjs';
export const dynamic='force-dynamic';
export function GET(request:Request){return eventsPage(request,env);}
