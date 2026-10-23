import {open,readdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute,join} from 'node:path';
import {validatePublicSpaceSeed} from '../app/platform/public-space-seed';

const SPACE=/^[a-z][a-z0-9-]{2,47}$/;

/**
 * Read-only public endpoint. Never resolve arbitrary paths from the user and
 * never expose Studio account drafts, databases, keys, or directories.
 * Only operator-installed, validated JSON seeds are eligible.
 */
export async function publicSpaceSeedResponse(request:Request,directory?:string):Promise<Response>{
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:{...headers,allow:'GET'}});
 const url=new URL(request.url);
 if(url.search||url.hash||!directory||!isAbsolute(directory))return Response.json({error:'Not found'},{status:404,headers});
 const match=/^\/api\/public-spaces\/([a-z][a-z0-9-]{2,47})$/.exec(url.pathname);
 if(!match||!SPACE.test(match[1])||['agora','polisrossa'].includes(match[1]))
  return Response.json({error:'Not found'},{status:404,headers});
 const file=join(directory,match[1]+'.json');
 try{
  // Prevent following a symlink even when switched between stat and read.
  const handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  let body:string;
  try{
   const meta=await handle.stat();
   if(!meta.isFile()||meta.size>64_000)throw Error('Invalid public space file');
   body=await handle.readFile({encoding:'utf8'});
   if(Buffer.byteLength(body,'utf8')!==meta.size)throw Error('Public space file changed during read');
  }finally{await handle.close();}
  const seed=validatePublicSpaceSeed(JSON.parse(body));
  if(seed.spaceId!==match[1])throw Error('Namespace mismatch');
  return Response.json(seed,{headers});
 }catch{
  return Response.json({error:'Public community not provisioned'},{status:404,headers});
 }
}


/** Directory contains only operator-installed public seeds, never user drafts. */
export async function publicSpaceDirectoryResponse(request:Request,directory?:string):Promise<Response>{
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:{...headers,allow:'GET'}});
 if(new URL(request.url).search)return Response.json({error:'Invalid request'},{status:400,headers});
 if(!directory)return Response.json({spaces:[]},{headers});
 if(!isAbsolute(directory))return Response.json({error:'Invalid server configuration'},{status:503,headers});
 try{
  const entries=await readdir(directory,{withFileTypes:true});
  if(entries.length>100)throw Error('Too many space seed files');
  const spaces:Array<{spaceId:string;name:string;topic:string;description:string;href:string}>=[];
  for(const item of entries){
   if(!item.isFile()||!/^([a-z][a-z0-9-]{2,47})\.json$/.test(item.name))continue;
   const spaceId=item.name.slice(0,-5);
   const response=await publicSpaceSeedResponse(new Request('https://site.invalid/api/public-spaces/'+spaceId),directory);
   if(!response.ok)continue;
   const manifest=await response.json() as {spaceId:string;name:string;topic:string;description:string};
   spaces.push({spaceId,name:manifest.name,topic:manifest.topic,description:manifest.description,href:'/n/'+spaceId});
  }
  return Response.json({spaces:spaces.sort((a,b)=>a.name.localeCompare(b.name,'it'))},{headers});
 }catch{return Response.json({error:'Public space directory unavailable'},{status:503,headers});}
}
