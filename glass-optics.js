/* Aligned background sampling with a rounded lens and separate RGB rays.
   Owned image/canvas sources only. Arbitrary DOM and cross-origin video retain the live frost fallback. */
(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(prefers-contrast: more)'),motion=matchMedia('(prefers-reduced-motion: reduce)');
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
   if(d>-bezel){nx=distance(px+.2,py,w,h,radius)-distance(px-.2,py,w,h,radius);ny=distance(px,py+.2,w,h,radius)-distance(px,py-.2,w,h,radius);const length=Math.hypot(nx,ny)||1;nx/=length;ny/=length;bend=Math.sin(Math.min(1,-d/bezel)*Math.PI)*10.5;}
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
  if(document.hidden||reduced.matches||contrast.matches||r.width<2||r.height<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth){entry.canvas.hidden=true;entry.element.classList.remove('has-optics');return;}
  const source=entry.provider(r);if(!source){entry.canvas.hidden=true;entry.element.classList.remove('has-optics');return;}
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
   const fade=edgeOnly?Math.max(0,Math.min(1,(22-depth)/14)):1;pixels.data[i+3]=255*Math.min(1,depth)*fade*fade*(3-2*fade);
  }
  ctx.putImageData(pixels,0,0);entry.canvas.hidden=false;entry.element.classList.add('has-optics');
  if(!edgeOnly&&entry.element.matches('.nav-quote,.hero-actions .button')){let sum=0,count=0;for(let y=Math.round(map.height*.37);y<map.height*.65;y+=3)for(let x=Math.round(map.width*.1);x<map.width*.7;x+=3){const i=(y*map.width+x)*4;sum+=pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722;count++;}const threshold=entry.element.dataset.ink==='dark'?130:155;const dark=sum/count>threshold;entry.element.dataset.ink=dark?'dark':'light';entry.element.style.setProperty('--glass-label-color',dark?'#170b23':'#fff');}
  stats.renders++;stats.elementRenders ||= {};const name=entry.element.id||entry.element.className.split(' ').slice(0,2).join('.');stats.elementRenders[name]=(stats.elementRenders[name]||0)+1;stats.lastMs=performance.now()-start;stats.maxMs=Math.max(stats.maxMs,stats.lastMs);
 }
 function renderAll(){queued=false;if(document.hidden)return;const t=performance.now();entries.forEach(render);stats.batchMs=performance.now()-t;stats.maxBatchMs=Math.max(stats.maxBatchMs||0,stats.batchMs);}
 function schedule(){if(!queued){queued=true;requestAnimationFrame(renderAll);}}
 function attach(element,provider){
  const canvas=document.createElement('canvas');canvas.className='glass-optics';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;element.prepend(canvas);
  const entry={element,provider,canvas,pressed:false,signature:null};entries.push(entry);
  element.addEventListener('pointerdown',()=>{entry.pressed=true;render(entry);});
  for(const event of ['pointerup','pointercancel','pointerleave'])element.addEventListener(event,()=>{entry.pressed=false;schedule();});
  new ResizeObserver(schedule).observe(element);schedule();return entry;
 }
 function heroSource(rect){
  const hero=document.querySelector('.hero'),img=document.querySelector('.hero-background');if(!hero||!img?.complete||!img.naturalWidth)return null;
  const box=hero.getBoundingClientRect();if(box.height<2)return atmosphereSource();if(rect.left<box.left||rect.right>box.right||rect.top<box.top||rect.bottom>box.bottom)return reviewSource(rect);
  const imageBox=img.getBoundingClientRect(),w=Math.round(imageBox.width),h=Math.round(imageBox.height),position=getComputedStyle(img).objectPosition.split(' ').map(x=>parseFloat(x)/100),key=[w,h,position,img.currentSrc].join(':');
  if(!sceneCache||sceneCache.key!==key){
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true}),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
   ctx.drawImage(img,(w-iw)*position[0],(h-ih)*(position[1]||.5),iw,ih);
   const color=a=>`rgba(8,7,13,${a})`;
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
  if(!reviewCache||reviewCache.key!==key){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d',{willReadFrequently:true});c.fillStyle='#08070d';c.fillRect(0,0,w,h);c.fillStyle=getComputedStyle(figure).backgroundColor;c.beginPath();c.roundRect(f.x,f.y-top,f.width,f.height,parseFloat(getComputedStyle(figure).borderRadius));c.fill();c.save();c.beginPath();c.roundRect(b.x,b.y-top,b.width,b.height,parseFloat(getComputedStyle(image.parentElement).borderRadius));c.clip();c.drawImage(image,b.x,b.y-top,b.width,b.height);c.restore();reviewCache={key,width:w,height:h,data:c.getImageData(0,0,w,h).data,version:key};}
  return {...reviewCache,left:0,top};
 }
 function atmosphereSource(){
  const img=document.querySelector('.atmosphere-image');if(!img?.complete||!img.naturalWidth)return null;
  const w=innerWidth,h=innerHeight,key=[w,h,img.currentSrc].join(':');if(!atmosphereCache||atmosphereCache.key!==key){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true}),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;ctx.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(8,7,13,.68235)');g.addColorStop(1,'rgba(8,7,13,.83137)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);atmosphereCache={key,width:w,height:h,data:ctx.getImageData(0,0,w,h).data,version:key};}return{...atmosphereCache,left:0,top:0};
 }
 function cinemaSource(){
  const img=document.querySelector('.hero-background');if(!document.querySelector('#film-dialog')?.open||!img?.complete||!img.naturalWidth)return null;
  const w=innerWidth,h=innerHeight,key=[w,h,img.currentSrc].join(':');if(!cinemaCache||cinemaCache.key!==key){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true}),scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;ctx.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(8,7,13,.4196)');g.addColorStop(1,'rgba(8,7,13,.8196)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);cinemaCache={key,width:w,height:h,data:ctx.getImageData(0,0,w,h).data,version:key};}return{...cinemaCache,left:0,top:0};
 }
 window.JTGlassOptics={attach,renderAll,schedule,stats,field,setIntensity(value){intensity=Math.max(.5,Math.min(1.8,Number(value)||1));schedule();}};
 document.querySelectorAll('.glass').forEach(element=>attach(element,element.closest('#film-dialog')?cinemaSource:element.dataset.opticsSource==='atmosphere'?atmosphereSource:heroSource));
 const cinema=document.querySelector('#film-dialog');if(cinema)new MutationObserver(schedule).observe(cinema,{attributes:true,attributeFilter:['open']});
 document.querySelector('.hero-background')?.addEventListener('load',schedule);document.querySelector('.atmosphere-image')?.addEventListener('load',schedule);
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',()=>{sceneCache=null;schedule();},{passive:true});
 for(const pref of [reduced,contrast,motion])pref.addEventListener('change',schedule);
 document.fonts?.ready.then(schedule);
})();
/* Slow shared scene drift. Controls remain fixed; source and lens share the exact offset. */
(()=>{const hero=document.querySelector('.hero');if(!hero)return;const pref=matchMedia('(prefers-reduced-motion: reduce)');let visible=true,phase=0;new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(hero);function draw(){const x=Math.sin(phase)*22,y=Math.cos(phase*.7)*10;hero.style.setProperty('--nebula-x',x.toFixed(2)+'px');hero.style.setProperty('--nebula-y',y.toFixed(2)+'px');JTGlassOptics.schedule()}window.JTNebula={setPhase(value){phase=value;draw()},pause:false};pref.addEventListener('change',()=>{if(pref.matches){phase=0;hero.style.setProperty('--nebula-x','0px');hero.style.setProperty('--nebula-y','0px');JTGlassOptics.schedule()}});setInterval(()=>{if(visible&&!document.hidden&&!pref.matches&&!window.JTNebula.pause&&!document.querySelector('dialog[open]')){phase+=.0195;draw()}},150)})();
