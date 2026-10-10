import feed from './oracle-events.json' with {type:'json'};
import records from './event-records.json' with {type:'json'};
import {eventStartDate,schemaTag} from './search-schema.mjs';
const origin='https://jamaaltreasures.com';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=event=>event.slug||event.title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+event.endDate.slice(0,4);
const key=event=>event.imageKey||event.image||event.detailsUrl;
const stored=new Map(records.map(event=>[key(event),event]));
export const eventRecords=records.map(record=>{
 const current=feed.find(event=>key(event)===key(record));
 if(!current)return record;
 const verifiedDetails=current.date===record.date&&current.venue===record.venue?record.verifiedDetails:{};
 return {...record,...current,slug:record.slug,verifiedDetails};
}).concat(feed.filter(event=>!stored.has(key(event))).map(event=>({...event,slug:slug(event),verifiedDetails:{}})));
export const eventPath=event=>'/events/'+(stored.get(key(event))?.slug||slug(event));
function startDate(event){
 if(event.verifiedDetails?.startDate)return event.verifiedDetails.startDate;
 const day=eventStartDate(event),time=String(event.date).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
 if(!day||!time||/\b(DOORS|BOARDS)\b/i.test(event.date))return day;
 const hour=Number(time[1])%12+(time[3].toUpperCase()==='PM'?12:0);
 const offset=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(new Date(day+'T12:00:00Z')).find(part=>part.type==='timeZoneName').value.replace('GMT','');
 return `${day}T${String(hour).padStart(2,'0')}:${time[2]||'00'}:00${offset.startsWith('-')?'-':'+'}${offset.slice(1).padStart(2,'0')}:00`;
}
function status(event){
 const value=String(event.eventStatus||event.status||'').replace('https://schema.org/','');
 return ({cancelled:'EventCancelled',canceled:'EventCancelled',rescheduled:'EventRescheduled',postponed:'EventPostponed',scheduled:'EventScheduled'})[value.toLowerCase()]||(['EventCancelled','EventRescheduled','EventPostponed','EventScheduled'].includes(value)?value:null);
}
export function detailSchema(event){
 const verified=event.verifiedDetails||{},start=startDate(event),state=status(event);
 const schema={'@context':'https://schema.org','@type':'Event','@id':origin+eventPath(event)+'#event',name:event.title,startDate:start,
  description:`${event.title}. ${verified.timeLabel||event.date}. ${verified.venueName||event.venue}.`,
  url:origin+eventPath(event),image:new URL(event.image,origin).href,
  location:{'@type':'Place',name:verified.venueName||event.venue,...(verified.address?{address:verified.address}:{})},
  offers:{'@type':'Offer',url:verified.ticketUrl||event.detailsUrl},sameAs:[...new Set([event.detailsUrl,event.flyerUrl,...(verified.sources||[])])]
 };
 if(verified.endDate)schema.endDate=verified.endDate;
 else if(event.endDate!==start?.slice(0,10))schema.endDate=event.endDate;
 if(state)schema.eventStatus='https://schema.org/'+state;
 if(event.previousStartDate)schema.previousStartDate=event.previousStartDate;
 return schema;
}
export function eventDetailPage(request){
 const path=new URL(request.url).pathname.replace(/\/+$/,'');
 if(!path.startsWith('/events/')||path.startsWith('/events/flyer/'))return null;
 const event=eventRecords.find(event=>eventPath(event)===path);
 if(!event)return new Response('Event not found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const v=event.verifiedDetails||{},schema=detailSchema(event),address=v.address,complete=!!address,state=status(event);
 const statusCopy=state?({'EventCancelled':'This event is cancelled.','EventRescheduled':'This event has been rescheduled.','EventPostponed':'This event is postponed.','EventScheduled':'Scheduled event.'})[state]:'';
 const description=`${event.title}. ${v.timeLabel||event.date}. ${v.venueName||event.venue}. View the full flyer and source links.`;
 const sources=[...new Set([event.detailsUrl,event.flyerUrl,...(v.sources||[])])];
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(event.title)} | Jamaal Treasures Events</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${origin+path}"><meta property="og:title" content="${esc(event.title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${origin+path}"><meta property="og:image" content="${esc(schema.image)}"><link rel="icon" href="/assets/jamaal-key.svg">${schemaTag(schema)}<style>*{box-sizing:border-box}body{margin:0;background:#FAF7F2 url(/assets/marble.svg) center top/1100px repeat;color:#111114;font:17px/1.6 system-ui,sans-serif}header,main,footer{max-width:760px;margin:auto;padding:24px}header{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-bottom:1px solid rgba(17,17,20,.12)}a{color:#111114}h1{font-size:clamp(30px,6vw,48px);line-height:1.15}h2{font-size:23px}.flyer{width:100%;height:auto;display:block;border-radius:18px}.details{padding:24px;background:#ffffff;border:1px solid rgba(17,17,20,.12);border-radius:18px;margin:24px 0}.actions{display:flex;flex-wrap:wrap;gap:12px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:12px 20px;border-radius:12px;background:#A7192F;color:#fff;font-weight:750;text-decoration:none}.note{color:#6E6A63}li{margin:12px 0;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #A7192F;outline-offset:5px}footer{border-top:1px solid rgba(17,17,20,.12)}</style></head><body><header><a href="/">Jamaal Treasures</a><a href="/events">All Florida events</a></header><main><p class="note">Florida events</p><h1>${esc(event.title)}</h1>${statusCopy?`<p role="status"><strong>${statusCopy}</strong></p>`:''}<section class="details"><h2>Date and time</h2><p>${esc(v.timeLabel||event.date)}</p>${schema.startDate?.includes('T')?'':'<p class="note">The exact event start time is not confirmed in this listing. Check the source before making plans.</p>'}<h2>Venue</h2><p>${esc(v.venueName||event.venue)}</p>${address?`<address>${esc(address.streetAddress)}<br>${esc(address.addressLocality)}, ${esc(address.addressRegion)} ${esc(address.postalCode)}</address>`:'<p class="note">The street address is not yet verified. Check the event source for the entrance and arrival details.</p>'}<h2>Headliners and featured guests</h2><p>${esc(event.headliners||'Check the event source for the announced lineup.')}</p><p class="note">Lineups and event details can change. Confirm with the event source before attending.</p><div class="actions">${state==='EventCancelled'||state==='EventPostponed'?'':`<a class="button" href="${esc(v.ticketUrl||event.detailsUrl)}" rel="noopener noreferrer">Tickets and event updates</a>`}<a class="button" href="${esc(event.flyerUrl)}" rel="noopener noreferrer">View flyer source</a></div><p class="note">Ticket prices and availability are shown by the ticket provider.</p></section><h2>Full event flyer</h2><a href="${esc(event.image)}"><img class="flyer" src="${esc(event.image)}" alt="${esc(event.alt||event.title+' event flyer')}" decoding="async"></a><h2>Sources</h2><ul>${sources.map((source,index)=>`<li><a href="${esc(source)}" rel="noopener noreferrer">${index===0?'Event listing':index===1?'Flyer source':'Verified event details'}, ${esc(new URL(source).hostname)}</a></li>`).join('')}</ul>${complete?`<p class="note">Schedule and venue address checked October 8, 2026.</p>`:''}<p><a href="/event-coverage">Book event coverage with Jamaal</a></p></main><footer><a href="/events">Explore more Florida events</a></footer></body></html>`;
 return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60'}});
}
