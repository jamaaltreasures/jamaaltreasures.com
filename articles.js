/* Native disclosures keep the full story in the document, even without JS. */
(() => {
 'use strict';
 const chapters=[...document.querySelectorAll('.story-chapter')];
 function openLinkedChapter(){
  let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}
  const chapter=chapters.find(item=>item.id===id);if(!chapter)return;
  chapter.open=true;requestAnimationFrame(()=>chapter.scrollIntoView({block:'start',behavior:'instant'}));
 }
 chapters.forEach(chapter=>chapter.addEventListener('toggle',()=>{
  if(!chapter.open)return;
  chapters.forEach(other=>{if(other!==chapter)other.open=false});
  // An earlier disclosure can collapse above the tapped card. Keep this one visible.
  requestAnimationFrame(()=>chapter.scrollIntoView({block:'start',behavior:'instant'}));
 }));
 addEventListener('hashchange',openLinkedChapter);openLinkedChapter();
 // Standalone stories don't need the homepage carousel script. Keep the real
 // recap stream and native iPhone playback, with HLS only when needed.
 const video=document.querySelector('#realm-video');if(!video)return;
 const quality=document.querySelector('#realm-quality'),state=document.querySelector('#realm-quality-state'),status=document.querySelector('#realm-status');
 let hls,ready=false,starting=false,library;
 const source=()=>quality.value==='auto'?video.dataset.stream:video.dataset.stream.replace(/master\.m3u8$/,'')+quality.value+'/index.m3u8';
 async function prepare(){
  if(ready)return;
  if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=source();ready=true;return}
  library ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/assets/vendor/hls-1.7.3.light.min.js';script.onload=resolve;script.onerror=()=>reject(Error('The player could not load. Please try again.'));document.head.append(script)}).catch(error=>{library=null;throw error});
  await library;if(!window.Hls?.isSupported())throw Error('Open the recap film in Safari, Chrome, Edge or Firefox.');
  hls=new Hls({maxBufferLength:20,backBufferLength:15,capLevelToPlayerSize:false});
  hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal){status.textContent='Playback was interrupted. Press play to try again.';hls.destroy();hls=null;ready=false}});
  hls.on(Hls.Events.MANIFEST_PARSED,()=>{if(quality.value!=='auto')hls.currentLevel=hls.levels.findIndex(level=>level.height===Number(quality.value))});
  hls.loadSource(video.dataset.stream);hls.attachMedia(video);ready=true;
 }
 async function start(){if(ready||starting)return;starting=true;status.textContent='Loading the film…';try{await prepare();await video.play();status.textContent=''}catch(error){status.textContent=error.message}finally{starting=false}}
 video.addEventListener('click',start);video.addEventListener('play',start);
 video.addEventListener('playing',()=>{status.textContent='';if(document.hidden)video.pause()});
 const sync=()=>{if(video.videoHeight)state.textContent=(video.videoHeight>=1080?'Full quality · ':'Playing at ')+video.videoHeight+'p'+(quality.value==='auto'?' · Auto':'')};
 video.addEventListener('resize',sync);video.addEventListener('loadeddata',sync);
 quality.addEventListener('change',()=>{if(!ready)return;if(hls){hls.currentLevel=quality.value==='auto'?-1:hls.levels.findIndex(level=>level.height===Number(quality.value));return}const time=video.currentTime,playing=!video.paused;video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.min(time,Number.isFinite(video.duration)?video.duration:time);if(playing)video.play().catch(()=>{})},{once:true});video.src=source();video.load();if(playing)video.play().catch(()=>{})});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause()});
 new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&!document.fullscreenElement&&!video.webkitDisplayingFullscreen)video.pause()}).observe(video);
})();
