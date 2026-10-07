import {env} from 'cloudflare:workers';
import {mcp} from '../../server/journal-mcp.mjs';
export const dynamic='force-dynamic';
export function POST(request:Request){return mcp(request,env);}
export function GET(){return new Response('Use POST for MCP.',{status:405,headers:{Allow:'POST'}});}
