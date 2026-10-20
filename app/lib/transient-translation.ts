import {normalizeLanguage} from './translation.ts';
const pending:{run:()=>Promise<string>;resolve:(value:string|null)=>void;signal:AbortSignal}[]=[];let active=0;
function drain(){while(active<2&&pending.length){const task=pending.shift()!;if(task.signal.aborted){task.resolve(null);continue;}active++;void task.run().then(task.resolve,()=>task.resolve(null)).finally(()=>{active--;drain();});}}
function slices(value:string){const parts:string[]=[];for(let start=0;start<value.length;){let end=Math.min(start+1600,value.length);if(end<value.length){const space=value.lastIndexOf(' ',end);if(space>start+800)end=space+1;else if(/[\uD800-\uDBFF]/u.test(value[end-1]))end--;}parts.push(value.slice(start,end));start=end;}return parts;}
function queued(run:()=>Promise<string>,signal:AbortSignal){return new Promise<string|null>(resolve=>{if(signal.aborted){resolve(null);return;}const done=(value:string|null)=>{signal.removeEventListener('abort',abort);resolve(value);};const task={run,signal,resolve:done};const abort=()=>{const index=pending.indexOf(task);if(index>=0){pending.splice(index,1);done(null);}};pending.push(task);signal.addEventListener('abort',abort,{once:true});drain();});}

/** No cache, storage, provider fallback in the browser, or saved transcript. Links are never rewritten. */
export async function translateTransientText(text:string,from:string,to:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<string|null>{
 if(normalizeLanguage(from)===normalizeLanguage(to))return text;
 const chunks=text.split(/(https?:\/\/[^\s<>]+|\/(?:\?view=|read\?)[^\s<>]+|#[\p{L}\p{N}][\p{L}\p{N}_-]*)/gu);
 const translated=await Promise.all(chunks.map(async(part,index)=>{
  if(index%2||!/[\p{L}]/u.test(part))return part;
  const pieces=slices(part);
  const result=await Promise.all(pieces.map(piece=>queued(async()=>{if(signal.aborted)throw Error('Expired');const response=await fetcher('/api/translate',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({text:piece,from,to,temporary:true}),signal});const data=await response.json();if(!response.ok||typeof data.translatedText!=='string'||!data.translatedText.trim())throw Error('Translation unavailable');return (piece.match(/^\s*/u)?.[0]??'')+data.translatedText+(piece.match(/\s*$/u)?.[0]??'');},signal)));
  return result.some(value=>value===null)?null:result.join('');
 }));return translated.some(value=>value===null)?null:translated.join('');
}
