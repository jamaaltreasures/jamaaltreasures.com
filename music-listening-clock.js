/* Counts actual playback time, independent of seeks and track changes. */
(() => {
 class ListeningClock {
  constructor({total=0,shown=false,threshold=30*60*1000}={}){this.total=Math.max(0,Number(total)||0);this.shown=Boolean(shown);this.threshold=threshold;this.last=null;this.active=false}
  tick(now,active){if(this.last!==null&&this.active)this.total+=Math.max(0,now-this.last);this.last=now;this.active=Boolean(active);return this.total>=this.threshold&&!this.shown}
  consume(){if(this.total<this.threshold||this.shown)return false;this.shown=true;return true}
  snapshot(){return {total:this.total,shown:this.shown}}
 }
 globalThis.JTListeningClock=ListeningClock;
})();
