import {glassDefs} from './glass-defs.mjs';
import {schemaTag} from './search-schema.mjs';
import {eventPath,eventRecords,detailSchema} from './event-details.mjs';
// Cloudflare Workers Builds deploys pushes to main.
import events from './oracle-events.json' with {type:'json'};

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=['FEATURED EVENT','THIS WEEK','NEXT WEEK','LATER IN OCTOBER','HALLOWEEN','NOVEMBER','MAJOR ANNUALS'];
const categories=['All','Music','Nightlife','Festivals','Latin','Hip-Hop','Arts','Business','Halloween','R&B','EDM','Wellness','Community','Culture'];
function topicsFor(event){
 const haystack=((event.title||'')+' '+(event.headliners||'')+' '+(event.section||'')).toLowerCase();
 const topics=new Set(event.categories||[]);
 const has=re=>re.test(haystack);
 if(has(/festival|carnival|cruise|parade|basel|\bfair\b|fête|\bfest\b|wyn\b/))topics.add('Festivals');
 if(has(/karol|arc[aá]ngel|anuel|myers|miko|kreyol|cafecito|reggaeton|\blatin\b|tropi|millo/))topics.add('Latin');
 if(has(/fetty|offset|\blogic\b|g eazy|juicy|suicideboy|rod wave|yung miami|cash money|no limit|master p|birdman|juvenile|mannie|raptober|hip.hop|\brap\b|\blil\b/))topics.add('Hip-Hop');
 if(has(/r&b|usher|chris brown|tiller|teddy swims|trapsoul/))topics.add('R&B');
 if(has(/\bedc\b|ultra|iii points|alchemy/))topics.add('EDM');
 if((event.section||'')==='HALLOWEEN'||has(/halloween|hallowyn|thriller|alien|nightmare|\bmask\b|majik|costume/))topics.add('Halloween');
 return [...topics];
}
function areaFor(event){
 const text=((event.venue||'')+' '+(event.title||'')).toLowerCase();
 if(/jacksonville/.test(text))return 'Jacksonville';
 if(/fort lauderdale|lauderhill|tamarac/.test(text))return 'Fort Lauderdale';
 if(/tampa|ybor/.test(text))return 'Tampa';
 if(/orlando|sanford/.test(text))return 'Orlando';
 if(/st\.? petersburg/.test(text))return 'St. Petersburg';
 if(/sarasota/.test(text))return 'Sarasota';
 if(/miami/.test(text))return 'Miami';
 return 'More Florida';
}
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const activeEvents=events.map(event=>eventRecords.find(record=>record.title===event.title&&record.date===event.date&&record.venue===event.venue)||event).filter(event=>event.endDate>=today);
function card(event,index){
 const tags=event.categories.map(category=>`<span class="tag">${esc(category)}</span>`).join('');
 const headliners=event.headliners?`<p class="headliners"><b>Headliners:</b> ${esc(event.headliners)}</p>`:'';
 const featured=index===0?'<span class="flag">FEATURED</span>':'';
 return `<article class="card" data-categories="${esc(event.categories.join('|'))}" data-topics="${esc(topicsFor(event).join('|'))}" data-area="${esc(areaFor(event))}" data-search="${esc(((event.title||'')+' '+(event.headliners||'')+' '+(event.venue||'')).toLowerCase())}">${featured}<img class="flyer" src="${esc(event.image)}" alt="${esc(event.alt)}" ${index?'loading="lazy"':''} decoding="async"><div class="cbody"><div class="cdateline">${esc(event.verifiedDetails?.timeLabel||event.date)}</div><h3><a href="${eventPath(event)}">${esc(event.title)}</a></h3>${headliners}<p class="venue">${esc(event.venue)}</p><div class="tags">${tags}</div><p><a class="mini flyerbtn" href="${eventPath(event)}">Event details</a></p><div class="actions"><a class="mini tix" href="${esc(event.detailsUrl)}" target="_blank" rel="noopener noreferrer">${esc(event.detailsLabel)}</a><a class="mini flyerbtn" href="${esc(event.flyerUrl)}" target="_blank" rel="noopener noreferrer">Flyer</a></div></div></article>`;
}
export async function eventsPage(){
 const featured=activeEvents.filter(event=>event.section===sections[0]);
 const groups=sections.slice(1).map(section=>{
  const cards=activeEvents.filter(event=>event.section===section);
  return cards.length?`<h2 class="sec"><span class="dot"></span>${section}</h2><div class="grid">${cards.map(event=>card(event,1)).join('')}</div>`:'';
 }).join('');
 const chipSet=hidden=>`<div class="cartrack"${hidden?' aria-hidden="true"':''}>${categories.map((category,index)=>`<button class="chip${index===0?' on':''}" type="button" data-filter="${category}" aria-pressed="${index===0}"${hidden?' tabindex="-1"':''}>${category}</button>`).join('')}</div>`;
 const areaCounts={};
 activeEvents.forEach(event=>{const area=areaFor(event);areaCounts[area]=(areaCounts[area]||0)+1;});
 const areaNames=['Tampa','Orlando','Miami','Fort Lauderdale','St. Petersburg','Sarasota','Jacksonville','More Florida'].filter(area=>areaCounts[area]);
 const areaRow=`<div class="arearow" id="arearow" role="region" aria-label="Filter events by area"><span class="arealabel">AREA</span>${['All Areas',...areaNames].map((area,index)=>`<button class="achip${index===0?' on':''}" type="button" data-areafilter="${esc(area)}" aria-pressed="${index===0}">${esc(area)} (${area==='All Areas'?activeEvents.length:areaCounts[area]})</button>`).join('')}</div>`;
 const body=`<header class="site-header"><div class="bar"><a class="brand jt-brand-dark" href="/"><img class="jt-brand-logo" src="/assets/jamaal-logo-animated.svg" width="184" height="61" alt="Jamaal Treasures"></a><nav class="nav" aria-label="Main navigation"><a href="/">Home</a><a href="/events" class="active">Events</a><a href="/contact">Book</a></nav></div></header>
 <main class="wrap"><section class="hero"><div class="kicker">FLORIDA EVENT GUIDE</div><h1>Find your next <span class="grad">night out</span></h1><p class="sub">Concerts, festivals, mixers and cultural moments across Florida. Hand picked, always current.</p><div class="searchwrap"><input id="eventsearch" type="search" placeholder="Search events, artists, venues..." aria-label="Search events" autocomplete="off"><p class="searchhint">Organizer? Type your event name to find your flyer instantly.</p></div><div class="carousel" role="region" aria-label="Browse event topics"><div class="carviewport" id="carviewport">${chipSet(false)}${chipSet(true)}</div><div class="carfade left"></div><div class="carfade right"></div></div>${areaRow}</section>
 <h2 class="sec"><span class="dot"></span>FEATURED EVENT</h2><div class="grid featured-grid">${featured.map((event,index)=>card(event,index)).join('')}</div>${groups}
 <div id="noresults" hidden><p>No events match your search. Try a different event name, artist, or venue.</p></div><section class="promo"><div class="kicker">FOR EVENT ORGANIZERS</div><h2>Get your event featured</h2><p>Premium placement at the top of our Florida event guide, plus cinematic coverage of your event.</p><p class="price">$450 <small>event coverage</small></p><ul class="includes"><li>Featured listing with your flyer, ticket link and branding</li><li>Up to 2 hours of event filming in Florida</li><li>One edited 60 to 90 second highlight video</li><li>3 vertical social clips for your channels</li><li>2 revision rounds</li></ul><a class="btn primary" href="https://square.link/u/KxMuUqlH">Buy Event Package, $450</a><p><a href="/event-coverage">See coverage details</a></p><a class="btn ghost" href="/contact?project=event-coverage">Ask about availability</a></section>
 <section class="invite"><div class="kicker">PRESS AND CREATORS</div><h2>Invite us to cover your event</h2><p>Running something worth filming? Send the official event link and the story angle. We consider every invitation for media access and editorial coverage.</p><a class="btn ghost" href="/contact?project=media-invite">Send an invitation</a></section>
 <footer><p><strong>Jamaal Treasures</strong>, Tampa, Florida<br><a href="https://instagram.com/jamaaltreasures" target="_blank" rel="noopener noreferrer">@jamaaltreasures</a>, <a href="tel:+19412949274">941 294 9274</a></p><p>Listings are curated. Confirm details with the official event source before attending.</p></footer></main>
 <script>
try{if(navigator.userAgentData)document.documentElement.classList.add('lg-refract');}catch(err){}
const searchInput=document.getElementById('eventsearch');
const viewport=document.getElementById('carviewport');
let activeCat='All';
let activeArea='All Areas';
function applyFilters(){
 const q=searchInput.value.trim().toLowerCase();
 let visible=0;
 document.querySelectorAll('.card').forEach(card=>{
  const topics=(card.dataset.topics||card.dataset.categories||'').split('|');
  const catOk=activeCat==='All'||topics.includes(activeCat);
  const areaOk=activeArea==='All Areas'||(card.dataset.area||'')===activeArea;
  const qOk=!q||(card.dataset.search||'').includes(q);
  const show=catOk&&areaOk&&qOk;
  card.hidden=!show;
  if(show)visible++;
 });
 document.querySelectorAll('.sec').forEach(heading=>{
  const grid=heading.nextElementSibling;
  if(grid&&grid.classList.contains('grid'))heading.hidden=grid.querySelectorAll('.card:not([hidden])').length===0;
 });
 document.getElementById('noresults').hidden=visible!==0;
}
function setActiveFilter(category){
 activeCat=category;
 document.querySelectorAll('[data-filter]').forEach(item=>{const active=item.dataset.filter===category;item.classList.toggle('on',active);item.setAttribute('aria-pressed',String(active))});
 applyFilters();
}
viewport.addEventListener('click',event=>{
 const button=event.target.closest('[data-filter]');
 if(button)setActiveFilter(button.dataset.filter);
});
function setActiveArea(area){
 activeArea=area;
 document.querySelectorAll('[data-areafilter]').forEach(item=>{const active=item.dataset.areafilter===area;item.classList.toggle('on',active);item.setAttribute('aria-pressed',String(active))});
 applyFilters();
}
document.getElementById('arearow').addEventListener('click',event=>{
 const button=event.target.closest('[data-areafilter]');
 if(button)setActiveArea(button.dataset.areafilter);
});
searchInput.addEventListener('input',applyFilters);
const initParams=new URLSearchParams(location.search);
const initQ=initParams.get('q');
if(initQ){searchInput.value=initQ;}
const initArea=initParams.get('area');
if(initArea){
 const areaMatch=[...document.querySelectorAll('[data-areafilter]')].find(item=>item.dataset.areafilter.toLowerCase()===initArea.trim().toLowerCase());
 if(areaMatch&&areaMatch.dataset.areafilter!=='All Areas')setActiveArea(areaMatch.dataset.areafilter);
}
applyFilters();
(function(){
 const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduceMotion||!viewport)return;
 const tracks=viewport.querySelectorAll('.cartrack');
 if(tracks.length<2)return;
 const speed=26;
 let last=performance.now(),paused=false,resumeTimer=null;
 function half(){return tracks[0].offsetWidth;}
 function step(now){
  const dt=Math.min((now-last)/1000,0.1);
  last=now;
  if(!paused&&!document.hidden){
   viewport.scrollLeft+=speed*dt;
   const h=half();
   if(h>0&&viewport.scrollLeft>=h)viewport.scrollLeft-=h;
  }
  requestAnimationFrame(step);
 }
 function pause(){paused=true;if(resumeTimer)clearTimeout(resumeTimer);}
 function scheduleResume(){if(resumeTimer)clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{paused=false;},3500);}
 ['pointerdown','touchstart','wheel','focusin'].forEach(name=>viewport.addEventListener(name,pause,{passive:true}));
 ['pointerup','touchend','focusout'].forEach(name=>viewport.addEventListener(name,scheduleResume,{passive:true}));
 document.addEventListener('visibilitychange',()=>{last=performance.now();});
 requestAnimationFrame(step);
})();
</script>
 <style>
 :root{color-scheme:light;--black:#FAF7F2;--panel:#ffffff;--panel2:#F1EDE6;--red:#A7192F;--silver:#111114;--muted:#6E6A63;--line:rgba(17,17,20,.09);--radius:18px}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:var(--black);color:var(--silver);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5}a{color:inherit;text-decoration:none}.site-header{position:sticky;top:0;z-index:50;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;border-bottom:1px solid transparent}.bar{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;max-width:640px;margin:0 auto}.brand{font-weight:800;letter-spacing:.06em;font-size:15px}.brand span{color:var(--red)}.nav{display:flex;gap:18px;font-size:14px;color:var(--silver);font-weight:600}.nav a.active{color:var(--silver);font-weight:800}.wrap{max-width:640px;margin:0 auto;padding:0 16px 80px}.hero{padding:34px 0 10px}.kicker{font-size:12px;letter-spacing:.18em;color:var(--red);font-weight:700;margin-bottom:8px}.hero h1{font-size:32px;line-height:1.15;margin:0 0 10px;font-weight:800}.grad{color:var(--red)}.sub{color:var(--muted);font-size:15px;margin:0 0 18px}.carousel{position:relative;margin:10px -16px 0}
.carviewport{display:flex;overflow-x:auto;padding:6px 16px 22px;scrollbar-width:none;-webkit-overflow-scrolling:touch;cursor:grab}
.carviewport::-webkit-scrollbar{display:none}
.carviewport:active{cursor:grabbing}
.cartrack{display:flex;gap:12px;flex:0 0 auto;padding-right:12px}
.carfade{position:absolute;top:0;bottom:0;width:44px;pointer-events:none;z-index:2}
.carfade.left{left:0;background:linear-gradient(90deg,var(--black),transparent)}
.carfade.right{right:0;background:linear-gradient(-90deg,var(--black),transparent)}
.chip{flex:0 0 auto;white-space:nowrap;appearance:none;-webkit-appearance:none;min-height:58px;padding:14px 22px;border-radius:999px;font-size:16px;font-weight:700;line-height:1.2;color:var(--silver);border:1px solid var(--line);background:rgba(255,255,255,.62);backdrop-filter:blur(14px) saturate(1.1);-webkit-backdrop-filter:blur(14px) saturate(1.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 8px 30px rgba(17,17,20,.08);cursor:pointer;touch-action:pan-x pan-y;transition:background .18s,transform .18s,border-color .18s}
.chip.on{border-color:#A7192F;background:#A7192F;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 8px 30px rgba(17,17,20,.16)}
.chip:active{transform:scale(.96)}
.chip:focus-visible{outline:3px solid var(--red);outline-offset:4px}
@media(prefers-reduced-motion:reduce){.chip{transition:none}}.sec{font-size:13px;letter-spacing:.16em;color:var(--muted);font-weight:700;margin:26px 0 12px;display:flex;align-items:center;gap:8px}.dot{width:7px;height:7px;border-radius:50%;background:var(--red)}.grid{display:grid;grid-template-columns:1fr;gap:14px}.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;position:relative;box-shadow:0 8px 30px rgba(17,17,20,.06);content-visibility:auto;contain-intrinsic-size:auto 520px}.card[hidden]{display:none}.flyer{width:100%;height:auto;display:block;background:#EDEAE3;object-fit:unset}.cbody{padding:14px 14px 16px}.cdateline{font-size:12px;font-weight:800;letter-spacing:.12em;color:var(--red);margin-bottom:4px}.card h3{margin:0 0 2px;font-size:18px;font-weight:800}.headliners{font-size:13.5px;color:var(--silver);margin:0 0 2px}.headliners b{color:var(--red);font-weight:700}.venue{color:var(--muted);font-size:13.5px;margin:0 0 10px}.tag{display:inline-block;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;background:rgba(167,25,47,.08);color:var(--red);margin:0 6px 10px 0}.actions{display:flex;gap:8px}.mini{flex:1;min-height:48px;border-radius:12px;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:10px;text-align:center}.mini.tix{background:var(--red);color:#fff}.mini.flyerbtn{background:var(--panel2);border:1px solid var(--line)}.flag{position:absolute;top:14px;left:14px;z-index:2;display:inline-block;font-size:11px;font-weight:800;letter-spacing:.14em;background:var(--red);color:#fff;padding:6px 12px;border-radius:999px}.promo{margin-top:30px;border-radius:var(--radius);padding:24px 20px;text-align:center;background:var(--panel2);border:1px solid var(--line)}.promo h2{margin:0 0 8px;font-size:23px;font-weight:800}.promo p{color:var(--muted);font-size:14.5px;margin:0 0 16px}.price{font-size:40px;font-weight:800;margin:0 0 4px;color:var(--silver)!important}.price small{font-size:15px;color:var(--muted);font-weight:600}.includes{text-align:left;font-size:14px;color:var(--silver);margin:14px 0 18px;padding:0;list-style:none}.includes li{padding:7px 0 7px 28px;position:relative;border-bottom:1px solid var(--line)}.includes li:before{content:"";position:absolute;left:4px;top:11px;width:13px;height:13px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23A7192F' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.5 12.8l4.8 4.8L19.5 6.8'/%3E%3C/svg%3E") center/contain no-repeat}.btn{display:block;min-height:52px;border-radius:14px;font-weight:800;font-size:16px;text-align:center;padding:14px}.btn.primary{background:var(--red);color:#fff;box-shadow:0 8px 30px rgba(167,25,47,.28)}.btn.ghost{background:var(--panel2);border:1px solid var(--line)}.invite{margin-top:16px;border-radius:var(--radius);padding:22px 20px;background:var(--panel);border:1px solid var(--line)}.invite h2{margin:0 0 8px;font-size:20px}.invite p{color:var(--muted);font-size:14.5px;margin:0 0 16px}footer{margin-top:34px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;text-align:center}footer strong{color:var(--silver)}footer a{color:var(--silver);font-weight:700}
 
/* Liquid glass chips ride inside the floating topic carousel above. */

.searchwrap{margin:2px 0 4px}
#eventsearch{width:100%;min-height:58px;border-radius:14px;border:1px solid var(--line);background:#fff;color:var(--silver);font-size:17px;font-weight:600;padding:14px 18px;outline:none;-webkit-appearance:none;appearance:none}
#eventsearch::placeholder{color:var(--muted);font-weight:500}
#eventsearch:focus{border-color:var(--red);box-shadow:0 0 0 3px rgba(167,25,47,.18)}
.searchhint{font-size:13px;color:var(--muted);margin:8px 2px 0}
#noresults{padding:30px 20px;text-align:center;color:var(--muted);font-size:15px}
#noresults[hidden]{display:none}
.arearow{display:flex;flex-wrap:nowrap;gap:8px;align-items:center;margin:16px 0 2px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;padding:4px 2px}.arearow::-webkit-scrollbar{display:none}
.arealabel{font-size:12px;font-weight:800;letter-spacing:.16em;color:var(--muted);margin-right:2px;flex:0 0 auto}
.achip{flex:0 0 auto;white-space:nowrap;appearance:none;-webkit-appearance:none;min-height:44px;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:700;line-height:1.2;color:var(--silver);border:1px solid var(--line);background:rgba(255,255,255,.62);backdrop-filter:blur(14px) saturate(1.1);-webkit-backdrop-filter:blur(14px) saturate(1.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 8px 30px rgba(17,17,20,.08);cursor:pointer;transition:background .18s,transform .18s,border-color .18s}
.achip.on{border-color:#A7192F;background:#A7192F;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 8px 30px rgba(17,17,20,.16)}
.achip:active{transform:scale(.96)}
.achip:focus-visible{outline:3px solid var(--red);outline-offset:4px}
@media(prefers-reduced-motion:reduce){.achip{transition:none}}

/* Desktop presentation preserves the original, uncropped event flyers. */
@media(min-width:760px){
 .bar{max-width:1280px;padding:18px 32px;min-height:108px}
 .wrap{max-width:1280px;padding:0 32px 80px}
 .hero{padding:44px 0 18px}.hero h1{font-size:48px}
 .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}
 .featured-grid{grid-template-columns:1fr}
 .featured-grid .card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}
 .featured-grid .cbody{padding:32px}.featured-grid h3{font-size:30px}
 .featured-grid .headliners,.featured-grid .venue{font-size:16px}
 .nav{gap:28px;font-size:16px}
}
@media(min-width:1100px){.grid:not(.featured-grid){grid-template-columns:repeat(3,minmax(0,1fr))}}
/* Phase 3 glass chips on the Phase 1 base (Jamaal exception: no marble
   on this page, the white threw it off). Stronger gray definition, frosted
   base, live displacement in Chromium. Non displacement engines stay on
   the frost with the gray border system: the baked frames are marble
   baked, so they are deliberately not used here. The header above is
   fully transparent so the page base shows straight through; nav rides
   in sharp ink. */
.chip,.achip{border-color:rgba(17,17,20,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -1px 2px rgba(17,17,20,.08),0 2px 8px rgba(60,58,52,.10)}
.chip:active,.achip:active{background:#A7192F!important;color:#fff!important}.chip.on,.achip.on{border-color:#A7192F;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 2px 8px rgba(17,17,20,.16)}
@media(prefers-reduced-motion:no-preference) and (prefers-reduced-transparency:no-preference){
html.lg-refract .chip:not(.on),html.lg-refract .achip:not(.on){backdrop-filter:url(#lg-chip)}
}
@media(prefers-reduced-transparency:reduce){.chip,.achip{background:#fff;backdrop-filter:none;-webkit-backdrop-filter:none}}
</style>`;
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#FAF7F2"><title>Events | Jamaal Treasures</title><meta name="description" content="Find your next night out. Concerts, festivals, mixers and cultural events across Florida, curated by Jamaal Treasures."><link rel="canonical" href="https://jamaaltreasures.com/events"><meta property="og:title" content="Events | Jamaal Treasures"><meta property="og:description" content="Find your next night out. Florida concerts, festivals, nightlife and cultural events."><link rel="icon" href="/assets/jamaal-key.svg">${schemaTag(activeEvents.map(detailSchema).filter(Boolean))}<link rel="stylesheet" href="/brand.css?v=20261009key"></head><body>${glassDefs}${body}</body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60'}});

}

