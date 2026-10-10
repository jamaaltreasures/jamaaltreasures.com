/* Gating fix for the liquid glass displacement path. A script set class is
   the only safe switch: the root element gains the lg-refract class only
   where navigator.userAgentData exists, which is Chromium browsers. A
   supports query cannot be trusted for this gate, because Safari answers
   it as if the url form were supported and then paints nothing, so a query
   gate would strip the frost from the very browsers that need it. Every
   other engine keeps the default frosted system with its baked frames. */
(()=>{try{if(navigator.userAgentData)document.documentElement.classList.add('lg-refract');}catch(err){}})();

/* Aligned background sampling with a rounded lens and separate RGB rays.
   Owned image/canvas sources only. Arbitrary DOM and cross-origin video retain the live frost fallback. */
(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(prefers-contrast: more)'),motion=matchMedia('(prefers-reduced-motion: reduce)');const coarsePointer=matchMedia('(pointer: coarse)').matches;
 const entries=[],fields=new Map();let queued=false,sceneCache,reviewCache,cinemaCache,atmosphereCache,intensity=1;
 const stats={renders:0,lastMs:0,maxMs:0,mode:'aligned RGB image sampling'};
 function distance(x,y,w,h,r){const qx=Math.abs(x-w/2)-(w/2-r),qy=Math.abs(y-h/2)-(h/2-r);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;}
 function field(w,h,ratio,radius,edgeOnly=false){
  const key=[w,h,ratio,radius,edgeOnly].join(':');if(fields.has(key))return fields.get(key);
  const width=Math.round(w*ratio),height=Math.round(h*ratio),points=[],bezel=Math.min(14,h*.27),rim=22;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   if(edgeOnly&&y>rim*ratio&&y<height-rim*ratio&&x>rim*ratio&&x<width-rim*ratio){x=width-Math.ceil(rim*ratio)-1;continue;}
   const px=(x+.5)/ratio,py=(y+.5)/ratio,d=distance(px,py,w,h,radius);if(d>=0||(edgeOnly&&d<=-rim))continue;
   let nx=0,ny=0,bend=0;
   if(d>-bezel){nx=distance(px+.2,py,w,h,radius)-distance(px-.2,py,w,h,radius);ny=distance(px,py+.2,w,h,radius)-distance(px,py-.2,w,h,radius);const length=Math.hypot(nx,ny)||1;nx/=length;ny/=length;const inset=Math.min(1,-d/bezel),theta=Math.acos(inset),refracted=Math.asin(Math.sin(theta)/1.5);bend=18*Math.tan(theta-refracted)/Math.sqrt(1.25);}
   points.push(x,y,-nx*bend-(px-w/2)*.009,-ny*bend-(py-h/2)*.009,-d);
  }
  const value={width,height,points:new Float32Array(points)};fields.set(key,value);if(fields.size>16)fields.delete(fields.keys().next().value);return value;
 }
 function channel(source,x,y,c){
  x=Math.max(0,Math.min(source.width-1.001,x));y=Math.max(0,Math.min(source.height-1.001,y));
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=(iy*source.width+ix)*4+c,j=i+source.width*4,d=source.data;
  return (d[i]*(1-fx)+d[i+4]*fx)*(1-fy)+(d[j]*(1-fx)+d[j+4]*fx)*fy;
 }
 function render(entry){
  const start=performance.now(),r=entry.element.getBoundingClientRect();
  if(!entry.element.isConnected||document.hidden||reduced.matches||contrast.matches||r.width<2||r.height<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth){entry.canvas.hidden=true;entry.element.classList.remove('has-optics');return;}
  let source;try{source=entry.provider(r);}catch{source=null;}if(!source){entry.canvas.hidden=true;entry.element.classList.remove('has-optics');return;}
  const ratio=Math.min(devicePixelRatio||1,1),w=Math.round(r.width),h=Math.round(r.height),radius=Math.min(parseFloat(getComputedStyle(entry.element).borderRadius)||h/2,w/2,h/2),edgeOnly=entry.element.hasAttribute('data-optics-edge')||w*h>28000,map=field(w,h,ratio,radius,edgeOnly);
  const q=n=>Math.round(n*2)/2;const signature=[source.version,q(source.left),q(source.top),q(r.left),q(r.top),q(r.width),q(r.height),entry.pressed,ratio,intensity].join(':');
  if(signature===entry.signature&&!entry.canvas.hidden)return;entry.signature=signature;
  if(entry.canvas.width!==map.width||entry.canvas.height!==map.height){entry.canvas.width=map.width;entry.canvas.height=map.height;}
  const ctx=entry.canvas.getContext('2d'),pixels=ctx.createImageData(map.width,map.height),originX=r.left-source.left,originY=r.top-source.top,strength=intensity*(entry.pressed&&!motion.matches?1.15:1);
  for(let n=0;n<map.points.length;n+=5){
   const x=map.points[n],y=map.points[n+1],i=(y*map.width+x)*4,depth=map.points[n+4];
   const px=originX+(x+.5)/ratio,py=originY+(y+.5)/ratio,dx=map.points[n+2]*strength,dy=map.points[n+3]*strength;
   pixels.data[i]=channel(source,px+dx*.86,py+dy*.86,0);
   pixels.data[i+1]=channel(source,px+dx,py+dy,1);
   pixels.data[i+2]=channel(source,px+dx*1.14,py+dy*1.14,2);
   // Keep the lens edge clear while giving labels a dense, neutral reading surface.
   if(!edgeOnly){const center=Math.max(0,Math.min(1,(depth-3)/11)),veil=.64*center*center*(3-2*center);for(let c=0;c<3;c++)pixels.data[i+c]=pixels.data[i+c]*(1-veil)+[244,240,232][c]*veil;}
   const fade=edgeOnly?Math.max(0,Math.min(1,(22-depth)/14)):1;pixels.data[i+3]=255*Math.min(1,depth)*fade*fade*(3-2*fade);
  }
  ctx.putImageData(pixels,0,0);entry.canvas.hidden=false;entry.element.classList.add('has-optics');
  if(!edgeOnly&&entry.element.matches('.nav-quote,.hero-actions .button')){let sum=0,count=0;for(let y=Math.round(map.height*.37);y<map.height*.65;y+=3)for(let x=Math.round(map.width*.1);x<map.width*.7;x+=3){const i=(y*map.width+x)*4;sum+=pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722;count++;}const threshold=entry.element.dataset.ink==='dark'?130:155;const dark=sum/count>threshold;entry.element.dataset.ink=dark?'dark':'light';entry.element.style.setProperty('--glass-label-color',dark?'#111114':'#fff');}  stats.renders++;stats.elementRenders ||= {};const name=entry.element.id||entry.element.className.split(' ').slice(0,2).join('.');stats.elementRenders[name]=(stats.elementRenders[name]||0)+1;stats.lastMs=performance.now()-start;stats.maxMs=Math.max(stats.maxMs,stats.lastMs);
 }
 function renderAll(){queued=false;if(document.hidden)return;const t=performance.now();for(let i=entries.length-1;i>=0;i--){const entry=entries[i];if(!entry.element.isConnected){entry.resize.disconnect();entries.splice(i,1);}else render(entry);}stats.batchMs=performance.now()-t;stats.maxBatchMs=Math.max(stats.maxBatchMs||0,stats.batchMs);}
 function schedule(){if(!queued){queued=true;requestAnimationFrame(renderAll);}}
 function attach(element,provider){
  if(entries.some(entry=>entry.element===element))return;
  const canvas=document.createElement('canvas');canvas.className='glass-optics';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;element.prepend(canvas);
  const entry={element,provider,canvas,pressed:false,signature:null,resize:new ResizeObserver(schedule)};entries.push(entry);
  element.addEventListener('pointerdown',()=>{entry.pressed=true;render(entry);});
  for(const event of ['pointerup','pointercancel','pointerleave'])element.addEventListener(event,()=>{entry.pressed=false;schedule();});
  entry.resize.observe(element);schedule();return entry;
 }
 // Match the CSS scene treatment without relying on CanvasRenderingContext2D.filter.
 function neutralScene(ctx,w,h){const image=ctx.getImageData(0,0,w,h),data=image.data;for(let i=0;i<data.length;i+=4){const gray=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255,value=255*1.52*(.32*(1-gray-.5)+.5);data[i]=data[i+1]=data[i+2]=value;}ctx.putImageData(image,0,0);}
 function heroSource(rect){
  const hero=document.querySelector('.hero'),img=document.querySelector('.hero-background');if(!hero)return atmosphereSource();if(!img?.complete||!img.naturalWidth)return null;
  const box=hero.getBoundingClientRect();if(box.height<2)return atmosphereSource();if(rect.left<box.left||rect.right>box.right||rect.top<box.top||rect.bottom>box.bottom)return reviewSource(rect)||atmosphereSource();
  const imageBox=img.getBoundingClientRect(),w=Math.round(imageBox.width),h=Math.round(imageBox.height),position=getComputedStyle(img).objectPosition.split(' ').map(x=>parseFloat(x)/100),key=[w,h,position,img.currentSrc].join(':');
  if(!sceneCache||sceneCache.key!==key){
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true}),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
   ctx.drawImage(img,(w-iw)*position[0],(h-ih)*(position[1]||.5),iw,ih);neutralScene(ctx,w,h);
   const color=a=>`rgba(244,240,232,${a})`;
   if(innerWidth<=700){let g=ctx.createLinearGradient(0,0,w*.95,0);g.addColorStop(0,color(.4));g.addColorStop(1,color(0));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);g=ctx.createLinearGradient(0,h,0,0);g.addColorStop(0,color(1));g.addColorStop(.42,color(.25));g.addColorStop(.9,color(.05));g.addColorStop(1,color(.05));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
   else {let g=ctx.createLinearGradient(0,h,0,h*.64);g.addColorStop(0,color(1));g.addColorStop(1,color(0));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,color(.741));g.addColorStop(.56,color(.22));g.addColorStop(1,color(.051));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
   sceneCache={key,width:w,height:h,data:ctx.getImageData(0,0,w,h).data,version:key};
  }
  return {...sceneCache,left:imageBox.left,top:imageBox.top};
 }
 function reviewSource(rect){
  // A source-owned review image is safe to sample. Text and third-party players keep live frost.
  const image=[...document.querySelectorAll('.review-image img')].find(i=>{const b=i.getBoundingClientRect();return i.complete&&i.naturalWidth&&rect.top>=b.top&&rect.bottom<=b.bottom;});if(!image)return null;
  const b=image.getBoundingClientRect(),figure=image.closest('figure'),f=figure.getBoundingClientRect(),top=rect.top-16,w=innerWidth,h=Math.ceil(rect.height+32),key=[image.currentSrc,b.x,b.y,b.width,b.height,f.x,f.y,f.width,f.height,top,w,h].join(':');
  if(!reviewCache||reviewCache.key!==key){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d',{willReadFrequently:true});c.fillStyle='#FAF7F2';c.fillRect(0,0,w,h);c.fillStyle=getComputedStyle(figure).backgroundColor;c.beginPath();c.roundRect(f.x,f.y-top,f.width,f.height,parseFloat(getComputedStyle(figure).borderRadius));c.fill();c.save();c.beginPath();c.roundRect(b.x,b.y-top,b.width,b.height,parseFloat(getComputedStyle(image.parentElement).borderRadius));c.clip();c.drawImage(image,b.x,b.y-top,b.width,b.height);c.restore();reviewCache={key,width:w,height:h,data:c.getImageData(0,0,w,h).data,version:key};}  return {...reviewCache,left:0,top};
 }
 function atmosphereSource(){
  const img=document.querySelector('.atmosphere-image');if(!img?.complete||!img.naturalWidth)return null;
  const w=innerWidth,h=innerHeight,key=[w,h,img.currentSrc].join(':');if(!atmosphereCache||atmosphereCache.key!==key){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true}),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;ctx.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);neutralScene(ctx,w,h);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(244,240,232,.68235)');g.addColorStop(1,'rgba(244,240,232,.83137)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);atmosphereCache={key,width:w,height:h,data:ctx.getImageData(0,0,w,h).data,version:key};}return{...atmosphereCache,left:0,top:0};
 }
 function cinemaSource(){
  const img=document.querySelector('.hero-background');if(!document.querySelector('#film-dialog')?.open||!img?.complete||!img.naturalWidth)return null;
  const w=innerWidth,h=innerHeight,key=[w,h,img.currentSrc].join(':');if(!cinemaCache||cinemaCache.key!==key){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true}),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;ctx.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);neutralScene(ctx,w,h);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(244,240,232,.4196)');g.addColorStop(1,'rgba(244,240,232,.8196)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);cinemaCache={key,width:w,height:h,data:ctx.getImageData(0,0,w,h).data,version:key};}return{...cinemaCache,left:0,top:0};
 }
 window.JTGlassOptics={attach,renderAll,schedule,stats,field,setIntensity(value){intensity=Math.max(.5,Math.min(1.8,Number(value)||1));schedule();}};
 function attachNew(root=document){const elements=[...(root.matches?.('.glass')?[root]:[]),...root.querySelectorAll('.glass')];elements.forEach(element=>attach(element,element.closest('#film-dialog')?cinemaSource:element.dataset.opticsSource==='atmosphere'?atmosphereSource:heroSource));}
 if(!coarsePointer){attachNew();new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.tagName!=='CANVAS')attachNew(node);}).observe(document.body,{childList:true,subtree:true});}
 const cinema=document.querySelector('#film-dialog');if(cinema)new MutationObserver(schedule).observe(cinema,{attributes:true,attributeFilter:['open']});
 document.querySelector('.hero-background')?.addEventListener('load',schedule);document.querySelector('.atmosphere-image')?.addEventListener('load',schedule);
 if(!coarsePointer)window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',()=>{sceneCache=null;atmosphereCache=null;cinemaCache=null;schedule();},{passive:true});
 for(const pref of [reduced,contrast,motion])pref.addEventListener('change',schedule);
 document.fonts?.ready.then(schedule);
})();
/* Slow shared scene drift. Controls remain fixed; source and lens share the exact offset. */
(()=>{const hero=document.querySelector('.hero');if(!hero)return;const pref=matchMedia('(prefers-reduced-motion: reduce)');let visible=true,phase=0;new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(hero);function draw(){const x=Math.sin(phase)*22,y=Math.cos(phase*.7)*10;hero.style.setProperty('--drift-x',x.toFixed(2)+'px');hero.style.setProperty('--drift-y',y.toFixed(2)+'px');JTGlassOptics.schedule()}window.JTSceneDrift={setPhase(value){phase=value;draw()},pause:false};pref.addEventListener('change',()=>{if(pref.matches){phase=0;hero.style.setProperty('--drift-x','0px');hero.style.setProperty('--drift-y','0px');JTGlassOptics.schedule()}});if(!matchMedia('(pointer: coarse)').matches)setInterval(()=>{if(visible&&!document.hidden&&!pref.matches&&!window.JTSceneDrift.pause&&!document.querySelector('dialog[open]')){phase+=.0195;draw()}},150)})();

