import {open} from 'node:fs/promises';
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
