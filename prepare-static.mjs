import {mkdirSync,copyFileSync,readFileSync,existsSync,statSync,rmSync,readdirSync} from 'node:fs';
import path from 'node:path';
const out=path.resolve('dist');
rmSync(out,{recursive:true,force:true});
mkdirSync(path.join(out,'assets'),{recursive:true});
const pages=['index.html','work.html','music.html','reviews.html','prices.html','stats.html','bio.html','process.html','careers.html','community.html','contact.html','privacy.html'];
const runtime=[...pages,'styles.css','app-pages.css','app.js','app-pages.js','music.js','glass-optics.js','social-reach.json','videos.json','reach.json','verified-video-reach.json','offers.json','music.json','manifest.webmanifest'];
for(const file of runtime) copyFileSync(file,path.join(out,file));
const realmAssets=readdirSync('assets/realm-final',{recursive:true}).filter(file=>statSync(path.join('assets/realm-final',file)).isFile()).map(file=>'realm-final/'+file);
const assets=[...realmAssets,'realm-final-poster.webp','vendor/hls-1.7.3.light.min.js','vendor/hls-LICENSE.txt','jamaal-portrait-480.webp','jamaal-portrait-900.webp','jamaal-alina.jpg','bio-team.jpg','star.svg','marble.svg','glass-frame-card.png','glass-frame-chip.png','jamaal-key.svg','jamaal-logo.svg','jamaal-logo-animated.svg','jamaal-wordmark.svg','hero-key.png','hero-key.webm','hero-key.mp4','hero-key-cream.mp4','hero-key-cream-poster.jpg','click-the-key.png','booking-recap.mp4','booking-recap-poster.jpg','platform-instagram.svg','platform-youtube.svg','platform-applemusic.svg','platform-icons-LICENSE.txt','manrope.ttf','barlow-condensed.ttf','instrument-serif-italic.ttf','manrope-OFL.txt','barlow-condensed-OFL.txt','instrument-serif-italic-OFL.txt',...Array.from({length:5},(_,i)=>`client-review-${i+1}.jpg`),'review-zora-original.jpg',...Object.keys(JSON.parse(readFileSync('videos.json'))).map(id=>`video-${id}.jpg`)];
assets.push(...readdirSync('assets').filter(f=>/^offer-.*\.svg$/.test(f)),...['discord','meta','square','distrokid','whop','cashapp'].map(n=>'platform-'+n+'.svg'),...readdirSync('assets/music-covers').map(f=>'music-covers/'+f));
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
    if(!local.includes(':')&&!existsSync(path.join(out,local))) throw new Error(`Missing deployment asset: ${local}`);
  }
}
for(const match of (readFileSync('styles.css','utf8')+readFileSync('app-pages.css','utf8')).matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)){
  const local=match[1];
  if(!local.startsWith('#')&&!local.includes(':')&&!existsSync(path.join(out,local))) throw new Error(`Missing CSS asset: ${local}`);
}
const bundleBytes=readdirSync(out,{recursive:true}).reduce((total,file)=>{const item=path.join(out,file);return total+(statSync(item).isFile()?statSync(item).size:0)},0);
if(bundleBytes>255*1024*1024)throw new Error('Static output is too close to the 256 MiB release package limit.');
console.log('Static bundle bytes:',bundleBytes);
console.log('Static production bundle ready. YouTube previews load on visibility; THE REALM FINAL streams on demand. Fonts and carousel are local.');
