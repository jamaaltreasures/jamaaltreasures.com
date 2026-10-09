/* Ordered playback context shared by the release and artist browsers. */
(() => {
 const unique = items => [...new Map((items || []).filter(item => item?.id).map(item => [item.id, item])).values()];
 function fromContext(song, current, collection) {
  const local = unique(current), broader = unique(collection);
  const chosen = local.length === 1 && broader.some(item => item.id === song.id) ? broader : local;
  return chosen.some(item => item.id === song.id) ? chosen : [song, ...chosen];
 }
 function nextIndex(index, length, direction, repeatMode) {
  if (!length || index < 0) return null;
  const next = index + direction;
  if (next >= 0 && next < length) return next;
  return repeatMode === 'all' ? (next + length) % length : null;
 }
 globalThis.JTQueue = {fromContext, nextIndex};
})();
