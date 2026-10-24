import type {SourceDefinition} from '../app/data/catalog';
import {fetchSource,type ArticleRecord,type SourceFetchResult} from '../app/lib/feed';
import type {PublicSpaceSeed} from '../app/platform/public-space-seed';

/** Read-only RSS proxy for operator-installed source lists, never visitor URLs. */
export async function publicSpaceFeedResponse(
 request:Request,seed:PublicSpaceSeed,
 loader:(source:SourceDefinition,limit:number)=>Promise<SourceFetchResult>=fetchSource,
):Promise<Response>{
 const respond=(value:unknown,status=200)=>Response.json(value,{status,headers:{
  'cache-control':status===200?'public, max-age=120':'no-store',
  'x-content-type-options':'nosniff',
 }});
 if(request.method!=='GET')return respond({error:'Method not allowed'},405);
 const url=new URL(request.url);
 if(url.pathname!=='/api/public-spaces/'+seed.spaceId+'/feed'||
    [...url.searchParams.keys()].some(key=>key!=='sourceIds')||
    url.searchParams.getAll('sourceIds').length>1)
  return respond({error:'Invalid feed request'},400);
 const known=new Map(seed.sources.filter(s=>s.feedUrl).map(s=>[s.id,s]));
 const requested=url.searchParams.get('sourceIds');
 const ids=requested===null?[...known.keys()]:requested.split(',');
 if(ids.length>30||new Set(ids).size!==ids.length||ids.some(id=>!known.has(id)))
  return respond({error:'Invalid source selection'},400);
 const selection=ids.map(id=>known.get(id)!);
 const result:ArticleRecord[]=[];
 const statuses:Array<{sourceId:string;ok:boolean}>=[];
 // Bound concurrent remote requests, keeping cross-source memory and sockets
 // independent of the number of configured sources.
 for(let offset=0;offset<selection.length;offset+=4){
  const chunk=selection.slice(offset,offset+4);
  const fetched=await Promise.allSettled(chunk.map(item=>{
   const source:SourceDefinition={
    id:seed.spaceId+':'+item.id,name:item.name,homepage:item.homepage,
    feedUrls:[item.feedUrl],region:'Mondo',country:'Non specificato',
    language:'it',kind:'giornale',ideologies:[],tags:[],priority:0,
   };
   return loader(source,15);
  }));
  fetched.forEach((response,i)=>{
   const key=seed.spaceId+':'+chunk[i].id;
   if(response.status==='rejected'){statuses.push({sourceId:key,ok:false});return;}
   statuses.push({sourceId:key,ok:response.value.status.ok});
   result.push(...response.value.articles.filter(article=>article.sourceId===key));
  });
 }
 const seen=new Set<string>();
 const articles=result.filter(item=>{
  if(seen.has(item.link))return false;
  seen.add(item.link);return true;
 }).sort((a,b)=>(Date.parse(b.publishedAt??'')||0)-(Date.parse(a.publishedAt??'')||0)).slice(0,180);
 return respond({spaceId:seed.spaceId,articles,statuses,sourceCount:selection.length});
}
