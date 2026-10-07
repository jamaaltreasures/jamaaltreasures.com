import {env} from 'cloudflare:workers';
import {journalArticle} from '../../../server/journal-render.mjs';
export const dynamic='force-dynamic';
export function GET(request:Request){return journalArticle(request,env);}
