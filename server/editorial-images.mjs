const tool=(name,file,sourceUrl)=>({src:'/assets/tool-brands/'+file,alt:name+' logo',subject:name,kind:'logo',sourceUrl,credit:name+' · official brand artwork'});
export const editorialImages={
 'manychat-turn-comments-into-a-useful-dm':tool('Manychat','manychat.jpg','https://apps.apple.com/us/app/manychat/id1460129210'),
 'instagram-edits-cleaner-video-workflow':tool('Instagram Edits','edits.jpg','https://apps.apple.com/us/app/edits-video-editor/id6738967378'),
 'capcut-export-check-before-posting':tool('CapCut','capcut.jpg','https://apps.apple.com/us/app/capcut-photo-video-editor/id1500855883'),
 'heygen-make-your-script-sound-natural':tool('HeyGen','heygen.svg','https://www.heygen.com/brand-kit'),
 'muse-for-small-business-review-a-content-plan':tool('Muse for Small Business','muse.svg','https://muse.ai/business'),
 'beatviz-ai-director-full-song-workflows':tool('BeatViz','beatviz.jpg','https://beatviz.ai/'),
 'plan-event-video-coverage-florida':{src:'/assets/editorial/event-crowd-nicholas-green.webp',alt:'Fans cheering together at a live concert',subject:'Event coverage',kind:'photo',sourceUrl:'https://unsplash.com/photos/excited-crowd-cheering-at-concert-or-event-nPz8akkUmDI',credit:'Representative event image · Nicholas Green / Unsplash',showCredit:true},
 'plan-your-music-video-shoot':{src:'/assets/video-REx9OC8aBxI.jpg',alt:'Rayy Dubb in The Rain music video',subject:'Music video planning',kind:'photo',sourceUrl:'https://www.youtube.com/watch?v=REx9OC8aBxI',credit:'The Rain · Rayy Dubb · directed by CimtexPro'},
 'ai-music-reel-or-filmed-video':{src:'/assets/realm-final-poster.webp',alt:'An imaginative landscape from THE REALM',subject:'AI films and filmed music videos',kind:'photo',sourceUrl:'https://jamaaltreasures.com/',credit:'THE REALM · a cinematic AI film by Jamaal Treasures'},
 'cover-art-checklist-for-your-next-single':{src:'/assets/music-covers/8a7486748368ecdf.webp',alt:'THE FIRE by Oracle Gemini, release artwork',subject:'Cover art',kind:'cover',sourceUrl:'https://jamaaltreasures.com/music',credit:'THE FIRE · Oracle Gemini'},
 'connect-brand-video-to-a-clear-next-step':{src:'/assets/jamaal-treasures-star-wordmark.webp',alt:'Jamaal Treasures star wordmark',subject:'Your brand and its next step',kind:'logo',sourceUrl:'https://jamaaltreasures.com/',credit:'Jamaal Treasures brand artwork'}
};
export function articleImage(article){
 const candidate=article.image||editorialImages[article.slug];
 if(!candidate?.src||!candidate.alt)return null;
 const local=/^\/assets\/[a-zA-Z0-9_./-]+$/.test(candidate.src)&&!candidate.src.includes('..');
 let publicHTTPS=false;try{const u=new URL(candidate.src);publicHTTPS=u.protocol==='https:'&&!u.username&&!u.password}catch{}
 return local||publicHTTPS?{...candidate,kind:['logo','photo','cover'].includes(candidate.kind)?candidate.kind:'photo'}:null;
}
