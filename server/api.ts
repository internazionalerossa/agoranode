import {handlePrivacyExport} from '../app/lib/privacy-export';
import {brandManifestResponse} from '../app/lib/brand-manifest';
import {handleLiveChat} from './live-chat';
import {visitorCountryResponse} from '../app/lib/visitor-country';
import {GET as articles} from '../app/api/articles/route';
import {GET as videoImage} from '../app/api/video-image/route';
import {GET as videos} from '../app/api/videos/route';
import {GET as highlights} from '../app/api/highlights/route';
import {GET as pulse} from '../app/api/pulse/route';
import {GET as sources} from '../app/api/sources/route';
import {GET as photo} from '../app/api/article-image/route';
import {POST as translate} from '../app/api/translate/route';
import {SOURCE_CATALOG} from '../app/data/catalog';
import {THEORY_LIBRARY} from '../app/data/library';
import {createArticlePhotoStore,createPublicNewsStore} from '../app/lib/public-news-store';
import {publicDataResponse} from '../app/lib/public-data-cache';
import {handleBookmarks,type BookmarkDatabase} from '../app/lib/bookmarks';
import {handleReadingProgress} from '../app/lib/reading-progress';
import {handleCommunity} from '../app/lib/community';
import {handleForum} from '../app/lib/forum';
import {readBook} from '../app/lib/book-reader';
import type {PostgresDatabase} from './database';
const sourceIds=new Set(SOURCE_CATALOG.map(s=>s.id)),bookIds=new Set(THEORY_LIBRARY.map(b=>b.id));
const publicEndpoints:Record<string,(r:Request)=>Promise<Response>>={'/api/articles':articles,'/api/videos':videos,'/api/highlights':highlights,'/api/pulse':pulse};
export const privatePaths=new Set(['/api/privacy/export','/api/bookmarks','/api/reading-progress','/api/library/read','/api/community','/api/community/mine','/api/community/forum','/api/community/chat','/api/community/chat-image']);
export async function api(request:Request,db:PostgresDatabase,userId:string|null,bootstrapHash:string|undefined,background:(p:Promise<unknown>)=>void,participationOpen=true):Promise<Response>{
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/manifest')return brandManifestResponse(request);
 if(path==='/api/visitor-country')return visitorCountryResponse(request);
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store',vary:'cookie'}});
 if(request.method==='POST'&&privatePaths.has(path)&&request.headers.get('origin')!==url.origin)return reply({error:'Invalid origin'},403);
 if(path==='/api/privacy/export')return handlePrivacyExport(request,db,userId);
 if(path==='/api/bookmarks')return handleBookmarks(request,db as unknown as BookmarkDatabase,userId,bookIds);
 if(path==='/api/reading-progress')return handleReadingProgress(request,db,userId,'/account?return_to=%2Fread');
 if(path==='/api/community/chat'||path==='/api/community/chat-image')return handleLiveChat(request,db,userId,undefined,participationOpen);
 if(path==='/api/community/forum'){
  if(request.method==='POST'&&!participationOpen)return reply({error:'Adesioni, interventi e votazioni sono temporaneamente chiusi.'},503);
  const response=await handleForum(request,db,userId,bootstrapHash);
  if(request.method==='GET'&&(url.searchParams.get('kind')??'board')==='board'&&response.ok)return reply({...await response.json(),participationOpen});
  return response;
 }
 if(path==='/api/community'||path==='/api/community/mine'){
  if(request.method==='POST'&&userId)return reply({error:'Le nuove discussioni sono disponibili nel forum della comunità.'},409);
  return handleCommunity(request,db,userId,'/account?return_to=%2F%3Fview%3Dpartecipa');
 }
 if(path==='/api/library/read'){
  if(!userId)return reply({authenticated:false,signInUrl:'/account?return_to='+encodeURIComponent('/read'+url.search)},401);
  if(request.method!=='GET')return reply({error:'Method not allowed'},405);
  if([...url.searchParams.keys()].some(key=>!['bookId','edition','chapter'].includes(key)||url.searchParams.getAll(key).length>1))return reply({error:'Invalid request'},400);
  const bookId=url.searchParams.get('bookId')??'',edition=url.searchParams.get('edition')??'',chapter=Number(url.searchParams.get('chapter')??0);
  if(!Number.isSafeInteger(chapter)||chapter<0||chapter>255||!THEORY_LIBRARY.some(b=>b.id===bookId&&b.editions?.some(e=>e.language===edition)))return reply({error:'Invalid edition or chapter'},400);
  try{return reply(await readBook(bookId,edition,chapter));}catch(error){return reply({error:error instanceof RangeError?'Capitolo non disponibile':'Edizione temporaneamente non disponibile. Puoi aprire l’archivio originale.'},error instanceof RangeError?400:503);}
 }
 if(path==='/api/translate')return request.method==='POST'?translate(request):reply({error:'Method not allowed'},405);
 if(path==='/api/video-image')return videoImage(request);
 if(path==='/api/sources')return request.method==='GET'?sources():reply({error:'Method not allowed'},405);
 if(path==='/api/article-image')return request.method==='GET'?photo(request,(source,id)=>createArticlePhotoStore(db,sourceIds).find(source,id)):reply({error:'Method not allowed'},405);
 if(publicEndpoints[path])return request.method==='GET'?publicDataResponse(request,{cache:createPublicNewsStore(db,sourceIds),load:()=>publicEndpoints[path](request),waitUntil:background}):reply({error:'Method not allowed'},405);
 return reply({error:'Not found'},404);
}