/* Phase 3 living light: one passive scroll listener drives a single CSS
   variable, --sheen-pos, so the specular sheen on frosted and baked glass
   drifts as the page moves. Static under prefers-reduced-motion. */
(()=>{const root=document.documentElement;const pref=matchMedia('(prefers-reduced-motion: reduce)');let ticking=false;function update(){ticking=false;const max=Math.max(1,root.scrollHeight-innerHeight);const p=Math.min(1,Math.max(0,scrollY/max));root.style.setProperty('--sheen-pos',(8+p*84).toFixed(1)+'%');}function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(update);}}if(pref.matches||matchMedia('(pointer: coarse)').matches){root.style.setProperty('--sheen-pos','30%');}else{update();addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});}})();

/* Hero key living image gate (2026-10-10): the key video carries a real
   alpha channel, but only an engine that decodes WebM alpha honestly may
   show it. A decoded frame is drawn to a tiny canvas and its corner pixels
   are sampled: transparent corners reveal the video over the PNG still,
   while an opaque corner (the H.264 fallback, an engine without WebM
   alpha, a stalled load) leaves the still in place, so the black studio
   background the video was keyed from can never paint as a rectangle on
   the cream hero. Reduced motion keeps the still and pauses the video,
   and playback pauses while the hero is off screen. */
(()=>{const wrap=document.querySelector('.hero-key');const video=wrap&&wrap.querySelector('.hero-key-video');if(!wrap||!video)return;const reduce=matchMedia('(prefers-reduced-motion: reduce)');let proven=false;
function prove(){if(proven||video.readyState<2)return;try{const c=document.createElement('canvas');c.width=8;c.height=8;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(video,0,0,8,8);const d=x.getImageData(0,0,8,8).data;if(d[3]<10&&d[31]<10&&d[227]<10&&d[255]<10){proven=true;if(reduce.matches){video.pause();}else{wrap.classList.add('live');const p=video.play();if(p&&p.catch)p.catch(()=>{});}}}catch(err){}}
video.addEventListener('loadeddata',prove);video.addEventListener('canplay',prove);
if(reduce.matches)video.pause();
if(reduce.addEventListener)reduce.addEventListener('change',()=>{if(reduce.matches){video.pause();wrap.classList.remove('live');}});
new IntersectionObserver(entries=>{if(!proven||reduce.matches)return;if(entries[0].isIntersecting){const p=video.play();if(p&&p.catch)p.catch(()=>{});}else{video.pause();}}).observe(wrap);
})();
