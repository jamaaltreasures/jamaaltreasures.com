import {articles,summaries,policy,publish} from './journal-store.mjs';
import offers from '../offers.json' with {type:'json'};
const string={type:'string'};
const tools=[
 {name:'journal_status',description:'Read the public Jamaal Treasures Journal status and newest article links. This is a harmless connection check.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'journal_editorial_brief',description:'Read the saved five-post daily editorial requirements, current services and recent topics before preparing new posts. Owner access required.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'journal_publish_article',description:'Publish one original, source-checked service-related article to Jamaal Treasures. Owner access required. Checks freshness, source links, current paid service, word count, duplicates and five-per-day limit. Retry the same slug safely. Returns persisted readback and live URL.',inputSchema:{type:'object',properties:{article:{type:'object',properties:{slug:string,title:string,excerpt:string,seoDescription:string,category:{type:'string',enum:['ai-filmmaking','music-videos','artist-releases','events','brand-growth']},serviceId:string,image:{type:'object',properties:{src:string,alt:string,subject:string,kind:{type:'string',enum:['logo','photo','cover']},sourceUrl:string,credit:string},required:['src','alt','subject','kind','sourceUrl','credit']},sections:{type:'array',items:{type:'object',properties:{heading:string,paragraphs:{type:'array',items:string},bullets:{type:'array',items:string}},required:['heading','paragraphs']}},sources:{type:'array',items:{type:'object',properties:{title:string,url:string},required:['title','url']}},editorial:{type:'object',properties:{sourcePublishedAt:string,primarySourceUrl:string,paidServiceFit:string,readerNeed:string,freshnessEvidence:string,trendEvidence:string,trendSourceUrl:string},required:['sourcePublishedAt','primarySourceUrl','paidServiceFit','readerNeed','freshnessEvidence']}},required:['slug','title','excerpt','seoDescription','category','serviceId','image','sections','sources','editorial']}},required:['article'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false}}
];
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function mcp(request,env){
 let body;try{if(Number(request.headers.get('content-length'))>100000)return json({error:'Request too large'},413);const raw=await request.text();if(raw.length>100000)return json({error:'Request too large'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400)}
 const {id,method,params={}}=body||{},result=r=>json({jsonrpc:'2.0',id,result:r}),error=(code,message)=>json({jsonrpc:'2.0',id,error:{code,message}});
 if(body?.jsonrpc!=='2.0')return error(-32600,'Invalid JSON-RPC request');
 if(method==='notifications/initialized')return new Response(null,{status:202});
 if(method==='initialize')return result({protocolVersion:['2025-11-25','2025-06-18','2025-03-26','2024-11-05'].includes(params.protocolVersion)?params.protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'Jamaal Treasures Journal',version:'1.0.0'}});
 if(method==='ping')return result({});
 if(method==='tools/list')return result({tools});
 if(method!=='tools/call')return error(-32601,'Unknown method');
 if(!tools.some(t=>t.name===params.name))return error(-32602,'Unknown tool');
 const owner=request.headers.get('oai-authenticated-user-id')&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===policy.ownerEmail;
 if(params.name!=='journal_status'&&!owner)return json({jsonrpc:'2.0',id,error:{code:-32001,message:'Connect this Site with its owner ChatGPT account before editing the Journal.'}},403);
 try{
  let data;if(params.name==='journal_publish_article')data=await publish(env.BUCKET,params.arguments?.article||{});
  else{const recent=summaries(await articles(env.BUCKET)).slice(0,40);data=params.name==='journal_status'?{site:'https://jamaaltreasures.com/blog',articles:recent.length,latest:recent.slice(0,5).map(a=>({title:a.title,url:'https://jamaaltreasures.com/blog/'+a.slug})),publishingAuthorized:!!owner}:{requirements:policy.requirements,targetPostsPerDay:5,timezone:policy.timezone,services:offers.services,recentArticles:recent,workflow:'Research fresh sources, apply every gate, publish qualifying articles with distinct slugs, then read their returned live URLs. Skip weak stories and report why. No source deployment is needed.'};}
  return result({content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data,isError:false});
 }catch(e){return result({content:[{type:'text',text:e.message||'Journal operation failed'}],isError:true});}
}
