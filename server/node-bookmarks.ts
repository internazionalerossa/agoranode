import type {Connections} from './database';
import {PostgresDatabase} from './database';
import type {PublicSpaceSeed} from '../app/platform/public-space-seed';

const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'private, no-store',vary:'cookie'}});
const clean=(value:unknown,min:number,max:number):value is string=>
 typeof value==='string'&&value.length>=min&&value.length<=max&&!/[\u0000-\u001f]/.test(value);
const webUrl=(value:string)=>{
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&url.href.length<=1200;}
 catch{return false;}
};
/** Every operation is private and scoped to session owner and installed node. */
export async function handleNodeBookmarks(request:Request,pool:Connections,seed:PublicSpaceSeed,userId:string|null):Promise<Response>{
 const url=new URL(request.url),spaceId=seed.spaceId;
 if(url.pathname!=='/api/node-bookmarks'||url.searchParams.getAll('spaceId').length!==1||
  url.searchParams.get('spaceId')!==spaceId||[...url.searchParams.keys()].some(k=>k!=='spaceId'))
  return reply({error:'Invalid node'},400);
 if(!userId)return reply({error:'Sign in as PR1 to manage personal article saves'},401);
 if(request.method==='GET'){
  try{
   const rows=await pool.query('SELECT article_id,source_id,title,link,excerpt,saved_at FROM node_personal_article_bookmarks WHERE space_id=$1 AND owner_key=$2 ORDER BY saved_at DESC LIMIT 500',[spaceId,userId]);
   return reply({spaceId,bookmarks:rows.rows});
  }catch{return reply({error:'Personal bookmark store unavailable'},503);}
 }
 if(!['PUT','DELETE'].includes(request.method))return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
  return reply({error:'Invalid origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))
  return reply({error:'JSON required'},415);
 let data:unknown;
 try{
  const body=await request.text();
  if(Buffer.byteLength(body,'utf8')>3000)return reply({error:'Payload too large'},413);
  data=JSON.parse(body);
 }catch{return reply({error:'Invalid JSON'},400);}
 if(!data||typeof data!=='object'||Array.isArray(data))return reply({error:'Invalid bookmark'},400);
 const fields=data as Record<string,unknown>;
 if(!clean(fields.articleId,1,256))return reply({error:'Invalid article ID'},400);
 if(request.method==='DELETE'){
  if(Object.keys(fields).sort().join(',')!=='articleId')return reply({error:'Invalid delete'},400);
  try{
   await pool.query('DELETE FROM node_personal_article_bookmarks WHERE space_id=$1 AND owner_key=$2 AND article_id=$3',[spaceId,userId,fields.articleId]);
   return reply({ok:true});
  }catch{return reply({error:'Bookmark removal unavailable'},503);}
 }
 if(Object.keys(fields).sort().join(',')!=='articleId,excerpt,link,sourceId,title'||
  !clean(fields.sourceId,1,128)||!clean(fields.title,1,300)||
  !clean(fields.link,1,1200)||!webUrl(fields.link)||
  !clean(fields.excerpt,0,600)||
  !seed.sources.some(x=>spaceId+':'+x.id===fields.sourceId))
  return reply({error:'Invalid article or unauthorized node source'},400);
 try{
  const db=new PostgresDatabase(pool);
  const added=await db.batch([db.prepare(
   'INSERT INTO node_personal_article_bookmarks(space_id,owner_key,article_id,source_id,title,link,excerpt)'+
   ' SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM node_personal_article_bookmarks'+
   ' WHERE space_id=? AND owner_key=?)<500'+
   ' ON CONFLICT(space_id,owner_key,article_id) DO UPDATE SET'+
   ' source_id=excluded.source_id,title=excluded.title,link=excluded.link,excerpt=excluded.excerpt'+
   ' RETURNING article_id').bind(spaceId,userId,fields.articleId,fields.sourceId,fields.title,fields.link,fields.excerpt,spaceId,userId)]);
  return added[0]?.results.length?reply({ok:true}):reply({error:'Personal bookmark limit reached'},429);
 }catch{return reply({error:'Bookmark save unavailable'},503);}
}
