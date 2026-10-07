import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import events from '../server/oracle-events.json' with {type:'json'};

const bucket=process.env.CLOUDFLARE_R2_BUCKET;
if(!bucket)throw new Error('Set CLOUDFLARE_R2_BUCKET before syncing Oracle event flyers.');
if(process.env.WORKERS_CI&&!process.env.CLOUDFLARE_API_TOKEN)throw new Error('Cloudflare Workers Builds must provide CLOUDFLARE_API_TOKEN to sync event flyers.');
const wrangler='node_modules/wrangler/bin/wrangler.js';
for(const event of events){
  if(!/^event-flyers\/[\w.-]+\.(?:jpg|jpeg|png|webp)$/i.test(event.imageKey))throw new Error(`Invalid event flyer key: ${event.imageKey}`);
  const filename=event.imageKey.split('/').at(-1);
  const file=`assets/events/originals/${filename}`;
  if(!existsSync(file))throw new Error(`Missing Oracle supplied event flyer: ${file}`);
  const contentType={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[filename.split('.').at(-1).toLowerCase()];
  const result=spawnSync(process.execPath,[wrangler,'r2','object','put',`${bucket}/${event.imageKey}`,`--file=${file}`,`--content-type=${contentType}`,'--cache-control=public, max-age=31536000, immutable','--force','--remote'],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status)process.exit(result.status);
}
