(() => {
 'use strict';
 const $=s=>document.querySelector(s),audio=$('#music-audio'),flow=$('#coverflow'),track=$('#cover-track');
 let library,albums=[],allAlbums=[],releaseType='all',activeAlbum=0,selectedTrack=null,queue=[],page=0,releaseOnly=false,repeatMode='off',shuffle=false,baseQueue=[],queuePage=0,loadPromise,paintQueued=false,request=0,autoplayNext=true,embedded=null;
 const pageSize=8,pref=matchMedia('(prefers-reduced-motion: reduce)'),cssFlow=CSS.supports('animation-timeline','view(inline)');
 const fmt=n=>{n=Math.max(0,Math.floor(Number(n)||0));return n>=3600?Math.floor(n/3600)+':'+String(Math.floor(n%3600/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'):Math.floor(n/60)+':'+String(n%60).padStart(2,'0')};
 function button(label,callback){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.addEventListener('click',callback);return b}
 async function load(){
  if(library)return library;if(loadPromise)return loadPromise;
  loadPromise=fetch('music.json').then(r=>{if(!r.ok)throw Error('The music library could not load. Please refresh and try again.');return r.json()}).then(data=>{
   library=data;const groups=new Map();for(const song of library.tracks){const key=song.album+'|'+song.artist;let album=groups.get(key);if(!album){album={title:song.album.replace(/ - (Single|EP)$/,''),originalTitle:song.album,artist:song.artist,year:song.year,cover:song.cover,type:library.releases?.[key]?.type||'unclassified',songs:[]};groups.set(key,album)}album.songs.push(song)}
   allAlbums=[...groups.values()];allAlbums.forEach(album=>album.songs.sort((a,b)=>a.track-b.track));albums=allAlbums;renderCovers();
   $('#library-count').textContent=library.tracks.length+' songs';$('#music-library-status').textContent=library.tracks.length+' songs across '+allAlbums.length+' releases. Original audio. Original cover art.';
   selectAlbum(0,false,false);renderTracks();paintCovers();return library;
  }).catch(error=>{$('#music-library-status').textContent=error.message;$('#release-title').textContent='Your music is a refresh away.';loadPromise=null;throw error});return loadPromise;
 }
 function renderCovers(){
  track.replaceChildren();$('#release-select').replaceChildren();
  albums.forEach((album,i)=>{const b=button(album.title+' by '+album.artist,()=>selectAlbum(i,true,true));b.className='cover-item';b.dataset.album=i;b.setAttribute('aria-current',String(i===activeAlbum));const shell=document.createElement('span');shell.className='cover-art';const image=new Image();image.src=album.cover;image.alt=album.title+' cover';image.width=600;image.height=600;image.draggable=false;image.loading=i<4?'eager':'lazy';image.decoding='async';shell.append(image);b.append(shell);track.append(b);$('#release-select').append(new Option(album.title+' · '+album.year,String(i)))});
  document.querySelectorAll('[data-release-type]').forEach(b=>{const type=b.dataset.releaseType;b.setAttribute('aria-pressed',String(type===releaseType));b.querySelector('span').textContent=type==='all'?allAlbums.length:allAlbums.filter(a=>a.type===type).length});
 }
 document.querySelectorAll('[data-release-type]').forEach(b=>b.addEventListener('click',()=>{releaseType=b.dataset.releaseType;albums=releaseType==='all'?allAlbums:allAlbums.filter(a=>a.type===releaseType);activeAlbum=0;releaseOnly=false;page=0;$('#music-search').value='';renderCovers();selectAlbum(0,true,false);renderTracks();$('#release-filter-status').textContent=(releaseType==='all'?'All releases':b.firstChild.textContent.trim())+' · '+albums.length+' releases';}));
 function selectAlbum(index,scroll=true,filter=false){
  activeAlbum=Math.max(0,Math.min(albums.length-1,index));const album=albums[activeAlbum];if(!album)return;
  $('#release-title').textContent=album.title;$('#release-year').textContent=album.year+' · '+album.artist;$('#release-count').textContent=album.songs.length+' '+(album.songs.length===1?'song':'songs')+' available · '+({album:'Album',ep:'EP',single:'Single'}[album.type]||'Release');$('#release-select').value=String(activeAlbum);$('#cover-prev').disabled=activeAlbum===0;$('#cover-next').disabled=activeAlbum===albums.length-1;
  [...track.children].forEach((b,i)=>b.setAttribute('aria-current',String(i===activeAlbum)));
  if(scroll){const item=track.children[activeAlbum];flow.scrollTo({left:item.offsetLeft-(flow.clientWidth-item.clientWidth)/2,behavior:pref.matches?'instant':'smooth'})}
  if(filter){releaseOnly=true;page=0;$('#music-search').value='';renderTracks()}else if(releaseOnly){page=0;renderTracks()}
 }
 function visibleSongs(){if(!library)return[];const q=$('#music-search').value.trim().toLocaleLowerCase();return (releaseOnly?albums[activeAlbum].songs:releaseType==='all'?library.tracks:albums.flatMap(a=>a.songs)).filter(t=>[t.title,t.artist,t.album].join(' ').toLocaleLowerCase().includes(q))}
 function renderTracks(){
  const songs=visibleSongs(),pages=Math.max(1,Math.ceil(songs.length/pageSize));page=Math.max(0,Math.min(page,pages-1));$('#track-list').replaceChildren();
  $('#library-all').setAttribute('aria-pressed',String(!releaseOnly));$('#library-release').setAttribute('aria-pressed',String(releaseOnly));
  for(const song of songs.slice(page*pageSize,(page+1)*pageSize)){
   const li=document.createElement('li'),b=button('Play '+song.title+' by '+song.artist,()=>playSong(song,window.JTQueue.fromContext(song,songs,releaseOnly?albums.flatMap(album=>album.songs):songs)));b.className='track-button';b.dataset.track=song.id;if(song.id===selectedTrack?.id)b.setAttribute('aria-current','true');
   const image=new Image();image.src=song.cover;image.alt='';image.width=36;image.height=36;image.loading='lazy';const label=document.createElement('span');label.className='track-label';const title=document.createElement('strong');title.textContent=song.title;const artist=document.createElement('small');artist.textContent=song.artist;const listen=document.createElement('span');listen.className='site-listen-count';listen.dataset.siteListens=song.id;label.append(title,artist,listen);const duration=document.createElement('span');duration.textContent=song.id===selectedTrack?.id&&!audio.paused?'Playing':fmt(song.duration);b.append(image,label,duration);li.append(b);$('#track-list').append(li);
  }
  if(!songs.length){const li=document.createElement('li');li.textContent='No matches. Try another title or artist.';li.style.padding='30px 4px';$('#track-list').append(li)}
  window.JTListens?.attach($('#track-list'));$('#tracks-prev').disabled=page===0;$('#tracks-next').disabled=page===pages-1;$('#track-page').textContent=(songs.length?'Page '+(page+1)+' of '+pages:'No songs')+' · '+songs.length+' songs';
 }
 function paintCovers(){
  paintQueued=false;if(!albums.length||document.body.dataset.page!=='music')return;
  const center=flow.scrollLeft+flow.clientWidth/2;let closest=0,best=Infinity;
  [...track.children].forEach((b,i)=>{const delta=(b.offsetLeft+b.clientWidth/2-center)/b.clientWidth,abs=Math.abs(delta);if(abs<best){best=abs;closest=i}if(!cssFlow||pref.matches){const shell=b.firstElementChild;if(pref.matches)shell.style.transform='none';else if(abs<4){const angle=Math.max(-1,Math.min(1,delta))*54;shell.style.transform=`translateX(${Math.max(-1,Math.min(1,delta))*18}%) rotateY(${angle}deg) scale(${1-Math.min(abs,1)*.2})`;b.style.zIndex=String(10-Math.min(9,Math.round(abs*3)))}}});
  if(activeAlbum!==closest)selectAlbum(closest,false,false);
 }
 function onScroll(){if(!paintQueued){paintQueued=true;requestAnimationFrame(paintCovers)}}
 flow.addEventListener('scroll',onScroll,{passive:true});flow.addEventListener('keydown',event=>{if(event.target!==flow)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();selectAlbum(activeAlbum+(event.key==='ArrowRight'?1:-1),true,true)}});
 flow.addEventListener('wheel',()=>{}, {passive:true});new ResizeObserver(()=>{if(albums.length){selectAlbum(activeAlbum,true,false);onScroll()}}).observe(flow);
 $('#cover-prev').addEventListener('click',()=>selectAlbum(activeAlbum-1,true,true));$('#cover-next').addEventListener('click',()=>selectAlbum(activeAlbum+1,true,true));$('#release-select').addEventListener('change',event=>selectAlbum(Number(event.target.value),true,true));
 $('#music-search').addEventListener('input',()=>{releaseOnly=false;page=0;renderTracks()});$('#library-all').addEventListener('click',()=>{releaseOnly=false;page=0;renderTracks()});$('#library-release').addEventListener('click',()=>{releaseOnly=true;page=0;$('#music-search').value='';renderTracks()});
 $('#tracks-prev').addEventListener('click',()=>{page--;renderTracks()});$('#tracks-next').addEventListener('click',()=>{page++;renderTracks()});$('#play-release').addEventListener('click',()=>{const album=albums[activeAlbum];if(album)playSong(album.songs[0],window.JTQueue.fromContext(album.songs[0],album.songs,albums.flatMap(item=>item.songs)))});
 const playerDialog=$('#music-controls-dialog');let dialogOpener;
 const controls=(action)=>document.querySelectorAll('[data-music-action="'+action+'"]');
 const icons={"play":"<svg class=\"ph-icon \" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><use href=\"/assets/phosphor/sprite.svg#play\"></use></svg>","pause":"<svg class=\"ph-icon \" viewBox=\"0 0 256 256\" aria-hidden=\"true\"><use href=\"/assets/phosphor/sprite.svg#pause\"></use></svg>"};
 function shuffled(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function makeQueue(songs,song){baseQueue=[...songs];queue=shuffle?[song,...shuffled(baseQueue.filter(t=>t.id!==song.id))]:[...baseQueue];queuePage=0}
 async function playSong(song,songs,preserveQueue=false){
  if(!song)return;clearEmbedded();const thisRequest=++request;selectedTrack=song;if(song.kind!=='podcast')autoplayNext=true;if(!preserveQueue)makeQueue(songs?.length?songs:library.tracks,song);
  document.dispatchEvent(new CustomEvent('musicaudiostart'));audio.pause();audio.src=song.src||('/api/music/'+song.audio);audio.loop=repeatMode==='one';document.dispatchEvent(new CustomEvent('jttrackchange',{detail:{id:song.id,kind:song.kind||'music',duration:song.duration}}));
  for(const id of ['#playing-cover','#expanded-cover'])$(id).src=song.cover;
  for(const id of ['#playing-title','#expanded-title'])$(id).textContent=song.title;
  for(const id of ['#playing-artist','#expanded-artist'])$(id).textContent=song.artist;
  $('#music-expand').setAttribute('aria-label','Open player: '+song.title+' by '+song.artist);
  requestAnimationFrame(refreshMarquees);
  $('#expanded-site-listens').dataset.siteListens=song.id;window.JTListens?.attach($('.expanded-playing'));$('#expanded-release').textContent=song.album.replace(/ - (Single|EP)$/,'');
  document.querySelectorAll('[data-music-duration]').forEach(e=>e.textContent=fmt(song.duration));document.querySelectorAll('[data-music-seek]').forEach(e=>{e.max=song.duration;e.value=0});
  $('#music-player').hidden=false;document.body.classList.add('has-music-player');$('#audio-status').textContent='Loading '+song.title;updatePlayerState();renderQueue();
  try{await audio.play();if(thisRequest!==request)return;$('#audio-status').textContent='Playing '+song.title}catch(error){if(thisRequest!==request||error.name==='AbortError')return;$('#audio-status').textContent='Press play to start, or try another song.';$('#music-library-status').textContent='Playback could not start. Press play to try again.'}
  if('mediaSession' in navigator&&window.MediaMetadata){navigator.mediaSession.metadata=new MediaMetadata({title:song.title,artist:song.artist,album:song.album,artwork:[{src:new URL(song.cover,location.href).href,sizes:'600x600'}]})}
  renderTracks();
 }
 function advance(direction,fromEnded=false){
  const i=queue.findIndex(t=>t.id===selectedTrack?.id),n=window.JTQueue.nextIndex(i,queue.length,direction,repeatMode);
  if(n===null){if(fromEnded){audio.pause();$('#audio-status').textContent='End of the queue. Choose another song or turn on repeat all.';updatePlayerState()}return;}
  playSong(queue[n],null,true);
 }
 function togglePlay(){if(embedded){showPlayer();return}if(!selectedTrack)return;if(audio.paused){document.dispatchEvent(new CustomEvent('musicaudiostart'));audio.play().catch(()=>{$('#audio-status').textContent='Playback could not start. Choose another song or try again.'})}else audio.pause()}
 function seekBy(seconds){if(embedded)return;if(Number.isFinite(audio.duration)){audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+seconds));updateTimeline()}}
 function updateTimeline(){
  if(embedded)return;
  const duration=Number.isFinite(audio.duration)?audio.duration:selectedTrack?.duration||0;
  document.querySelectorAll('[data-music-seek]').forEach(e=>{e.max=duration||100;if(document.activeElement!==e)e.value=audio.currentTime;e.setAttribute('aria-valuetext',fmt(audio.currentTime)+' of '+fmt(duration))});
  document.querySelectorAll('[data-music-elapsed]').forEach(e=>e.textContent=fmt(audio.currentTime));document.querySelectorAll('[data-music-duration]').forEach(e=>e.textContent=fmt(duration));
  controls('previous').forEach(b=>b.disabled=queue.findIndex(t=>t.id===selectedTrack?.id)<=0&&audio.currentTime<3&&repeatMode!=='all');
  if('mediaSession' in navigator&&navigator.mediaSession.setPositionState&&duration>0){try{navigator.mediaSession.setPositionState({duration,playbackRate:audio.playbackRate,position:Math.min(audio.currentTime,duration)})}catch{}}
 }
 function updatePlayerState(){
  if(embedded){updateEmbeddedState();return}
  controls('previous').forEach(b=>b.setAttribute('aria-label','Previous track'));controls('next').forEach(b=>b.setAttribute('aria-label','Next track'));
  const paused=audio.paused,index=queue.findIndex(t=>t.id===selectedTrack?.id);
  controls('play').forEach(b=>{b.innerHTML=icons[paused?'play':'pause'];b.setAttribute('aria-label',paused?'Play':'Pause')});
  controls('next').forEach(b=>b.disabled=index>=queue.length-1&&repeatMode!=='all');
  controls('shuffle').forEach(b=>{b.setAttribute('aria-pressed',String(shuffle));b.setAttribute('aria-label',shuffle?'Shuffle on. Turn shuffle off':'Shuffle off. Turn shuffle on')});
  controls('repeat').forEach(b=>{b.dataset.mode=repeatMode;b.setAttribute('aria-label','Repeat '+repeatMode+'. Switch to '+({off:'repeat all',all:'repeat one',one:'repeat off'}[repeatMode]));b.setAttribute('aria-pressed',String(repeatMode!=='off'));const label=b.querySelector('.repeat-label');if(label)label.textContent={off:'Off',all:'All',one:'One'}[repeatMode]});
  const muted=audio.muted||audio.volume===0;controls('mute').forEach(b=>{b.setAttribute('aria-label',muted?'Unmute':'Mute');b.setAttribute('aria-pressed',String(muted));b.dataset.muted=String(muted)});
  document.querySelectorAll('[data-music-volume]').forEach(e=>e.value=audio.muted?0:audio.volume);
  if('mediaSession' in navigator)navigator.mediaSession.playbackState=paused?'paused':'playing';
  updateTimeline();if(library)renderTracks();
 }
 function renderQueue(){
  const list=$('#music-queue-list'),start=queuePage*12;list.replaceChildren();$('#music-queue-count').textContent=queue.length+(selectedTrack?.kind==='podcast'?' episodes':' songs');
  queue.slice(start,start+12).forEach((song,i)=>{const li=document.createElement('li'),b=button('Play '+song.title+' from queue',()=>playSong(song,null,true));b.className='queue-track';if(song.id===selectedTrack?.id)b.setAttribute('aria-current','true');const number=document.createElement('span');number.textContent=String(start+i+1).padStart(2,'0');const text=document.createElement('span'),name=document.createElement('strong'),artist=document.createElement('small');name.textContent=song.title;artist.textContent=song.artist;text.append(name,artist);const state=document.createElement('span');state.textContent=song.id===selectedTrack?.id?'Current':song.duration?fmt(song.duration):'Play';b.append(number,text,state);li.append(b);list.append(li)});
  const pages=Math.max(1,Math.ceil(queue.length/12));$('#queue-page').textContent='Page '+(queuePage+1)+' of '+pages;$('#queue-prev').disabled=queuePage===0;$('#queue-next').disabled=queuePage===pages-1;
 }
 function clearEmbedded(){
  if(!embedded)return;embedded=null;playerDialog.querySelector('.embedded-artist-player')?.remove();
  playerDialog.classList.remove('is-embedded-player');$('#music-player').classList.remove('is-embedded-player');
  $('#music-controls-title').textContent='Now playing';
 }
 function updateEmbeddedState(){
  controls('play').forEach(b=>{b.innerHTML='<svg class="ph-icon" viewBox="0 0 256 256" aria-hidden="true"><use href="/assets/phosphor/sprite.svg#arrows-out-simple"></use></svg>';b.setAttribute('aria-label','Open '+embedded.item.provider+' playback controls')});
  controls('previous').forEach(b=>{b.disabled=embedded.index===0;b.setAttribute('aria-label','Previous artist release')});
  controls('next').forEach(b=>{b.disabled=embedded.index===embedded.items.length-1;b.setAttribute('aria-label','Next artist release')});
 }
 function stepEmbedded(step){if(!embedded)return;const next=embedded.index+step;if(next<0||next>=embedded.items.length)return;openEmbedded(embedded.items,next)}
 function openEmbedded(items,index=0){
  const item=items[index];if(!item?.embed)return;
  const host=new URL(item.embed).hostname;if(!['bandcamp.com','open.spotify.com','embed.music.apple.com'].includes(host))return;
  audio.pause();clearEmbedded();document.dispatchEvent(new CustomEvent('musicaudiostart'));
  if('mediaSession' in navigator){navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none';try{navigator.mediaSession.setPositionState()}catch{}}
  document.dispatchEvent(new CustomEvent('jttrackchange',{detail:{id:null,kind:'embedded'}}));embedded={items,index,item};selectedTrack={id:item.id,title:item.title,artist:item.artist,album:item.title,cover:item.cover};
  const pane=document.createElement('section');pane.className='embedded-artist-player';
  const heading=document.createElement('h3');heading.textContent=item.title;
  const credit=document.createElement('p');credit.textContent=item.artist+' · '+item.provider;
  const note=document.createElement('p');note.className='provider-listening-note';note.textContent=item.accessNote||'Use the artist’s player below to listen. Availability is set by the artist and streaming service.';
  const frame=document.createElement('iframe');frame.src=item.embed;frame.title=item.title+' by '+item.artist;frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='eager';frame.dataset.provider=item.provider;
  pane.append(heading,credit,note,frame);playerDialog.querySelector('.music-controls-scroll').append(pane);
  playerDialog.classList.add('is-embedded-player');$('#music-player').classList.add('is-embedded-player');$('#music-controls-title').textContent='Artist player';
  for(const id of ['#playing-cover','#expanded-cover'])$(id).src=item.cover;
  $('#playing-title').textContent=item.title;$('#playing-artist').textContent=item.artist;$('#music-expand').setAttribute('aria-label','Open '+item.title+' by '+item.artist);
  $('#music-player').hidden=false;document.body.classList.add('has-music-player');requestAnimationFrame(refreshMarquees);updateEmbeddedState();showPlayer();
 }
 function showPlayer(){
  if(!selectedTrack||playerDialog.open)return;
  dialogOpener=document.activeElement;queuePage=Math.floor(Math.max(0,queue.findIndex(t=>t.id===selectedTrack.id))/12);
  if(!embedded)renderQueue();updatePlayerState();playerDialog.showModal();document.body.classList.add('music-controls-open');
  playerDialog.querySelector('.music-controls-scroll').scrollTop=0;$('#close-music-controls').focus({preventScroll:true});
 }
 function cleanupPlayer(){
  document.body.classList.remove('music-controls-open');
  if(dialogOpener?.isConnected&&!$('#music-player').hidden)dialogOpener.focus({preventScroll:true});
 }
 function closePlayer(){if(playerDialog.open)playerDialog.close();cleanupPlayer()}
 playerDialog.addEventListener('close',cleanupPlayer);
 document.addEventListener('pagewillchange',()=>{if(playerDialog.open)closePlayer()});
 // Only overflow text moves. Two identical runs provide a seamless rightward loop.
 function refreshMarquees(){
  document.querySelectorAll('.marquee-clip').forEach(clip=>{
   const run=clip.firstElementChild,original=run.firstElementChild,copy=run.lastElementChild;
   copy.textContent=original.textContent;clip.classList.remove('is-scrolling');
   const width=original.getBoundingClientRect().width,period=width+32;
   run.style.setProperty('--marquee-start',(-period)+'px');
   run.style.setProperty('--marquee-time',Math.max(10,period/24+2)+'s');
   if(width>clip.clientWidth+1&&!pref.matches)clip.classList.add('is-scrolling');
  });
 }
 const marqueeObserver=new ResizeObserver(refreshMarquees);
 document.querySelectorAll('.marquee-clip').forEach(e=>marqueeObserver.observe(e));
 document.fonts.ready.then(refreshMarquees);pref.addEventListener('change',refreshMarquees);
 document.addEventListener('visibilitychange',()=>document.body.classList.toggle('music-page-hidden',document.hidden));
 const actions={play:togglePlay,previous:()=>{if(embedded){stepEmbedded(-1);return}if(audio.currentTime>3)seekBy(-audio.currentTime);else advance(-1)},next:()=>embedded?stepEmbedded(1):advance(1),rewind:()=>seekBy(-15),forward:()=>seekBy(15),shuffle:()=>{shuffle=!shuffle;queue=shuffle?[selectedTrack,...shuffled(baseQueue.filter(t=>t.id!==selectedTrack?.id))]:[...baseQueue];queuePage=0;updatePlayerState();renderQueue()},repeat:()=>{repeatMode={off:'all',all:'one',one:'off'}[repeatMode];audio.loop=repeatMode==='one';updatePlayerState();$('#audio-status').textContent='Repeat '+repeatMode},mute:()=>{if(audio.volume===0){audio.volume=.7;audio.muted=false}else audio.muted=!audio.muted;updatePlayerState()},expand:showPlayer,stop:()=>{clearEmbedded();request++;audio.pause();audio.removeAttribute('src');audio.load();document.dispatchEvent(new CustomEvent('jttrackchange',{detail:{id:null,kind:'stopped'}}));$('#music-player').hidden=true;document.body.classList.remove('has-music-player');if(playerDialog.open)closePlayer()}};
 document.querySelectorAll('[data-music-action]').forEach(b=>b.addEventListener('click',()=>actions[b.dataset.musicAction]?.()));
 document.querySelectorAll('[data-music-seek]').forEach(e=>e.addEventListener('input',()=>{if(Number.isFinite(audio.duration)){audio.currentTime=Number(e.value);updateTimeline()}}));
 document.querySelectorAll('[data-music-volume]').forEach(e=>e.addEventListener('input',()=>{audio.volume=Number(e.value);audio.muted=false;updatePlayerState()}));
 $('#close-music-controls').addEventListener('click',closePlayer);
 playerDialog.addEventListener('cancel',event=>{event.preventDefault();closePlayer()});
 let backdropPress=false;
 const outsidePlayer=event=>{const r=playerDialog.getBoundingClientRect();return event.target===playerDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)};
 playerDialog.addEventListener('pointerdown',event=>{backdropPress=outsidePlayer(event)});
 playerDialog.addEventListener('pointercancel',()=>{backdropPress=false});
 playerDialog.addEventListener('click',event=>{if(backdropPress&&outsidePlayer(event))closePlayer();backdropPress=false});
 $('#queue-prev').addEventListener('click',()=>{queuePage--;renderQueue()});$('#queue-next').addEventListener('click',()=>{queuePage++;renderQueue()});
 audio.addEventListener('timeupdate',updateTimeline);audio.addEventListener('loadedmetadata',updateTimeline);audio.addEventListener('play',updatePlayerState);audio.addEventListener('pause',updatePlayerState);audio.addEventListener('volumechange',updatePlayerState);audio.addEventListener('ended',()=>{if(autoplayNext)advance(1,true);else updatePlayerState()});
 audio.addEventListener('error',()=>{if(audio.getAttribute('src')){$('#audio-status').textContent='This audio could not load. Try again or choose another track.';$('#music-library-status').textContent='This song could not load. Try another track while it reconnects.'}});
 document.addEventListener('videoaudiostart',()=>{audio.pause();if(embedded){clearEmbedded();$('#music-player').hidden=true;document.body.classList.remove('has-music-player')}});document.addEventListener('pagechange',event=>{if(event.detail.page==='music')load().then(()=>{selectAlbum(activeAlbum,true,false);paintCovers()}).catch(()=>{})});
 if('mediaSession' in navigator){for(const [key,fn] of Object.entries({play:()=>{if(!embedded&&audio.paused)togglePlay()},pause:()=>{if(!embedded)audio.pause()},previoustrack:()=>{if(!embedded)actions.previous()},nexttrack:()=>{if(!embedded)actions.next()},seekto:details=>{if(!embedded&&Number.isFinite(audio.duration)){audio.currentTime=details.seekTime;updateTimeline()}},seekbackward:d=>seekBy(-(d.seekOffset||15)),seekforward:d=>seekBy(d.seekOffset||15)})){try{navigator.mediaSession.setActionHandler(key,fn)}catch{}}}
 window.JTMusic={load,playCollection:(items,index=0)=>{autoplayNext=true;return playSong(items[index],items)},setAutoplayNext:value=>{autoplayNext=Boolean(value)},openEmbedded,get state(){return {tracks:library?.tracks.length||0,releases:allAlbums.length,visibleReleases:albums.length,releaseType,activeAlbum,playing:selectedTrack?.title,trackId:selectedTrack?.id,paused:embedded?null:audio.paused,queue:queue.length,queueIds:queue.map(t=>t.id),repeatMode,shuffle,cssFlow,autoplayNext,kind:embedded?'embedded':selectedTrack?.kind||'music',collection:selectedTrack?.album,artist:selectedTrack?.artist}}};if(document.body.dataset.page==='music')load().catch(()=>{});

 // A single, dismissible session hint after thirty minutes of actual listening.
 let savedListening={};try{savedListening=JSON.parse(sessionStorage.getItem('jt-listening-session')||'{}')}catch{}
 const listeningClock=new JTListeningClock(savedListening);let buffering=true,hintTimer;
 function listeningTick(){const ready=listeningClock.tick(performance.now(),!audio.paused&&!audio.ended&&!buffering&&!audio.muted&&audio.volume>0);if(ready&&!document.hidden&&!playerDialog.open&&!document.body.classList.contains('editing-field')&&listeningClock.consume()){$('#listening-hint').hidden=false;hintTimer=setTimeout(()=>{$('#listening-hint').hidden=true},20000)}try{sessionStorage.setItem('jt-listening-session',JSON.stringify(listeningClock.snapshot()))}catch{}}
 audio.addEventListener('playing',()=>{listeningTick();buffering=false;listeningTick()});for(const name of ['pause','ended','waiting','emptied'])audio.addEventListener(name,()=>{listeningTick();buffering=true;listeningTick()});audio.addEventListener('volumechange',listeningTick);document.addEventListener('visibilitychange',listeningTick);setInterval(listeningTick,5000);addEventListener('pagehide',listeningTick);$('#dismiss-listening-hint').addEventListener('click',()=>{clearTimeout(hintTimer);$('#listening-hint').hidden=true});
 new ResizeObserver(entries=>{const height=$('#music-player').hidden?0:entries[0].contentRect.height;document.documentElement.style.setProperty('--music-player-clearance',Math.ceil(height+135)+'px')}).observe($('#music-player'));

})();
