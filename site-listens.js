/* Anonymous, qualified native-audio listens. Official provider iframe clicks are excluded. */
(() => {
  'use strict';
  class ActivePlaybackMeter {
    constructor() { this.seconds = 0; this.last = null; }
    reset() { this.seconds = 0; this.last = null; }
    sample({ now, position, playing, seeking = false, muted = false, volume = 1, rate = 1 }) {
      const active = playing && !seeking && !muted && volume > 0 && rate > 0;
      if (this.last && active && this.last.active) {
        const wall = (now - this.last.now) / 1000;
        const advance = position - this.last.position;
        // Seek jumps, buffering and large timer gaps are never assumed to be listening.
        if (wall > 0 && wall <= 10 && advance > 0 && advance <= wall * rate + .75) {
          this.seconds += Math.min(wall, advance / rate);
        }
      }
      this.last = { now, position, active };
      return this.seconds;
    }
  }
  // Exposed for focused deterministic tests, not for recording a listen directly.
  globalThis.JTActivePlaybackMeter = ActivePlaybackMeter;
  if (typeof document === 'undefined') return;
  const audio = document.getElementById('music-audio');
  if (!audio) return;
  const meter = new ActivePlaybackMeter();
  const values = new Map();
  let selection = null, event = null, generation = 0, buffering = true;
  let startPending = false, completePending = false, counted = false, retryAt = 0, lastPosition = 0, qualifyAfter = Infinity;
  const endpoint = '/api/listens';
  const now = () => performance.now();
  function sample() {
    if (!selection) return;
    const current = audio.currentTime || 0;
    // Native repeat-one wraps without firing ended. Each genuine loop is a new play.
    if (audio.loop && !audio.seeking && !audio.paused && lastPosition > Math.max(0, audio.duration - 2) && current < 2 && lastPosition > current + 2) select(selection);
    lastPosition = current;
    meter.sample({ now: now(), position: current, playing: !audio.paused && !audio.ended && !buffering, seeking: audio.seeking, muted: audio.muted, volume: audio.volume, rate: audio.playbackRate });
    if (!audio.paused && !buffering && !event && !startPending && now() >= retryAt) start();
    if (event && !counted && !completePending && meter.seconds >= event.thresholdSeconds && now() >= qualifyAfter && now() >= retryAt) complete();
  }
  async function post(body) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error(String(response.status));
    return response.json();
  }
  function select(track) {
    generation++; selection = track && typeof track.id === 'string' && track.kind !== 'embedded' ? { id: track.id, kind: track.kind || 'music' } : null;
    meter.reset(); event = null; counted = false; startPending = false; completePending = false; retryAt = 0; lastPosition = 0; qualifyAfter = Infinity;
    // Do not start a database event until native audio is actually playing.
  }
  async function start() {
    const token = generation, trackId = selection?.id;
    if (!trackId) return;
    startPending = true;
    try {
      const result = await post({ action: 'start', trackId });
      if (token === generation) {
        event = result; retryAt = 0;
        // Server created this token before its response reached us. Waiting from
        // receipt safely clears its time gate without a 422/retry delay.
        qualifyAfter = now() + result.thresholdSeconds * 1000;
        // A delayed/retried start must not report playback from before this
        // token existed; measure the qualifying interval from receipt.
        meter.reset(); sample();
      }
    } catch { if (token === generation) retryAt = now() + 15000; }
    finally { if (token === generation) startPending = false; }
  }
  async function complete() {
    const token = generation, current = event;
    completePending = true;
    try {
      const result = await post({ action: 'complete', eventId: current.eventId, trackId: selection.id, activeSeconds: Math.floor(meter.seconds * 1000) / 1000 });
      if (token !== generation) return;
      counted = true;
      values.set(result.trackId, { count: result.count, at: Date.now() });
      paint(document);
      document.dispatchEvent(new CustomEvent('jtlistenupdate', { detail: { trackId: result.trackId, count: result.count } }));
    } catch { if (token === generation) retryAt = now() + 10000; }
    finally { if (token === generation) completePending = false; }
  }
  function paint(container) {
    for (const node of container.querySelectorAll('[data-site-listens]')) {
      const record = values.get(node.dataset.siteListens);
      if (record) {
        node.textContent = record.count.toLocaleString() + (record.count === 1 ? ' site listen' : ' site listens');
        node.title = 'Recorded on this website after 30 seconds of active playback, or 80% of a shorter track. Replays can count; these are not unique listeners.';
        node.dataset.listenStatus = 'ready';
      }
    }
  }
  async function attach(container = document) {
    const nodes = [...container.querySelectorAll('[data-site-listens]')];
    const ids = [...new Set(nodes.map(node => node.dataset.siteListens))].filter(id => id && (!values.has(id) || Date.now() - values.get(id).at > 10000));
    paint(container);
    for (const node of nodes) if (!values.has(node.dataset.siteListens)) { node.textContent = 'Site listens loading'; node.dataset.listenStatus = 'loading'; }
    for (let index = 0; index < ids.length; index += 100) {
      const batch = ids.slice(index, index + 100);
      try {
        const response = await fetch(endpoint + '?ids=' + encodeURIComponent(batch.join(',')), { credentials: 'same-origin', signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw Error(String(response.status));
        const result = await response.json();
        for (const id of batch) {
          const count = result.counts?.[id];
          if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid count');
          values.set(id, { count, at: Date.now() });
        }
        paint(container);
      } catch {
        for (const node of nodes) if (batch.includes(node.dataset.siteListens) && !values.has(node.dataset.siteListens)) { node.textContent = 'Site listens unavailable'; node.dataset.listenStatus = 'unavailable'; }
      }
    }
  }
  document.addEventListener('jttrackchange', e => select(e.detail));
  audio.addEventListener('playing', () => { buffering = false; sample(); });
  audio.addEventListener('timeupdate', sample);
  for (const name of ['waiting', 'stalled', 'pause', 'ended', 'emptied']) audio.addEventListener(name, () => { sample(); buffering = true; });
  for (const name of ['seeking', 'seeked', 'volumechange', 'ratechange']) audio.addEventListener(name, sample);
  let interval = setInterval(sample, 1000);
  window.addEventListener('pagehide', () => { clearInterval(interval); interval = null; });
  window.addEventListener('pageshow', () => { if (interval === null) { interval = setInterval(sample, 1000); sample(); } });
  globalThis.JTListens = { attach, get state() { return { trackId: selection?.id, activeSeconds: meter.seconds, counted }; } };
  attach();
})();
