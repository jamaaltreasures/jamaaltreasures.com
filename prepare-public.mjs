import {gzipSync} from 'node:zlib';
import {mkdirSync,copyFileSync,readFileSync,existsSync,statSync,rmSync,readdirSync} from 'node:fs';
import path from 'node:path';
const out=path.resolve('public');
rmSync(out,{recursive:true,force:true});
mkdirSync(path.join(out,'assets'),{recursive:true});
const pages=['index.html','work.html','music.html','reviews.html','prices.html','stats.html','bio.html','process.html','community.html','contact.html','privacy.html','artist-recaps.html','minds-eye.html'];
const runtime=[...pages,'styles.css','brand.css','app-pages.css','app.js','app-pages.js','music.js','music-listening-clock.js','site-listens.js','inspiration.js','creator-catalog.json','hosted-artist-music.json','creator-libraries.css','glass-optics.js','social-reach.json','videos.json','reach.json','verified-video-reach.json','offers.json','music.json','manifest.webmanifest','journal.css','journal.js','editorial.css','music-queue.js','journal-preserved-styles.css','journal-preserved-app-pages.css','journal-preserved-glass-optics.js'];
for(const file of runtime) copyFileSync(file,path.join(out,file));
const realmAssets=readdirSync('assets/realm-final',{recursive:true}).filter(file=>statSync(path.join('assets/realm-final',file)).isFile()).map(file=>'realm-final/'+file);
const assets=[...readdirSync('assets/events').filter(f=>statSync(path.join('assets/events',f)).isFile()).map(f=>'events/'+f),...readdirSync('assets/editorial').map(f=>'editorial/'+f),...readdirSync('assets/minds-eye').map(f=>'minds-eye/'+f),'syne.woff2','syne-OFL.txt',...readdirSync('assets/tool-brands').map(f=>'tool-brands/'+f),'phosphor/sprite.svg','phosphor/LICENSE.txt',...realmAssets,'realm-final-poster.webp','vendor/hls-1.7.3.light.min.js','vendor/hls-LICENSE.txt','jamaal-portrait-480.webp','jamaal-portrait-900.webp','star.svg','glass-frame-chip.png','glass-frame-card.png','marble.svg','jamaal-key.svg','jamaal-logo.svg','jamaal-logo-animated.svg','jamaal-wordmark.svg','platform-instagram.svg','platform-youtube.svg','platform-applemusic.svg','platform-icons-LICENSE.txt','manrope.woff2','barlow-condensed.woff2','instrument-serif-italic.woff2','manrope-OFL.txt','barlow-condensed-OFL.txt','instrument-serif-italic-OFL.txt',...Array.from({length:5},(_,i)=>`client-review-${i+1}.jpg`),...Object.keys(JSON.parse(readFileSync('videos.json'))).map(id=>`video-${id}.jpg`)];

assets.push('jamaal-treasures-star-wordmark.webp',...readdirSync('assets').filter(f=>/^offer-.*\.svg$/.test(f)),...['discord','meta','square','distrokid','whop','cashapp'].map(n=>'platform-'+n+'.svg'),...readdirSync('assets/music-covers').map(f=>'music-covers/'+f));
for(const file of assets){
  const source=path.join('assets',file);
  if(statSync(source).size>25*1024*1024) throw new Error(`Asset exceeds static size limit: ${file}`);
  mkdirSync(path.dirname(path.join(out,'assets',file)),{recursive:true});
  copyFileSync(source,path.join(out,'assets',file));
}
for(const file of pages){
  const html=readFileSync(path.join(out,file),'utf8');
  for(const match of html.matchAll(/(?:src|href|poster)="([^"#][^"]*)"/g)){
    const local=match[1].split(/[?#]/)[0].replace(/^\//,'') || 'index.html';
    if(!local.includes(':')&&!existsSync(path.join(out,local))&&!existsSync(path.join(out,local+'.html'))&&!['blog','events'].includes(local)&&!local.startsWith('blog/')) throw new Error(`Missing deployment asset: ${local}`);
  }
}
for(const match of (readFileSync('styles.css','utf8')+readFileSync('app-pages.css','utf8')).matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)){
  const local=match[1];
  if(!local.startsWith('#')&&!local.includes(':')&&!existsSync(path.join(out,local))) throw new Error(`Missing CSS asset: ${local}`);
}
const bundleBytes=readdirSync(out,{recursive:true}).reduce((total,file)=>{const item=path.join(out,file);return total+(statSync(item).isFile()?statSync(item).size:0)},0);
// The aggregate release-package limit applies to Sites. Direct Cloudflare
// deployments upload static assets individually; retain the per-file check above.
if(process.env.SITE_DEPLOY_TARGET!=='cloudflare'&&bundleBytes>255*1024*1024)throw new Error('Static output is too close to the 256 MiB release package limit.');
console.log('Static bundle bytes:',bundleBytes);
console.log('Static production bundle ready. YouTube previews load on visibility; THE REALM FINAL streams on demand. Fonts and carousel are local.');

import {writeFileSync} from 'node:fs';
writeFileSync('app/site-html.ts','export default '+JSON.stringify(readFileSync('index.html','utf8'))+';\n');

// Platform asset routing runs before the Worker. Serve documents through the
// Worker so the canonical-host redirect applies to every page, not only APIs.
writeFileSync('server/site-pages.json',JSON.stringify(Object.fromEntries(pages.map(file=>[file,readFileSync(file,'utf8')]))));
// Lossless packaging of repeated application shells; response HTML is unchanged.
writeFileSync('server/site-pages-packed.mjs','export default '+JSON.stringify(gzipSync(readFileSync('server/site-pages.json'),{level:9}).toString('base64'))+';\n');
for(const file of pages)rmSync(path.join(out,file));
// Journal and Events retain their existing shell and presentation. Their content
// and navigation are maintained independently; do not regenerate from the redesign.
