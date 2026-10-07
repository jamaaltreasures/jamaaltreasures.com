import manifest from './music-manifest.json' with { type: 'json' };
import { serveListedMedia } from './media-read.mjs';
export function serveMusic(request, env) {
  return serveListedMedia(request, env, manifest, 'music/v1/', 'audio/mp4');
}
