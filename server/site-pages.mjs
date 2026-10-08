import packed from './site-pages-packed.mjs';
import {gunzipSync} from 'node:zlib';
import {Buffer} from 'node:buffer';
import {businessSchema,schemaTag} from './search-schema.mjs';
import {llmsText} from './llms.mjs';
const pages=JSON.parse(gunzipSync(Buffer.from(packed,'base64')).toString('utf8'));
// Keep HTML out of the asset-first CDN so every document passes host canonicalization.
export function sitePage(request) {
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 if(path==='/llms.txt'){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  return new Response(request.method==='HEAD'?null:llmsText(),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
 }
 const key=path==='/'?'index.html':path.slice(1).replace(/\.html$/,'')+'.html';
 if(!Object.hasOwn(pages,key))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const document=key==='index.html'?pages[key].replace('</head>',schemaTag(businessSchema)+'</head>'):pages[key];
 return new Response(request.method==='HEAD'?null:document,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff'}});
}
