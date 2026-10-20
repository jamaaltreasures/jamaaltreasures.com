import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Run the shipped script, including its actual iframe and document click
// handlers. This small DOM fixture supplies only the nodes the router needs;
// real-browser and real-device checks cover rendering and native navigation.
const source=readFileSync(new URL('../app-pages.js',import.meta.url),'utf8');
const origin='https://jamaaltreasures.com';
function fixture({standalone=false,path='/'}={}){
 const makeNode=(id='')=>({id,hidden:false,style:{},dataset:{},children:[],listeners:{},classList:{toggle(){}},
  append(node){this.children.push(node)},replaceChildren(){this.children=[]},
  setAttribute(){},removeAttribute(){},hasAttribute(){return false},focus(){},
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn)},
  querySelector(){return null},querySelectorAll(){return []},contains(){return false}});
 const main=makeNode('main'),home=makeNode('home'),work=makeNode('work'),menu=makeNode(),toggle=makeNode();menu.hidden=true;
 const canonical=makeNode(),schema=makeNode(),body=makeNode();body.dataset.page=standalone?'dessert-wars-orlando':'home';
 const document={...makeNode(),body,title:standalone?'Article title':'Home title',head:makeNode(),
  createElement:()=>makeNode(),dispatchEvent(){},
  getElementById(id){return [home,work,main,...main.children].find(n=>n.id===id)||null},
  querySelector(selector){return ({'#main':main,'#site-menu':menu,'#menu-toggle':toggle,'link[rel=canonical]':canonical,'#page-schema':schema,'.app-page':standalone?null:home})[selector]||null},
  querySelectorAll(selector){return selector==='.app-page'?[...(standalone?[]:[home,work]),...main.children]:[]}};
 const assignments=[],pushes=[],windowEvents={};
 const location={href:origin+path,origin,assign(url){assignments.push(url)}};
 const sandbox={document,location,window:{},URL,URLSearchParams,AbortController,console,
  history:{pushState(_state,_title,path){pushes.push(path);location.href=origin+path}},
  CustomEvent:class{},ResizeObserver:class{observe(){}},scrollTo(){},scrollY:0,
  requestAnimationFrame(fn){fn()},addEventListener(name,fn){windowEvents[name]=fn}};
 vm.runInNewContext(source,sandbox);
 function click(doc,path,extra={}){
  const link={href:new URL(path,location.href).href,target:'',hasAttribute(){return false},...extra};
  const event={defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...extra,target:{closest:selector=>selector==='a[href]'?link:null}};
  for(const fn of doc.listeners.click||[])fn(event);
  return event;
 }
 function eventsFrame(){
  click(document,'/events');
  const reading=main.children.find(n=>n.id==='reading-page'),frame=reading.children[0];
  const doc={...makeNode(),title:'Event Radar',documentElement:{scrollHeight:800},body:makeNode()};
  frame.contentDocument=doc;for(const fn of frame.listeners.load)fn();return doc;
 }
 return {document,body,home,work,main,click,eventsFrame,assignments,pushes,windowEvents,router:sandbox.window.JTPages};
}

test('Home → embedded Events → article loads the real document without a fake article history entry',()=>{
 for(const path of ['/dessert-wars-orlando','/dessert-wars-orlando/','/dessert-wars-orlando.html','/articles','/articles/']){
  const f=fixture(),frame=f.eventsFrame();
  assert.equal(f.click(frame,path).defaultPrevented,true);
  assert.deepEqual(f.assignments,[origin+path]);
  assert.deepEqual(f.pushes,['/events']);
  assert.equal(f.home.hidden,true);
 }
});

test('unknown, nested lookalike and protected standalone destinations cannot resolve as Home',()=>{
 for(const path of ['/unknown','/unknown#home','/nested/index','/nested/work','/updatefromyourphone']){
  const f=fixture();assert.equal(f.router.resolve(new URL(origin+path)),null);
  f.click(f.eventsFrame(),path);assert.deepEqual(f.assignments,[origin+path]);
 }
});

test('iframe page anchors, flyers, external links and modified clicks retain native behavior',()=>{
 for(const [path,extra] of [['/events#book-coverage',{}],['/events/flyer/example.jpg',{}],['https://example.org/',{}],['/dessert-wars-orlando',{metaKey:true}],['/dessert-wars-orlando',{target:'_blank'}]]){
  const f=fixture();assert.equal(f.click(f.eventsFrame(),path,extra).defaultPrevented,false);assert.deepEqual(f.assignments,[]);
 }
});

test('registered shell routes still navigate within the existing document',()=>{
 const f=fixture();f.click(f.eventsFrame(),'/work');
 assert.deepEqual(f.pushes,['/events','/work']);assert.deepEqual(f.assignments,[]);
 assert.equal(f.body.dataset.page,'work');assert.equal(f.work.hidden,false);assert.equal(f.home.hidden,true);
});

test('direct standalone article keeps its title and native navigation',()=>{
 const f=fixture({standalone:true,path:'/dessert-wars-orlando'});
 assert.equal(f.document.title,'Article title');assert.equal(f.body.dataset.page,'dessert-wars-orlando');
 for(const path of ['/','/work','/events','/blog'])assert.equal(f.click(f.document,path).defaultPrevented,false);
 assert.deepEqual(f.pushes,[]);assert.deepEqual(f.assignments,[]);assert.equal(f.windowEvents.popstate,undefined);
});

test('a history entry outside the router is handed to the server, never rendered as Home',()=>{
 const f=fixture();f.router.render(new URL(origin+'/dessert-wars-orlando'),true);
 assert.deepEqual(f.assignments,[origin+'/dessert-wars-orlando']);
});
