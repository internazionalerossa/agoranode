import {isAppShellPath} from './site-routing';

/**
 * Render's static CDN currently returns 404 for direct /agora or /polisrossa
 * requests. Static-only previews use the root path with an explicit page
 * selector so deep links can be opened and refreshed without a server rewrite.
 *
 * This adapter MUST NOT be enabled in authenticated/full Node deployments.
 */
const KEY='previewPath';
const KNOWN_ROOT_POLISROSSA=new Set([
 'view','storia','evento','persona','knowledgeKind','knowledgeId',
 'percorso','indicatore','stanza','proposal',
]);
function validPath(path:string){
 return isAppShellPath(path)&&path!=='/agoranode'&&path!=='/agoranode/';
}
export function staticPreviewHref(raw:string,origin='https://preview.invalid'):string|null{
 let url:URL;
 try{url=new URL(raw,origin);}catch{return null;}
 if(url.origin!==origin)return null;
 let path=url.pathname;
 if(path==='/'&&!url.searchParams.has(KEY)){
  if([...url.searchParams.keys()].some(key=>KNOWN_ROOT_POLISROSSA.has(key))){
   path='/polisrossa';
  }else return null;
 }
 if(path==='/agoranode'||path==='/agoranode/')path='/';
 if(url.searchParams.has(KEY)){
  const selected=url.searchParams.get(KEY)??'';
  if(!validPath(selected))return null;
  path=selected;
 }
 if(!validPath(path)||path==='/')return null;
 const params=new URLSearchParams(url.searchParams);
 params.delete(KEY);
 const next=new URL('/',origin);
 next.searchParams.set(KEY,path.replace(/\/+$/,''));
 for(const [key,value] of params)next.searchParams.append(key,value);
 next.hash=url.hash;
 return next.pathname+next.search+next.hash;
}
export function staticPreviewVirtualUrl(raw:string):string{
 const url=new URL(raw,'https://preview.invalid');
 if(url.pathname!=='/'||url.searchParams.getAll(KEY).length!==1)return url.href;
 const path=url.searchParams.get(KEY)??'';
 if(!validPath(path))return url.href;
 url.searchParams.delete(KEY);
 return new URL(path+url.search+url.hash,url.origin).href;
}

/** Only for unprivileged, public static previews: no passwords, tokens or roles. */
export function installStaticPreviewNavigation():void{
 const origin=location.origin;
 const rewrite=(value:string)=>staticPreviewHref(value,origin);
 const originalPush=history.pushState.bind(history);
 const originalReplace=history.replaceState.bind(history);
 history.pushState=(state,title,url)=>{
  const next=url===undefined?undefined:rewrite(String(url))??url;
  originalPush(state,title,next);
 };
 history.replaceState=(state,title,url)=>{
  const next=url===undefined?undefined:rewrite(String(url))??url;
  originalReplace(state,title,next);
 };
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||
     event.shiftKey||event.altKey)return;
  const target=event.target;
  const anchor=target instanceof Element?target.closest('a[href]'):null;
  if(!anchor||anchor.hasAttribute('download')||anchor.getAttribute('target')==='_blank')return;
  const href=anchor.getAttribute('href');
  if(!href||href.startsWith('#'))return;
  const next=rewrite(href);
  if(!next)return;
  event.preventDefault();
  location.assign(next);
 },true);
}
