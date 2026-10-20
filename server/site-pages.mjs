import packed from './site-pages-packed.mjs';
import {gunzipSync} from 'node:zlib';
import {Buffer} from 'node:buffer';
import {businessSchema,schemaTag} from './search-schema.mjs';
import {llmsText} from './llms.mjs';
import {servicePage} from './service-pages.mjs';
import {eventDetailPage} from './event-details.mjs';
import {sitePageFiles} from './site-page-files.mjs';
const pages=JSON.parse(gunzipSync(Buffer.from(packed,'base64')).toString('utf8'));
const knownPages=new Set(sitePageFiles);
// Keep HTML out of the asset-first CDN so every document passes host canonicalization.
export function createSitePageHandler(snapshot) {
 return function sitePage(request) {
 const event=eventDetailPage(request);if(event)return event;
 const service=servicePage(request);if(service)return service;
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 if(path==='/llms.txt'){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  return new Response(request.method==='HEAD'?null:llmsText(),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
 }
 const key=path==='/'?'index.html':path.slice(1).replace(/\.html$/,'')+'.html';
 if(key==='reviews.html'){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const destination=new URL('/music',request.url);destination.search=new URL(request.url).search;destination.hash='testimonials';
  return new Response(null,{status:308,headers:{Location:destination.href,'Cache-Control':'public, max-age=300'}});
 }
 if(!knownPages.has(key))return null;
 // A broken release must never let a real page fall through to an asset or
 // framework homepage. The build integrity check normally prevents this.
 if(!Object.hasOwn(snapshot,key))return new Response(request.method==='HEAD'?null:'Page temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 let document=key==='index.html'?snapshot[key].replace('</head>',schemaTag(businessSchema)+'</head>'):snapshot[key];
 document=document.replace(/(<article class="offer-card[\s\S]*?id="offer-(ai-music-reels|event-coverage)"[\s\S]*?)(<\/article>)/g,(_,card,id,end)=>`${card}<a class="offer-detail" href="/${id}">See service details</a>${end}`);
 return new Response(request.method==='HEAD'?null:document,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff','X-JT-Snapshot-Key':key}});
 };
}
export const sitePage=createSitePageHandler(pages);
