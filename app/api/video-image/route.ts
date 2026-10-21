import { videoChannel } from '@/app/data/video-catalog';
import { fetchPublicPhotoResource, readLimited } from '@/app/lib/article-photo';
import { createBoundedCache } from '@/app/lib/bounded-cache';
import { validateVideos } from '@/app/lib/videos';
import { GET as readVideos } from '../videos/route';
import {instanceUserAgent} from '@/app/lib/instance';

export const dynamic = 'force-dynamic';
const cache = createBoundedCache<string, {until:number;bytes:Uint8Array;type:string}>(80, 8000000, value=>value.bytes.byteLength);
let active=0;
const fail=(status:number)=>new Response(null,{status,headers:{'cache-control':'no-store'}});
const reply=(entry:{bytes:Uint8Array;type:string})=>new Response(entry.bytes as unknown as BodyInit,{headers:{'content-type':entry.type,'cache-control':'public, max-age=600','x-content-type-options':'nosniff'}});

/** Thumbnail destinations are derived from the catalogue, never from a supplied URL. */
export async function GET(request:Request, fetcher:typeof fetch=fetch):Promise<Response>{
 if(request.method!=='GET')return fail(405);
 const params=new URL(request.url).searchParams, channel=videoChannel(params.get('channel')??''), id=params.get('id')??'';
 if(!channel||params.getAll('channel').length!==1||params.getAll('id').length!==1||[...params.keys()].some(key=>!['channel','id'].includes(key))||!(channel.platform==='youtube'?/^[\w-]{11}$/:/^[\da-f-]{36}$/).test(id))return fail(400);
 const key=channel.id+':'+id, old=cache.get(key);
 if(old&&old.until>Date.now())return reply(old);
 if(active>=8)return fail(503);
 active++;
 try{
  let targets:string[]=[];
  if(channel.platform==='youtube')targets=[`https://i.ytimg.com/vi/${id}/mqdefault.jpg`,`https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
  else{
   const listing=await readVideos(new Request(new URL('/api/videos?'+new URLSearchParams({channel:channel.id}),request.url)));
   const data=await listing.json();
   const video=validateVideos(data.videos).find(item=>item.id===id&&item.channel===channel.id);
   if(video?.image)targets=[video.image];
  }
  for(const target of targets){
   try{
    const url=new URL(target);
    // This fixed header set excludes the visitor's cookies, IP and user agent.
    const response=await fetchPublicPhotoResource(url,AbortSignal.timeout(6000),{accept:'image/jpeg,image/png,image/webp','user-agent':instanceUserAgent('public thumbnails')},fetcher,url.hostname.replace(/^www\./,''));
    const type=response.headers.get('content-type')?.split(';')[0].trim()??'';
    if(!response.ok||!/^image\/(jpeg|png|webp|avif)$/.test(type)){await response.body?.cancel();continue;}
    const bytes=await readLimited(response,600000);
    if(!bytes.length)continue;
    const entry={bytes,type,until:Date.now()+600000};cache.set(key,entry);return reply(entry);
   }catch{/* A thumbnail is optional; the video link remains available. */}
  }
  return fail(404);
 }catch{return fail(503);}finally{active--;}
}
