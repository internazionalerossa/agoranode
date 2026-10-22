import {normaliseSourceChoices,validSpaceId} from '../app/lib/node-feed-preferences';
type Database={prepare(sql:string):{bind(...values:unknown[]):{
  first<T>():Promise<T|null>;
  run():Promise<unknown>;
}}};
export async function handleNodeFeedPreferences(
 request:Request,db:Database,userId:string|null,spaceId:string,allowed:ReadonlySet<string>,
):Promise<Response>{
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{
   'cache-control':'private, no-store','vary':'cookie'}});
 if(!validSpaceId(spaceId))return reply({error:'Unknown node'},404);
 if(!userId)return reply({authenticated:false,sourceIds:[]},401);
 if(request.method==='GET'){
   if(new URL(request.url).search)return reply({error:'Unexpected search parameters'},400);
   try{
     const row=await db.prepare('SELECT sources_json FROM node_feed_preferences WHERE owner_id=? AND space_id=?')
       .bind(userId,spaceId).first<{sources_json:unknown}>();
     const raw=typeof row?.sources_json==='string'?JSON.parse(row.sources_json):row?.sources_json;
     return reply({authenticated:true,sourceIds:normaliseSourceChoices(raw,allowed)});
   }catch{return reply({error:'Preferences temporarily unavailable'},503);}
 }
 if(request.method!=='PUT')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin||
    request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Invalid origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
 const raw=await request.text();
 if(raw.length>8192)return reply({error:'Preferences too large'},413);
 let data:unknown;
 try{data=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},400);}
 if(!data||typeof data!=='object'||Array.isArray(data)||
    Object.keys(data).sort().join(',')!=='sourceIds')return reply({error:'Invalid payload'},400);
 const sourceIds=(data as {sourceIds:unknown}).sourceIds;
 if(!Array.isArray(sourceIds)||sourceIds.length>250||
   sourceIds.some(id=>typeof id!=='string'||!allowed.has(id))||
   new Set(sourceIds).size!==sourceIds.length)return reply({error:'Unknown or repeated sources'},400);
 try{
   await db.prepare('INSERT INTO node_feed_preferences(owner_id,space_id,sources_json) VALUES (?,?,?::jsonb) '+
      'ON CONFLICT(owner_id,space_id) DO UPDATE SET sources_json=excluded.sources_json,updated_at=now()')
     .bind(userId,spaceId,JSON.stringify(sourceIds)).run();
   return reply({ok:true,authenticated:true,sourceIds});
 }catch{return reply({error:'Saving preferences failed'},503);}
}
