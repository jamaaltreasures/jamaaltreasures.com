/* Official creator libraries. Media starts only after a visitor chooses it. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const page = $('#minds-eye'), dialog = $('#inspiration-dialog');
  if (!page || !dialog) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const collectionNav = page.querySelector('.mind-quick-nav');
  const collectionLinks = [...(collectionNav?.querySelectorAll('a') || [])];
  const collectionPanels = collectionLinks.map(link => page.querySelector(link.getAttribute('href'))).filter(Boolean);
  collectionNav?.setAttribute('role','tablist');
  function showCollection(id,updateUrl=false){
    const selected=collectionPanels.find(panel=>panel.id===id||panel.contains(document.getElementById(id)))||collectionPanels[0];if(!selected)return;
    collectionLinks.forEach(link=>{const active=link.getAttribute('href')==='#'+selected.id;link.setAttribute('role','tab');link.id='tab-'+link.hash.slice(1);link.setAttribute('aria-controls',link.hash.slice(1));link.setAttribute('aria-selected',String(active));link.tabIndex=active?0:-1;});
    collectionPanels.forEach(panel=>{panel.hidden=panel!==selected;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+panel.id);});
    if(updateUrl)history.replaceState(history.state,'',location.pathname+location.search+'#'+selected.id);
    window.JTGlassOptics?.schedule();
  }
  collectionLinks.forEach((link,index)=>{link.addEventListener('click',event=>{event.preventDefault();showCollection(link.hash.slice(1),true);});link.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%collectionLinks.length;else if(event.key==='ArrowLeft')next=(index+collectionLinks.length-1)%collectionLinks.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=collectionLinks.length-1;else return;event.preventDefault();collectionLinks[next].focus();showCollection(collectionLinks[next].hash.slice(1),true);});});
  showCollection(location.hash.slice(1));
  addEventListener('hashchange',()=>showCollection(location.hash.slice(1)));
  document.addEventListener('pagechange',event=>{if(event.detail?.page==='minds-eye')showCollection(location.hash.slice(1));});

  const SHELF_BATCH = 24;
  const state = { catalog: null, loading: null, videos: {}, robinPage: 0, robinShown: SHELF_BATCH, robinQuery: null, artistPage: 0, artistShown: SHELF_BATCH, artistSignature: null, selectedRelease: null };
  function syncShowMore(id, anchor, total, shown, onMore) {
    let button = document.getElementById(id);
    if (!anchor || shown >= total) { button?.remove(); return; }
    if (!button) {
      button = plainButton('Show more', 'button glass creator-show-more');
      button.id = id;
      button.addEventListener('click', onMore);
      anchor.after(button);
    }
  }
  let videoPlayer = null, videoRequest = 0, videoOpener = null, videoTimer = null, backdropPress = false;
  const screen = $('#inspiration-screen');
  const dateFormat = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const normal = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const formatDate = value => { const date = new Date(value); return Number.isFinite(date.getTime()) ? dateFormat.format(date) : ''; };
  const formatTime = value => { const seconds = Math.floor(Number(value) || 0); return seconds >= 3600 ? Math.floor(seconds / 3600) + ':' + String(Math.floor(seconds % 3600 / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0') : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0'); };
  function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function image(src, alt, width, height) { const node = new Image(); node.src = src; node.alt = alt; node.width = width; node.height = height; node.loading = 'lazy'; node.decoding = 'async'; node.draggable = false; return node; }
  function playIcon() { const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('class', 'ph-icon'); icon.setAttribute('viewBox', '0 0 256 256'); icon.setAttribute('aria-hidden', 'true'); const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', '/assets/phosphor/sprite.svg#play'); icon.append(use); return icon; }
  function plainButton(text, className) { const button = element('button', className, text); button.type = 'button'; return button; }
  function debounce(callback) { let timer; return () => { clearTimeout(timer); timer = setTimeout(callback, 160); }; }
  function emptyMessage(target, message) { const node = element(target.tagName === 'OL' ? 'li' : 'p', 'creator-empty', message); target.replaceChildren(node); }
  function rangeText(pageNumber, size, count, unit) { return count ? (pageNumber * size + 1) + '–' + Math.min((pageNumber + 1) * size, count) + ' of ' + count.toLocaleString() + ' ' + unit : 'No matches'; }
  function announce(message) { let status = $('#creator-library-status'); if (!status) { status = element('p', 'creator-library-status'); status.id = 'creator-library-status'; status.setAttribute('role', 'status'); page.prepend(status); } status.textContent = message; status.hidden = !message; }
  async function loadCatalog() {
    if (state.catalog) return state.catalog;
    if (state.loading) return state.loading;
    page.setAttribute('aria-busy', 'true');
    state.loading = fetch('/creator-catalog.json?v=23').then(response => { if (!response.ok) throw new Error('Library unavailable'); return response.json(); }).then(catalog => {
      if (!Array.isArray(catalog.rea?.videos) || !Array.isArray(catalog.wisdom?.videos) || !Array.isArray(catalog.robin?.episodes) || !Array.isArray(catalog.artists)) throw new Error('Incomplete library');
      state.catalog = catalog;
      ['rea', 'wisdom'].forEach(key => { state.videos[key] = { page: 0, shown: SHELF_BATCH, query: '' }; renderVideos(key); });
      renderEpisodes(); prepareArtists(); artistSource = 'provider'; renderArtists(); announce(''); loadNativeArtistMusic();
      return catalog;
    }).catch(error => {
      state.loading = null;
      announce('The full creator libraries could not load. Your current player is still available.');
      const retry = plainButton('Try loading the libraries again', 'button glass'); retry.id = 'creator-retry';
      retry.addEventListener('click', () => { retry.remove(); loadCatalog().catch(() => {}); });
      if (!$('#creator-retry')) $('#creator-library-status').after(retry);
      throw error;
    }).finally(() => page.removeAttribute('aria-busy'));
    return state.loading;
  }

  // Every video stays in one native swipeable strip; no page replacement.
  function matchingVideos(key) { const query = normal($('#' + key + '-library-search')?.value.trim()); return (state.catalog?.[key].videos || []).filter(video => normal(video.title + ' ' + video.creator).includes(query)); }
  function setVideoButton(button, video) { button.dataset.inspirationVideo = video.id; button.dataset.inspirationTitle = video.title; button.dataset.inspirationCreator = video.creator; button.setAttribute('aria-label', 'Watch ' + video.title + ' by ' + video.creator); }
  function renderVideos(key) {
    const carousel = $('#' + key + '-carousel'), entries = matchingVideos(key), model = state.videos[key] || (state.videos[key] = { page: 0, shown: SHELF_BATCH, query: '' });
    const query = normal($('#' + key + '-library-search')?.value.trim());
    const queryChanged = model.query !== query;
    if (queryChanged) { model.query = query; model.shown = SHELF_BATCH; }
    const cards = entries.slice(0, model.shown).map(video => {
      const card = element('article', 'creator-film-card influence-card');
      const poster = plainButton('', 'creator-film-poster'); setVideoButton(poster, video);
      poster.append(image(video.thumbnail || 'https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg', '', 480, 270));
      const mark = element('span', 'creator-play-mark'); mark.append(playIcon()); poster.append(mark);
      const copy = element('div', 'creator-film-copy');
      const title=element('h3','',video.title);title.title=video.title;copy.append(element('p', 'creator-credit', video.creator),title);
      const metadata = [video.durationLabel || (video.durationSeconds ? formatTime(video.durationSeconds) : ''), formatDate(video.publishedAt)].filter(Boolean);
      if (metadata.length) copy.append(element('p', 'creator-video-meta', metadata.join(' · ')));
      const watch = plainButton(key === 'rea' ? 'Watch Full Video' : 'Watch video', 'button glass'); setVideoButton(watch, video); const watchIcon=playIcon();if(key==='rea')watchIcon.querySelector('use').setAttribute('href','/assets/phosphor/sprite.svg#arrow-right');watch.append(watchIcon); copy.append(watch); card.append(poster, copy); return card;
    });
    carousel.replaceChildren(...cards);
    if (!cards.length) emptyMessage(carousel, 'No titles match that search. Try a different word.');
    if (queryChanged) carousel.scrollLeft = 0;
    syncShowMore(key + '-show-more', carousel, entries.length, cards.length, () => { model.shown += SHELF_BATCH; renderVideos(key); });
    const fullCount = state.catalog[key].videos.length;
    $('#' + key + '-library-summary').textContent = key === 'rea' ? fullCount + ' public videos. Choose one to begin.' : fullCount + ' readings longer than three hours. Choose one to begin.';
    updateVideoNavigation(key);
    requestAnimationFrame(() => updateVideoNavigation(key));
  }
  function updateVideoNavigation(key) {
    if (!state.catalog) return;
    const entries=matchingVideos(key);
    $('#' + key + '-previous').hidden=true;$('#' + key + '-next').hidden=true;
    $('#' + key + '-position').textContent=entries.length+' '+(key==='rea'?'videos':'readings')+' · Scroll to explore';
  }
  function moveVideos(key,direction){const carousel=$('#'+key+'-carousel');carousel.scrollBy({left:direction*Math.max(240,carousel.clientWidth*.85),behavior:reducedMotion.matches?'instant':'smooth'});}
  ['rea', 'wisdom'].forEach(key => {
    const carousel = $('#' + key + '-carousel'); if (!carousel) return;
    $('#' + key + '-library-search')?.addEventListener('input', debounce(() => { if (!state.catalog) return; state.videos[key].page = 0; renderVideos(key); }));
    $('#' + key + '-previous')?.addEventListener('click', () => moveVideos(key, -1));
    $('#' + key + '-next')?.addEventListener('click', () => moveVideos(key, 1));
    carousel.addEventListener('scroll', () => updateVideoNavigation(key), { passive: true });
    carousel.addEventListener('keydown', event => { if (event.target !== carousel) return; if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveVideos(key, event.key === 'ArrowLeft' ? -1 : 1); } });
    new ResizeObserver(() => updateVideoNavigation(key)).observe(carousel);
  });

  // Keep YouTube visible in its own official player. Never extract an audio stream.
  function stopVideo() { videoRequest++; clearTimeout(videoTimer); try { videoPlayer?.stopVideo?.(); videoPlayer?.destroy?.(); } catch {} videoPlayer = null; screen.replaceChildren(); document.body.classList.remove('inspiration-open'); }
  function closeVideo() { if (dialog.open) dialog.close(); else stopVideo(); }
  function showVideoError(id, message) {
    if (!dialog.open) return;
    let status = $('#inspiration-player-status'); if (!status) { status = element('p', 'creator-player-status'); status.id = 'inspiration-player-status'; status.setAttribute('role', 'status'); screen.append(status); }
    status.textContent = message + ' ';
    const fallback = element('a', '', 'Open this video on YouTube'); fallback.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(id); fallback.target = '_blank'; fallback.rel = 'noopener noreferrer'; status.append(fallback);
  }
  async function openVideo(button) {
    const id = button.dataset.inspirationVideo; if (!/^[\w-]{11}$/.test(id || '')) return;
    stopVideo(); const request = ++videoRequest; videoOpener = button;
    document.dispatchEvent(new CustomEvent('videoaudiostart'));
    $('#inspiration-title').textContent = button.dataset.inspirationTitle || 'Creator video';
    $('#inspiration-creator').textContent = button.dataset.inspirationCreator || '';
    $('#inspiration-precautions').hidden = id !== 'tybOi4hjZFQ';
    $('#inspiration-source')?.remove(); screen.removeAttribute('data-provider');
    const mount = element('div'); mount.id = 'creator-video-' + request;
    const status = element('p', 'creator-player-status', 'Loading the official video player…'); status.id = 'inspiration-player-status'; status.setAttribute('role', 'status'); screen.append(mount, status);
    if (!dialog.open) dialog.showModal(); document.body.classList.add('inspiration-open'); $('#close-inspiration').focus({ preventScroll: true });
    videoTimer = setTimeout(() => { if (request === videoRequest) showVideoError(id, 'The player is taking longer than expected.'); }, 16000);
    try {
      if (typeof window.JTYouTubeReady !== 'function') throw new Error('Video loader unavailable');
      await window.JTYouTubeReady(); if (request !== videoRequest || !dialog.open) return;
      videoPlayer = new window.YT.Player(mount, {
        host: 'https://www.youtube-nocookie.com', videoId: id, width: 1280, height: 720,
        playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, enablejsapi: 1, origin: location.origin },
        events: {
          onReady: event => { if (request !== videoRequest || !dialog.open) { event.target.destroy(); return; } clearTimeout(videoTimer); $('#inspiration-player-status')?.remove(); const iframe = event.target.getIframe?.(); if (iframe) iframe.title = (button.dataset.inspirationTitle || 'Video') + ' by ' + (button.dataset.inspirationCreator || 'the creator'); if (document.hidden) event.target.pauseVideo(); },
          onStateChange: event => { if (event.data === 1 && (document.hidden || !dialog.open)) event.target.pauseVideo(); },
          onError: () => { if (request !== videoRequest) return; clearTimeout(videoTimer); showVideoError(id, 'This upload cannot play in the embedded player.'); }
        }
      });
    } catch { if (request === videoRequest) { clearTimeout(videoTimer); showVideoError(id, 'The official player could not load.'); } }
  }
  page.addEventListener('click', event => { const button = event.target.closest('[data-inspiration-video]'); if (button) openVideo(button); });
  $('#close-inspiration')?.addEventListener('click', closeVideo);
  dialog.addEventListener('close', () => { stopVideo(); if (videoOpener?.isConnected && document.body.dataset.page === 'minds-eye') videoOpener.focus({ preventScroll: true }); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeVideo(); });
  const outsideDialog = event => { const box = dialog.getBoundingClientRect(); return event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom); };
  dialog.addEventListener('pointerdown', event => { backdropPress = outsideDialog(event); });
  dialog.addEventListener('pointercancel', () => { backdropPress = false; });
  dialog.addEventListener('click', event => { if (backdropPress && outsideDialog(event)) closeVideo(); backdropPress = false; });
  document.addEventListener('pagewillchange', event => { if (event.detail?.page !== 'minds-eye') closeVideo(); });
  document.addEventListener('musicaudiostart', closeVideo);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { try { videoPlayer?.pauseVideo?.(); } catch {} } });

  // Official publisher audio shares the site's persistent music player and queue.
  function matchingEpisodes() { const query = normal($('#robin-search')?.value.trim()); return (state.catalog?.robin.episodes || []).filter(episode => normal(episode.title).includes(query)); }
  function renderEpisodes() {
    const entries = matchingEpisodes(), list = $('#robin-episodes');
    const query = normal($('#robin-search')?.value.trim());
    const queryChanged = state.robinQuery !== query;
    if (queryChanged) { state.robinQuery = query; state.robinShown = SHELF_BATCH; }
    const batch = entries.slice(0, state.robinShown);
    list.replaceChildren(...batch.map(episode => {
      const li = element('li'), button = plainButton('', 'creator-episode'); button.dataset.robinEpisode = episode.id; button.setAttribute('aria-label', 'Play ' + episode.title + ' by Robin Sharma');
      const copy = element('span', 'creator-episode-copy'); copy.append(element('strong', '', episode.title));
      const metadata = ['Robin Sharma', formatDate(episode.publishedAt), Number(episode.duration) > 0 ? formatTime(episode.duration) : ''].filter(Boolean); copy.append(element('span', '', metadata.join(' · ')));const listens=element('span','site-listen-count');listens.dataset.siteListens=episode.id;copy.append(listens);
      const play = element('span', 'creator-episode-play'); play.append(playIcon());
      button.append(image(state.catalog.robin.artwork, '', 80, 80), copy, play); li.append(button); return li;
    }));
    if (!entries.length) emptyMessage(list, 'No episodes match that search. Try another title or topic.');
    $('#robin-library-summary').textContent = state.catalog.robin.episodes.length.toLocaleString() + ' episodes from Robin Sharma’s official archive and podcast feed.';
    $('#robin-position').textContent = entries.length + ' episodes';
    $('#robin-previous').hidden=true;$('#robin-next').hidden=true;if (queryChanged) list.scrollTop=0;
    $('#robin-play-all').disabled = !entries.length; window.JTListens?.attach(list);syncPodcastSelection();
    syncShowMore('robin-show-more', list, entries.length, batch.length, () => { state.robinShown += SHELF_BATCH; renderEpisodes(); });
  }
  function syncPodcastSelection() { const selected = window.JTMusic?.state?.trackId; page.querySelectorAll('[data-robin-episode]').forEach(button => { if (button.dataset.robinEpisode === selected) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current'); }); }
  async function playPodcast(id) {
    try {
      await loadCatalog(); const episodes = matchingEpisodes(), index = id ? episodes.findIndex(episode => episode.id === id) : 0;
      if (index < 0 || !episodes.length) return;
      if (!window.JTMusic?.playCollection) throw new Error('Player unavailable');
      const queue = episodes.map(episode => ({ id: episode.id, title: episode.title, src: episode.src, duration: Number(episode.duration) || 0, artist: 'Robin Sharma', album: 'The Daily Mastery Podcast', cover: state.catalog.robin.artwork, kind: 'podcast' }));
      const starting = window.JTMusic.playCollection(queue, index); window.JTMusic.setAutoplayNext(Boolean($('#robin-autoplay')?.checked));
      syncPodcastSelection(); await starting;
    } catch { announce('This episode could not start. Please try again, or choose another episode.'); }
  }
  $('#robin-search')?.addEventListener('input', debounce(() => { if (state.catalog) { renderEpisodes();$('#robin-episodes').closest('details').open=true; } }));
  $('#robin-previous')?.addEventListener('click', () => { if (!state.catalog) return; state.robinPage--; renderEpisodes(); });
  $('#robin-next')?.addEventListener('click', () => { if (!state.catalog) return; state.robinPage++; renderEpisodes(); });
  $('#robin-play-all')?.addEventListener('click', () => playPodcast());
  $('#robin-episodes')?.addEventListener('click', event => { const button = event.target.closest('[data-robin-episode]'); if (button) playPodcast(button.dataset.robinEpisode); else if (event.target.closest('[data-listening-resource="robin"]')) playPodcast(); });
  $('#robin-autoplay')?.addEventListener('change', event => { if (window.JTMusic?.state?.kind === 'podcast') window.JTMusic.setAutoplayNext(event.target.checked); });
  $('#music-audio')?.addEventListener('play', syncPodcastSelection);
  $('#music-audio')?.addEventListener('loadedmetadata', syncPodcastSelection);

  // Authorized full-length audio shares the persistent player and genuine site-listen counts.
  let artistReleases = [], nativeArtistTracks = [], nativeArtistReleases = [], providerArtistReleases = [], artistSource = 'native';
  const artistSlugs = { tony: 'spiritual-tony', fr33sol: 'fr33sol', lavva: 'lavva' };
  const albumName = value => normal(value).replace(/\s*-\s*(single|ep)\s*$/, '').trim();
  const displayAlbum = value => String(value || '').replace(/\s*-\s*(Single|EP)\s*$/, '');
  function creatorsForTrack(track) {
    return state.catalog.artists.filter(artist => (track.featuredArtists || []).some(value => value === artistSlugs[artist.key] || normal(value) === normal(artist.name)));
  }
  async function loadNativeArtistMusic() {
    try {
      const response = await fetch('/hosted-artist-music.json');
      if (!response.ok) throw Error('Music catalog unavailable');
      const catalog = await response.json(), ids = new Set();
      if (!Array.isArray(catalog.tracks) || !catalog.tracks.length) throw Error('Music catalog is empty');
      nativeArtistTracks = catalog.tracks.filter(track => {
        if (!track.id || !track.src?.startsWith('/api/music/') || !track.cover || !track.title || !track.album || !creatorsForTrack(track).length || ids.has(track.id)) return false;
        ids.add(track.id); return true;
      }).map(track => ({ ...track, kind: 'music' }));
      if (!nativeArtistTracks.length) throw Error('Music catalog is empty');
      artistSource = 'native'; state.artistPage = 0; state.selectedRelease = null;
      prepareArtists(); renderArtists();
    } catch {
      artistSource = 'provider'; prepareArtists(); renderArtists();
      $('#artist-library-status').textContent = 'Full songs could not load just now. Official artist players are available below.';
      const retry = plainButton('Reload full songs', 'button glass'); retry.id = 'artist-native-retry';
      retry.addEventListener('click', () => { retry.disabled = true; loadNativeArtistMusic().finally(() => retry.remove()); });
      $('#artist-library-status').after(retry);
    }
  }
  function interleaveReleases(releases) {
    const result = [], seen = new Set(), groups = state.catalog.artists.map(artist => releases.filter(release => release.creators.some(creator => creator.key === artist.key)));
    for (let index = 0; index < Math.max(0, ...groups.map(group => group.length)); index++) groups.forEach(group => { const release = group[index]; if (release && !seen.has(release.key)) { result.push(release); seen.add(release.key); } });
    return result;
  }
  function ensureArtistControls() {
    if ($('#artist-library-status')) return;
    const controls = element('div', 'creator-native-controls');
    const sourcePicker = element('div', 'creator-source-picker'); sourcePicker.setAttribute('aria-label', 'Music playback source');
    for (const [key, label] of [['native', 'Listen here'], ['provider', 'More official releases']]) { const button = plainButton(label, 'creator-source-button'); button.dataset.artistSource = key; button.addEventListener('click', () => { artistSource = key; state.artistPage = 0; state.selectedRelease = null; renderArtists(); }); sourcePicker.append(button); }
    const status = element('p', 'creator-native-summary'); status.id = 'artist-library-status'; status.setAttribute('aria-live', 'polite');
    const play = plainButton('Play all songs', 'button glass'); play.id = 'artist-play-all'; play.prepend(playIcon()); play.addEventListener('click', () => playNativeArtistSongs(matchingNativeSongs(), 0));
    controls.append(sourcePicker, status, play); $('#artist-coverflow').before(controls);
    const label = document.querySelector('label[for="artist-search"] > span'); if (label) label.textContent = 'Find a song or release';
    const note = $('#artist-library .creator-provider-note'); if (note) note.textContent = 'Choose a full song to listen as you explore the site. More official releases open in the artist’s own player, where preview and sign-in rules may apply.';
  }
  function prepareArtists() {
    const artists = state.catalog.artists, filter = $('#artist-filter');
    if (filter) { const previous = filter.value; filter.replaceChildren(new Option('All artists', ''), ...artists.map(artist => new Option(artist.name, artist.key))); filter.value = artists.some(artist => artist.key === previous) ? previous : ''; }
    const groups = new Map();
    for (const track of nativeArtistTracks) {
      const key = track.album + '|' + track.artist, creators = creatorsForTrack(track);
      if (!groups.has(key)) groups.set(key, { key: 'native:' + track.id, title: track.album, artist: track.artist, year: track.year, cover: track.cover, creators, creator: creators[0], tracks: [], native: true });
      const release = groups.get(key); release.tracks.push(track);
      for (const creator of creators) if (!release.creators.some(item => item.key === creator.key)) release.creators.push(creator);
    }
    const native = [...groups.values()].sort((a, b) => String(b.year).localeCompare(String(a.year)) || a.title.localeCompare(b.title));
    native.forEach(release => release.tracks.sort((a, b) => (parseInt(a.track, 10) || 0) - (parseInt(b.track, 10) || 0) || a.title.localeCompare(b.title)));
    nativeArtistReleases = interleaveReleases(native);
    const providers = [], knownProviders = new Set();
    for (const artist of artists) for (const release of artist.releases) {
      if (nativeArtistReleases.some(item => albumName(item.title) === albumName(release.title) && item.creators.some(creator => creator.key === artist.key))) continue;
      const providerKey = release.provider + ':' + (release.embedUrl || release.id);
      if (knownProviders.has(providerKey)) continue; knownProviders.add(providerKey);
      providers.push({ ...release, artist: release.artist || artist.name, creator: artist, creators: [artist], key: artist.key + ':' + release.id, native: false });
    }
    providerArtistReleases = interleaveReleases(providers);
    ensureArtistControls();
    const spotlight = $('#artist-spotlight');
    if (spotlight) spotlight.replaceChildren(...artists.map(artist => {
      const card = plainButton('', 'artist-spotlight-card glass');card.dataset.artistChoice=artist.key;
      card.append(image(artist.portrait, '', 96, 96),element('strong','',artist.name),element('span','','Browse albums'));
      card.addEventListener('click',()=>{filter.value=artist.key;state.artistPage=0;state.selectedRelease=null;$('#artist-search').value='';renderArtists();});return card;
    }));
  }
  function matchesArtistQuery(release) {
    const query = normal($('#artist-search')?.value.trim()), artist = $('#artist-filter')?.value;
    return (!artist || release.creators.some(creator => creator.key === artist)) && normal([release.title, release.artist, ...release.creators.map(creator => creator.name), ...(release.tracks || []).map(track => track.title + ' ' + track.artist)].join(' ')).includes(query);
  }
  function releaseRank(release){if(/\bSingle\s*$/i.test(release.title)||(release.native&&release.tracks.length===1))return 2;if(/\bEP\s*$/i.test(release.title))return 1;return 0;}
  function matchingReleases() { artistReleases = artistSource === 'native' ? nativeArtistReleases : providerArtistReleases; return artistReleases.filter(matchesArtistQuery).sort((a,b)=>releaseRank(a)-releaseRank(b)); }
  function matchingNativeSongs() {
    const query = normal($('#artist-search')?.value.trim()), ids = new Set();
    return nativeArtistReleases.filter(matchesArtistQuery).flatMap(release => release.tracks).filter(track => {
      if (ids.has(track.id) || !normal(track.title + ' ' + track.artist + ' ' + track.album).includes(query)) return false;
      ids.add(track.id); return true;
    });
  }
  function renderArtists() {
    const entries = matchingReleases(), carousel = $('#artist-coverflow');
    const signature = [artistSource, $('#artist-filter')?.value || '', normal($('#artist-search')?.value.trim())].join('|');
    const signatureChanged = state.artistSignature !== signature;
    if (signatureChanged) { state.artistSignature = signature; state.artistShown = SHELF_BATCH; }
    const visible = entries.slice(0, state.artistShown);
    if (!entries.some(release => release.key === state.selectedRelease)) state.selectedRelease = entries[0]?.key || null;
    carousel.replaceChildren(...visible.map(release => { const button = plainButton('', 'creator-cover-tile'); button.dataset.artistRelease = release.key; button.setAttribute('aria-label', 'Explore ' + displayAlbum(release.title) + ' by ' + release.artist); button.setAttribute('aria-current', String(release.key === state.selectedRelease)); button.append(image(release.cover, displayAlbum(release.title) + ' cover artwork', 480, 480), element('strong', '', displayAlbum(release.title)), element('span', '', release.artist)); return button; }));
    if (signatureChanged) carousel.scrollLeft = 0;
    if (!visible.length) emptyMessage(carousel, 'No releases match. Try another title or artist.');
    syncShowMore('artist-show-more', carousel, entries.length, visible.length, () => { state.artistShown += SHELF_BATCH; renderArtists(); });
    $('#artist-position').textContent = entries.length + ' releases · Scroll to explore';
    $('#artist-previous').hidden = true; $('#artist-next').hidden = true;
    document.querySelectorAll('[data-artist-source]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.artistSource === artistSource)); button.disabled = button.dataset.artistSource === 'native' && !nativeArtistTracks.length; });
    const songs = matchingNativeSongs(), play = $('#artist-play-all'); play.hidden = artistSource !== 'native'; play.disabled = !songs.length;
    $('#artist-library-status').textContent = artistSource === 'native' ? songs.length + ' full songs across ' + entries.length + ' releases. Choose a song and keep exploring.' : entries.length + ' additional releases in official artist players. Provider access rules apply.';
    document.querySelectorAll('[data-artist-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.artistChoice===$('#artist-filter').value)));
    renderArtistDetail();
  }
  function renderArtistDetail() {
    const release = artistReleases.find(item => item.key === state.selectedRelease), panel = $('#artist-releases');
    panel.replaceChildren(); if (!release) return;
    panel.classList.toggle('has-native-tracks', release.native);
    const artist = release.creators.find(creator => creator.key === $('#artist-filter')?.value) || release.creator;
    const profile = element('div', 'creator-selected-profile'), portrait = image(artist.portrait, artist.name, 160, 160); portrait.className = 'creator-artist-portrait';
    const bio = element('div', 'creator-artist-copy'); bio.append(element('p', 'eyebrow', 'Meet the artist'), element('h3', '', artist.name), element('p', '', artist.bio)); profile.append(portrait, bio); panel.append(profile);
    if (release.native) {
      const detail = element('div', 'creator-native-release'), heading = element('div', 'creator-native-release-heading'), copy = element('div');
      copy.append(element('p', 'eyebrow', 'Now exploring'), element('h3', '', displayAlbum(release.title)), element('p', '', release.artist + (release.year ? ' · ' + release.year : '') + ' · ' + release.tracks.length + (release.tracks.length === 1 ? ' song' : ' songs')));
      const play = plainButton('Play release', 'button glass'); play.dataset.playNativeRelease = release.key; play.prepend(playIcon()); heading.append(copy, play); detail.append(heading);
      const list = element('ol', 'creator-native-tracks'); list.setAttribute('aria-label', displayAlbum(release.title) + ' songs');
      release.tracks.forEach(track => {
        const item = element('li'), button = plainButton('', 'creator-native-track'); button.dataset.nativeArtistTrack = track.id; button.setAttribute('aria-label', 'Play ' + track.title + ' by ' + track.artist);
        const art = image(track.cover, '', 56, 56), text = element('span', 'creator-native-track-copy'), listens = element('span', 'site-listen-count'); listens.dataset.siteListens = track.id;
        text.append(element('strong', '', track.title), element('span', '', track.artist), listens);
        const time = element('span', 'creator-native-track-duration', formatTime(track.duration)); time.dataset.duration = formatTime(track.duration); button.append(art, text, time); item.append(button); list.append(item);
      });
      detail.append(list); panel.append(detail); window.JTListens?.attach(list); syncArtistSelection();
    } else {
      bio.append(element('p', 'creator-selected-release', release.title + ' · ' + release.artist));
      if (release.access) bio.append(element('p', 'creator-release-access', release.access));
      const providerNames = { apple: 'Apple Music', bandcamp: 'Bandcamp', spotify: 'Spotify' };
      const listen = plainButton('Listen with ' + (providerNames[release.provider] || release.provider), 'button glass'); listen.dataset.playArtistRelease = release.key; listen.prepend(playIcon()); panel.append(listen);
    }
  }
  function syncArtistSelection() {
    const current = window.JTMusic?.state;
    document.querySelectorAll('[data-native-artist-track]').forEach(button => {
      const selected = button.dataset.nativeArtistTrack === current?.trackId; button.setAttribute('aria-current', String(selected));
      const duration = button.querySelector('.creator-native-track-duration'); if (duration) duration.textContent = selected && current?.paused === false ? 'Playing' : duration.dataset.duration;
    });
  }
  async function playNativeArtistSongs(songs, index) {
    if (!songs.length || !window.JTMusic?.playCollection) { announce('The music player is not ready. Please refresh and try again.'); return; }
    try { await window.JTMusic.playCollection(songs, Math.max(0, index)); syncArtistSelection(); announce(''); } catch { announce('That song could not start. Please try play again.'); }
  }
  function selectRelease(key, scroll) {
    if (!artistReleases.some(release => release.key === key)) return;
    state.selectedRelease = key;
    $('#artist-coverflow').querySelectorAll('[data-artist-release]').forEach(button => { button.setAttribute('aria-current', String(button.dataset.artistRelease === key)); if (scroll && button.dataset.artistRelease === key) { const flow = $('#artist-coverflow'), box = button.getBoundingClientRect(), parentBox = flow.getBoundingClientRect(); flow.scrollTo({ left: flow.scrollLeft + box.left - parentBox.left - (flow.clientWidth - box.width) / 2, behavior: reducedMotion.matches ? 'instant' : 'smooth' }); } });
    renderArtistDetail();
  }
  function moveArtists(direction) { const carousel=$('#artist-coverflow');carousel.scrollBy({left:direction*Math.max(240,carousel.clientWidth*.8),behavior:reducedMotion.matches?'instant':'smooth'}); }
  $('#artist-previous')?.addEventListener('click', () => moveArtists(-1)); $('#artist-next')?.addEventListener('click', () => moveArtists(1));
  $('#artist-filter')?.addEventListener('change', () => { state.artistPage = 0; renderArtists(); });
  $('#artist-search')?.addEventListener('input', debounce(() => { if (state.catalog) { state.artistPage = 0; renderArtists(); } }));
  $('#artist-coverflow')?.addEventListener('click', event => { const button = event.target.closest('[data-artist-release]'); if (button) selectRelease(button.dataset.artistRelease, true); });
  $('#artist-coverflow')?.addEventListener('keydown', event => {
    const flow = $('#artist-coverflow'); if (event.target !== flow || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); const direction = event.key === 'ArrowLeft' ? -1 : 1, visible = [...flow.querySelectorAll('[data-artist-release]')], selected = visible.findIndex(button => button.dataset.artistRelease === state.selectedRelease), next = selected + direction;
    if (next < 0 || next >= visible.length) moveArtists(direction); else selectRelease(visible[next].dataset.artistRelease, true);
  });
  $('#artist-releases')?.addEventListener('click', event => {
    const song = event.target.closest('[data-native-artist-track]'), nativeRelease = event.target.closest('[data-play-native-release]');
    if (song || nativeRelease) {
      const release = nativeArtistReleases.find(item => item.key === (nativeRelease?.dataset.playNativeRelease || state.selectedRelease));
      if (release) {
        const selected = song ? release.tracks.find(track => track.id === song.dataset.nativeArtistTrack) : release.tracks[0];
        const collection = matchingReleases().filter(item => item.native).flatMap(item => item.tracks);
        const queue = window.JTQueue.fromContext(selected, release.tracks, collection);
        playNativeArtistSongs(queue, queue.findIndex(track => track.id === selected.id));
      }
      return;
    }
    const button = event.target.closest('[data-play-artist-release]'); if (!button) return;
    const releases = matchingReleases(), index = releases.findIndex(release => release.key === button.dataset.playArtistRelease);
    if (index < 0 || !window.JTMusic?.openEmbedded) { announce('The artist player is not ready. Please refresh and try again.'); return; }
    const items = releases.map(release => ({ id: release.key, title: release.title, artist: release.artist, cover: release.cover, provider: release.provider, embed: release.embedUrl, accessNote: release.access, url: release.url }));
    window.JTMusic.openEmbedded(items, index);
  });
  for (const event of ['play', 'pause', 'loadedmetadata']) $('#music-audio')?.addEventListener(event, syncArtistSelection);
  document.addEventListener('pagechange', event => { if (event.detail?.page === 'minds-eye') { loadCatalog().catch(() => {}); syncPodcastSelection(); } });
  if (document.body.dataset.page === 'minds-eye' || location.pathname.replace(/\/$/, '') === '/minds-eye') loadCatalog().catch(() => {});
  window.JTCreatorLibraries = { load: loadCatalog, get state() { return { loaded: Boolean(state.catalog), rea: state.catalog?.rea.videos.length || 0, wisdom: state.catalog?.wisdom.videos.length || 0, episodes: state.catalog?.robin.episodes.length || 0, releases: artistReleases.length, nativeTracks: nativeArtistTracks.length, nativeReleases: nativeArtistReleases.length, providerReleases: providerArtistReleases.length, artistSource, selectedRelease: state.selectedRelease }; } };
})();
