import {nodeStudioDraft} from '../app/lib/node-studio-model';
import type {PostgresDatabase} from './database';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function boundedJson(request:Request):Promise<unknown>{
 const reader=request.body?.getReader();
 if(!reader)throw Error('Missing body');
 const chunks:Uint8Array[]=[];
 let bytes=0;
 try{
   for(;;){
     const {done,value}=await reader.read();
     if(done)break;
     bytes+=value.byteLength;
     if(bytes>64_000)throw Error('Draft exceeds limit');
     chunks.push(value);
   }
 }finally{reader.releaseLock();}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes)));
}
/** Private draft storage for authenticated PR1/PR2 users.
 * Publishing and creating communities is intentionally NOT available here.
 */
export async function handleNodeStudioDrafts(
 request:Request,db:PostgresDatabase,userId:string|null,
):Promise<Response>{
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{
   'cache-control':'private, no-store','vary':'cookie'}});
 if(!userId)return reply({error:'Sign in to store drafts in your account'},401);
 const url=new URL(request.url);
 if(request.method==='GET'){
   if(url.search)return reply({error:'Unexpected parameters'},400);
   try{
     const rows=(await db.prepare('SELECT body_json::text AS body FROM node_studio_drafts WHERE owner_id=? ORDER BY updated_at DESC LIMIT 20')
       .bind(userId).all()).results;
     const drafts=rows.map(row=>nodeStudioDraft(JSON.parse(String(row.body))));
     return reply({drafts});
   }catch{return reply({error:'Draft storage unavailable'},503);}
 }
 if(request.method!=='PUT'&&request.method!=='DELETE')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
   return reply({error:'Invalid origin'},403);
 if(request.method==='DELETE'){
   if([...url.searchParams.keys()].join(',')!=='draftId'||url.searchParams.getAll('draftId').length!==1)
     return reply({error:'Invalid draft id'},400);
   const draftId=url.searchParams.get('draftId')??'';
   if(!ID.test(draftId))return reply({error:'Invalid draft id'},400);
   try{
     await db.prepare('DELETE FROM node_studio_drafts WHERE owner_id=? AND draft_id=?::uuid').bind(userId,draftId).run();
     return reply({ok:true});
   }catch{return reply({error:'Delete failed'},503);}
 }
 if(url.search)return reply({error:'Unexpected parameters'},400);
 if(!request.headers.get('content-type')?.startsWith('application/json'))
   return reply({error:'JSON required'},415);
 let input:unknown;
 try{input=await boundedJson(request);}catch{return reply({error:'Invalid or oversized draft'},400);}
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).join(',')!=='draft')return reply({error:'Expected a single draft'},400);
 let draft;
 try{draft=nodeStudioDraft((input as {draft:unknown}).draft);}
 catch{return reply({error:'Invalid draft data'},400);}
 const final={...draft,updatedAt:Date.now()};
 try{
   const found=(await db.prepare('SELECT draft_id FROM node_studio_drafts WHERE owner_id=? ORDER BY updated_at DESC LIMIT 21')
     .bind(userId).all()).results;
   if(found.length>=20&&!found.some(row=>String(row.draft_id)===draft.draftId))
     return reply({error:'Draft limit reached. Delete an older draft first.'},409);
   await db.prepare('INSERT INTO node_studio_drafts(owner_id,draft_id,space_id,body_json) VALUES(?,?,?,?::jsonb) '+
     'ON CONFLICT(owner_id,draft_id) DO UPDATE SET space_id=excluded.space_id,'+
     'body_json=excluded.body_json,updated_at=now()')
     .bind(userId,draft.draftId,draft.spaceId,JSON.stringify(final)).run();
   return reply({ok:true,draft:final});
 }catch{return reply({error:'Draft save failed'},503);}
}
