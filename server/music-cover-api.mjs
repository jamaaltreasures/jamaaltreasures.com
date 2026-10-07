import manifest from './music-cover-manifest.json' with { type: 'json' };
import { serveListedMedia } from './media-read.mjs';
export function serveMusicCover(request, env) {
  return serveListedMedia(request, env, manifest, 'music-covers/v1/', 'image/webp');
}
