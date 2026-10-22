import {AGORA_SOURCES,AGORA_SOURCE_IDS} from '../app/instances/agora-sources';
import {fetchSource,type ArticleRecord,type SourceFetchResult} from '../app/lib/feed';
import type {SourceDefinition} from '../app/data/catalog';

/** Public, allowlisted, bounded thematic feed. No visitor URL is ever fetched. */
export async function agoraFeedResponse(
 request:Request,loader:(source:SourceDefinition,limit:number)=>Promise<SourceFetchResult>=fetchSource,
):Promise<Response>{
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{
   'cache-control':status===200?'public, max-age=120':'no-store',
   'x-content-type-options':'nosniff',
 }});
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 const url=new URL(request.url);
 if([...url.searchParams.keys()].some(key=>key!=='sourceIds')||
    url.searchParams.getAll('sourceIds').length>1)return reply({error:'Invalid filters'},400);
 const ids=url.searchParams.get('sourceIds');
 const selected=ids===null?AGORA_SOURCES.map(x=>x.id):ids.split(',');
 if(selected.length===0||selected.length>AGORA_SOURCES.length||
    selected.some(id=>!AGORA_SOURCE_IDS.has(id))||new Set(selected).size!==selected.length)
   return reply({error:'Unknown source'},400);
 const wanted=new Set(selected),sources=AGORA_SOURCES.filter(source=>wanted.has(source.id));
 const fetched=await Promise.allSettled(sources.map(source=>loader(source,24)));
 const items:ArticleRecord[]=[];
 const statuses:Array<{sourceId:string;ok:boolean}>=[];
 for(let index=0;index<fetched.length;index++){
   const result=fetched[index];
   if(result.status!=='fulfilled'){statuses.push({sourceId:sources[index].id,ok:false});continue;}
   statuses.push({sourceId:sources[index].id,ok:result.value.status.ok});
   items.push(...result.value.articles.filter(article=>article.sourceId===sources[index].id));
 }
 const seen=new Set<string>();
 const articles=items.filter(article=>{
   if(seen.has(article.link))return false;
   seen.add(article.link);return true;
 }).sort((a,b)=>(Date.parse(b.publishedAt??'')||0)-(Date.parse(a.publishedAt??'')||0)).slice(0,150);
 return reply({spaceId:'agora',generatedAt:new Date().toISOString(),
   sourceCount:sources.length,articles,statuses});
}
