import {env} from 'cloudflare:workers';
import eventFlyers from '../../../../server/oracle-events.json' with {type:'json'};

export const dynamic='force-dynamic';
const permitted=new Set(eventFlyers.map(event=>event.imageKey));
const mimeTypes:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};

export async function GET(_request:Request,{params}:{params:Promise<{filename:string}>}){
  const {filename}=await params;
  const key=`event-flyers/${filename}`;
  if(!permitted.has(key))return new Response('Not found',{status:404});
  const object=await env.BUCKET?.get(key);
  if(!object)return new Response('Not found',{status:404});
  const extension=filename.split('.').pop()?.toLowerCase()||'';
  return new Response(object.body,{headers:{'Content-Type':mimeTypes[extension]||'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable','ETag':object.httpEtag}});
}
