'use strict';
const $ = selector => document.querySelector(selector);
document.querySelectorAll('[data-project]').forEach(link => {
  link.addEventListener('click', () => { $('#project-type').value = link.dataset.project; });
});
// Native POST retains browser validation and the provider's spam protection.
// Only the provider reports acceptance; the page never invents a success state.
$('#quote-form').addEventListener('submit', () => {
  $('#form-status').textContent = 'Opening the secure form service…';
});
window.addEventListener('pageshow', () => { $('#form-status').textContent = ''; });
const realm = $('#realm-video');
const realmLaunch = $('#realm-launch');
let realmHls=null,realmReady=false,realmScript;
function realmPlaying(){return !!realm&&!realm.paused&&!realm.ended;}
function loadRealmLibrary(){return realmScript ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/vendor/hls-1.7.3.light.min.js';script.onload=resolve;script.onerror=()=>reject(new Error('The player could not load. Please try again.'));document.head.append(script)}).catch(error=>{realmScript=null;throw error});}
async function prepareRealm(){
 if(realmReady)return;
 if(realm.canPlayType('application/vnd.apple.mpegurl')){realm.src=$('#realm-quality').value==='auto'?realm.dataset.stream:`assets/realm-final/${$('#realm-quality').value}/index.m3u8`;realmReady=true;return;}
 await loadRealmLibrary();
 if(!Hls.isSupported())throw new Error('This browser cannot play the film. Please use Safari, Chrome, Edge or Firefox.');
 realmHls=new Hls({maxBufferLength:20,backBufferLength:15,capLevelToPlayerSize:false});
 realmHls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal){$('#realm-status').textContent='Playback was interrupted. Press Watch THE REALM to try again.';realmHls?.destroy();realmHls=null;realmReady=false;realmLaunch.hidden=false;}});
 realmHls.on(Hls.Events.MANIFEST_PARSED,()=>{const quality=$('#realm-quality').value;if(quality!=='auto')realmHls.currentLevel=realmHls.levels.findIndex(level=>level.height===Number(quality));});
 realmHls.loadSource(realm.dataset.stream);realmHls.attachMedia(realm);realmReady=true;
}
if(realm && realmLaunch){
 realmLaunch.addEventListener('click',async()=>{realmLaunch.hidden=true;$('#realm-status').textContent='Loading THE REALM…';try{await prepareRealm();if(realm.ended)realm.currentTime=0;realm.muted=false;await realm.play();$('#realm-status').textContent='';}catch(error){realmLaunch.hidden=false;$('#realm-status').textContent=error.message||'Press play to try again.';}});
 realm.addEventListener('playing',()=>{realmLaunch.hidden=true;$('#realm-status').textContent='';if(document.hidden)realm.pause();});
 realm.addEventListener('ended',()=>{realmLaunch.hidden=false;});
 const syncRealmQuality=()=>{if(realm.videoHeight)$('#realm-quality-state').textContent=(realm.videoHeight>=1080?'Full quality · ':'Playing at ')+realm.videoHeight+'p'+($('#realm-quality').value==='auto'?' · Auto':'')};realm.addEventListener('resize',syncRealmQuality);realm.addEventListener('loadeddata',syncRealmQuality);realm.addEventListener('playing',syncRealmQuality);
 realm.addEventListener('pause',()=>resumeCarousel());
 new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&!document.fullscreenElement&&!realm.webkitDisplayingFullscreen)realm.pause()},{threshold:0}).observe(realm);
 $('#realm-quality').addEventListener('change',()=>{const value=$('#realm-quality').value;if(!realmReady)return;if(realmHls){realmHls.currentLevel=value==='auto'?-1:realmHls.levels.findIndex(level=>level.height===Number(value));}else{const position=realm.currentTime,playing=!realm.paused;realm.preload='metadata';realm.addEventListener('loadedmetadata',()=>{realm.currentTime=Math.min(position,Number.isFinite(realm.duration)?realm.duration:position);if(playing)realm.play().catch(()=>{});else realm.pause();},{once:true});realm.src=value==='auto'?realm.dataset.stream:`assets/realm-final/${value}/index.m3u8`;realm.load();if(playing)realm.play().catch(()=>{});}});
}
const filmDialog=$('#film-dialog'),carouselRoot=$('.film-carousel');
const previewSlides=[...document.querySelectorAll('.film-slide')],previewPlayers=new Map();
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let carouselVisible=false,manuallyPaused=motionPreference.matches||!!navigator.connection?.saveData;
let previousLink,popupPlayer=null,requestedFilm=0,catalog,youtubeReady,syncScheduled=false;
// Native horizontal scrolling preserves trackpad, touch and OS scrollbar behavior.
const carousel={scrollPrev(){moveCarousel(-1)},scrollNext(){moveCarousel(1)},on(event,callback){if(event==='scroll')carouselRoot.addEventListener('scroll',callback,{passive:true});}};
function moveCarousel(direction){holdAutoMotion();const card=previewSlides[0],gap=parseFloat(getComputedStyle($('.film-track')).gap)||0;carouselRoot.scrollBy({left:direction*(card.getBoundingClientRect().width+gap),behavior:motionPreference.matches?'instant':'smooth'});}
function updateCarouselButtons(){const maximum=carouselRoot.scrollWidth-carouselRoot.clientWidth;$('#carousel-prev').disabled=carouselRoot.scrollLeft<=1;$('#carousel-next').disabled=carouselRoot.scrollLeft>=maximum-1;}
carouselRoot.addEventListener('scroll',updateCarouselButtons,{passive:true});new ResizeObserver(updateCarouselButtons).observe(carouselRoot);requestAnimationFrame(updateCarouselButtons);
carouselRoot.addEventListener('keydown',event=>{if(event.target!==carouselRoot)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveCarousel(event.key==='ArrowLeft'?-1:1)}else if(event.key==='Home'||event.key==='End'){event.preventDefault();carouselRoot.scrollTo({left:event.key==='Home'?0:carouselRoot.scrollWidth,behavior:'instant'})}});
// Move cards rightward through the native scroll viewport. Recycle only an offscreen
// card at the left boundary, preserving the same 25 items and their accessible content.
const carouselTrack=$('.film-track');
let autoHoldUntil=0,autoPointerOver=false,autoFrame=0,autoLastTime=0,autoPixels=0;
function holdAutoMotion(){autoHoldUntil=performance.now()+6000;autoPixels=0;}
function canAutoMove(){return carouselVisible&&!document.hidden&&!filmDialog.open&&!realmPlaying()&&!manuallyPaused&&!motionPreference.matches&&!autoPointerOver&&!pointerStart&&!carouselRoot.contains(document.activeElement)&&performance.now()>=autoHoldUntil;}
function autoStep(now){
 autoFrame=0;const elapsed=Math.min(50,now-(autoLastTime||now));autoLastTime=now;
 if(canAutoMove()){
  autoPixels+=18*elapsed/1000;const pixels=Math.floor(autoPixels);autoPixels-=pixels;
  if(pixels){
   if(carouselRoot.scrollLeft<pixels){
    const last=carouselTrack.lastElementChild;
    if(last&&!visibleSlide(last)&&!last.contains(document.activeElement)){
     const first=carouselTrack.firstElementChild,before=first.getBoundingClientRect().left;
     releasePlayer(last.dataset.videoId);carouselTrack.prepend(last);
     const shift=first.getBoundingClientRect().left-before;
     carouselRoot.scrollTo({left:carouselRoot.scrollLeft+shift,behavior:'instant'});
    }
   }
   carouselRoot.scrollTo({left:Math.max(0,carouselRoot.scrollLeft-pixels),behavior:'instant'});
  }
 }else autoPixels=0;
 if(carouselVisible&&!document.hidden)autoFrame=requestAnimationFrame(autoStep);else autoLastTime=0;
}
function startAutoMotion(){if(!autoFrame&&carouselVisible&&!document.hidden){autoLastTime=0;autoFrame=requestAnimationFrame(autoStep)}}
carouselRoot.addEventListener('wheel',holdAutoMotion,{passive:true});
carouselRoot.addEventListener('pointerdown',holdAutoMotion,{passive:true});
carouselRoot.addEventListener('touchmove',holdAutoMotion,{passive:true});
carouselRoot.addEventListener('keydown',holdAutoMotion);
carouselRoot.addEventListener('focusin',holdAutoMotion);
carouselRoot.addEventListener('focusout',holdAutoMotion);
carouselRoot.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')autoPointerOver=true});
carouselRoot.addEventListener('pointerleave',()=>{autoPointerOver=false;holdAutoMotion()});
function loadCatalog(){return catalog ||= fetch('videos.json').then(r=>{if(!r.ok)throw new Error('Catalog unavailable');return r.json()});}
function loadYouTube(){
 if(window.YT?.Player)return Promise.resolve();if(youtubeReady)return youtubeReady;
 youtubeReady=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Video service unavailable')),18000);window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve()};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);reject(new Error('Video service unavailable'))};document.head.append(script)});return youtubeReady;
}
window.JTYouTubeReady=loadYouTube;
function visibleSlide(slide){
 const r=slide.querySelector('.preview-media').getBoundingClientRect(),clip=carouselRoot.getBoundingClientRect();
 return Math.min(r.right,clip.right,innerWidth)>Math.max(r.left,clip.left,0)+1&&Math.min(r.bottom,clip.bottom,innerHeight)>Math.max(r.top,clip.top,0)+1;
}
function shouldPlay(slide){return visibleSlide(slide)&&!document.hidden&&!filmDialog.open&&!realmPlaying()&&!manuallyPaused&&!motionPreference.matches&&!['blocked','unavailable'].includes(slide.dataset.state);}
function pausePreviews(){previewPlayers.forEach(e=>{if(e.ready){e.player.mute();e.player.pauseVideo()}});}
function releasePlayer(id){const e=previewPlayers.get(id);if(!e)return;e.destroyed=true;try{e.player?.destroy()}catch{};if(!e.slide.querySelector('.preview-player')){const slot=document.createElement('div');slot.className='preview-player';e.slide.querySelector('.preview-media').insertBefore(slot,e.slide.querySelector('.preview-open'))}previewPlayers.delete(id);e.slide.dataset.state='paused';}
function trimPlayers(){for(const [id,e] of previewPlayers){if(previewPlayers.size<=5)break;if(!visibleSlide(e.slide)&&e.ready)releasePlayer(id);}}
async function ensurePlayer(slide){
 const id=slide.dataset.videoId;if(previewPlayers.has(id))return;
 const entry={slide,ready:false,player:null,destroyed:false};previewPlayers.set(id,entry);slide.dataset.state='loading';slide.querySelector('.preview-status').textContent='Loading muted preview';
 try{await loadYouTube();if(entry.destroyed)return;if(!shouldPlay(slide)){previewPlayers.delete(id);slide.dataset.state='paused';return;}
 entry.player=new YT.Player(slide.querySelector('.preview-player'),{host:'https://www.youtube-nocookie.com',videoId:id,width:'100%',height:'100%',playerVars:{autoplay:1,mute:1,playsinline:1,controls:0,rel:0,enablejsapi:1,origin:location.origin,loop:1,playlist:id},events:{
 onReady:event=>{if(entry.destroyed){event.target.destroy();return}entry.ready=true;event.target.mute();const frame=event.target.getIframe();frame.title=slide.getAttribute('aria-label')+' muted preview';frame.tabIndex=-1;if(shouldPlay(slide))event.target.playVideo();else event.target.pauseVideo();trimPlayers()},
 onStateChange:event=>{if(entry.destroyed)return;if(event.data===3&&!shouldPlay(slide)){event.target.pauseVideo();return}if(event.data===1){event.target.mute();if(!shouldPlay(slide)){event.target.pauseVideo();return}slide.dataset.state='playing'}else if(event.data===2||event.data===0){slide.dataset.state='paused';slide.querySelector('.preview-status').textContent='Tap to watch'}},
 onAutoplayBlocked:()=>{slide.dataset.state='blocked';slide.querySelector('.preview-status').textContent='Tap to watch'},
 onError:()=>{slide.dataset.state='unavailable';slide.querySelector('.preview-status').textContent='Open full player'}
 }});
 }catch{previewPlayers.delete(id);slide.dataset.state='blocked';slide.querySelector('.preview-status').textContent='Tap to watch'}
}
function syncPreviews(){if(syncScheduled)return;syncScheduled=true;requestAnimationFrame(()=>{syncScheduled=false;previewSlides.forEach(slide=>{const e=previewPlayers.get(slide.dataset.videoId);if(shouldPlay(slide)){if(!e)ensurePlayer(slide);else if(e.ready){e.player.mute();if(e.player.getPlayerState()!==1)e.player.playVideo()}}else if(e?.ready){e.player.mute();if([1,3].includes(e.player.getPlayerState()))e.player.pauseVideo()}});trimPlayers()});}
function resumeCarousel(){startAutoMotion();if(carouselVisible&&!document.hidden&&!filmDialog.open&&!realmPlaying()&&!manuallyPaused&&!motionPreference.matches){syncPreviews()}}
function updateMotionButton(){const b=$('#carousel-motion');b.textContent=manuallyPaused?'Resume motion and previews':'Pause motion and previews';b.setAttribute('aria-pressed',String(manuallyPaused))}
$('#carousel-motion').addEventListener('click',()=>{manuallyPaused=!manuallyPaused;updateMotionButton();if(manuallyPaused)pausePreviews();else if(motionPreference.matches){const first=previewSlides.find(visibleSlide);if(first)openFilm(first.querySelector('[data-film]'))}else resumeCarousel()});
$('#carousel-prev').addEventListener('click',()=>{carousel?.scrollPrev()});$('#carousel-next').addEventListener('click',()=>{carousel?.scrollNext()});
new IntersectionObserver(entries=>{carouselVisible=entries[0].isIntersecting;if(carouselVisible){startAutoMotion();loadCatalog().catch(()=>{});resumeCarousel()}else pausePreviews()},{threshold:0}).observe(carouselRoot);
const mediaObserver=new IntersectionObserver(syncPreviews,{threshold:[0,.01]});previewSlides.forEach(s=>mediaObserver.observe(s.querySelector('.preview-media')));
carousel?.on('scroll',syncPreviews);window.addEventListener('scroll',syncPreviews,{passive:true});window.addEventListener('resize',syncPreviews,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pausePreviews();realm?.pause();popupPlayer?.pauseVideo?.()}else resumeCarousel()});motionPreference.addEventListener('change',()=>{if(motionPreference.matches){manuallyPaused=true;pausePreviews();updateMotionButton()}});realm?.addEventListener('play',()=>{pausePreviews();document.dispatchEvent(new CustomEvent('videoaudiostart'))});updateMotionButton();
async function openFilm(link){
 document.dispatchEvent(new CustomEvent('videoaudiostart'));
 const id=link.dataset.film;if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;const request=++requestedFilm;previousLink=link;const slide=link.closest('.film-slide');
 $('#film-title').textContent=slide?.getAttribute('aria-label')||'Directed music video';$('#film-credit').textContent=slide?.querySelector('.film-info p:not(.film-artist)')?.textContent||'Direction · CimtexPro';$('#film-youtube').href='https://www.youtube.com/watch?v='+id;$('#film-playback-status').textContent='For the sharpest picture, open the player settings and choose the highest available Quality. YouTube adjusts Auto to your connection and screen.';
 pausePreviews();realm?.pause();filmDialog.style.setProperty('--cinema-image',`url("${document.querySelector('.hero-background').currentSrc}")`);filmDialog.showModal();window.JTGlassOptics?.schedule();document.body.classList.add('modal-open');$('#close-film').focus();
 // The iframe is created in the click handler. YouTube retains its native controls and quality selector.
 const frame=document.createElement('iframe');frame.id='full-film-player';frame.width='1280';frame.height='720';frame.title=$('#film-title').textContent;frame.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=0&controls=1&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';$('#film-screen').replaceChildren(frame);
 loadCatalog().then(films=>{if(request===requestedFilm&&films[id]){$('#film-title').textContent=films[id].title;$('#film-credit').textContent=films[id].credit;frame.title=films[id].title}}).catch(()=>{});
 try{await loadYouTube();if(request!==requestedFilm||!filmDialog.open)return;popupPlayer=new YT.Player(frame,{host:'https://www.youtube-nocookie.com',videoId:id,width:1280,height:720,playerVars:{autoplay:1,mute:0,controls:1,playsinline:1,rel:0,enablejsapi:1,origin:location.origin},events:{onReady:event=>{if(request!==requestedFilm)return;event.target.unMute();if(document.hidden)event.target.pauseVideo();else event.target.playVideo()},onStateChange:event=>{if(event.data===1&&document.hidden)event.target.pauseVideo()},onPlaybackQualityChange:event=>{const names={tiny:'144p',small:'240p',medium:'360p',large:'480p',hd720:'720p',hd1080:'1080p',hd1440:'1440p',hd2160:'2160p',highres:'High resolution'};const value=names[event.data]||event.data;frame.dataset.playbackQuality=event.data;$('#film-playback-status').textContent='Playing at '+value+'. For the sharpest picture, open player settings → Quality and choose the highest available option.'},onAutoplayBlocked:()=>{$('#film-playback-status').textContent='Press play in the player to watch with sound.'},onError:()=>{$('#film-playback-status').textContent='This upload is unavailable in the embedded player. Open it on YouTube below.'}}})}catch{$('#film-playback-status').textContent='Use the player controls to watch, or open the video on YouTube below.'}
}
let pointerStart=null,dragged=false;
carouselRoot.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};dragged=false},{passive:true});carouselRoot.addEventListener('pointermove',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>9)dragged=true},{passive:true});carouselRoot.addEventListener('pointerup',()=>{pointerStart=null},{passive:true});carouselRoot.addEventListener('pointercancel',()=>{pointerStart=null;dragged=true},{passive:true});
document.querySelectorAll('[data-film]').forEach(link=>link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();if(event.detail&&dragged)return;openFilm(link)}));
$('#close-film').addEventListener('click',()=>filmDialog.close());filmDialog.addEventListener('click',event=>{const r=filmDialog.getBoundingClientRect();if(event.target===filmDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))filmDialog.close()});
filmDialog.addEventListener('close',()=>{requestedFilm++;try{popupPlayer?.destroy()}catch{};popupPlayer=null;$('#film-screen').replaceChildren();document.body.classList.remove('modal-open');previousLink?.focus({preventScroll:true});resumeCarousel()});
// Moving light is a subtle enhancement. Foreground labels never refract.
// Glass highlights remain fixed. Pointer-following reflection removed at the user’s request.


// Refresh the moving card rims at a restrained cadence while their source remains fixed.
let lastOpticalScroll=0;carousel?.on('scroll',()=>{const now=performance.now();if(now-lastOpticalScroll>120){lastOpticalScroll=now;window.JTGlassOptics?.schedule()}});

document.addEventListener('musicaudiostart',()=>{realm?.pause();popupPlayer?.pauseVideo?.()});
document.addEventListener('pagewillchange',event=>{if(event.detail.previous!==event.detail.page){pausePreviews();realm?.pause();if(filmDialog.open)filmDialog.close()}});
document.addEventListener('pagechange',()=>{updateCarouselButtons();syncPreviews();window.JTGlassOptics?.schedule()});
