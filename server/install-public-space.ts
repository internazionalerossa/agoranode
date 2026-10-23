/**
 * Explicit bootstrap utility: convert an exported Node Studio draft into a
 * PUBLIC read-only themed site manifest in the operator's chosen directory.
 * It does not create databases, grant PR2, fetch third-party books or enable
 * public edits. Review licenses, sources and personal data BEFORE invocation.
 */
import {open,readFile,mkdir,link,unlink} from 'node:fs/promises';
import {join,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPublicSpaceSeed} from '../app/platform/public-space-seed';

export async function installPublicSpace(draftPath:string,directory:string){
 const stat=await (await import('node:fs/promises')).stat(draftPath);
 if(stat.size>64_000||!stat.isFile())throw Error('Invalid or oversized node draft');
 const raw=JSON.parse(await readFile(draftPath,'utf8'));
 const seed=createPublicSpaceSeed(raw);
 if(!isAbsolute(directory))throw Error('Public spaces directory must be absolute');
 await mkdir(directory,{recursive:true,mode:0o755});
 const destination=join(directory,seed.spaceId+'.json');
 const scratch=join(directory,'.'+seed.spaceId+'.'+crypto.randomUUID()+'.tmp');
 const file=await open(scratch,'wx',0o600);
 try{
  await file.writeFile(JSON.stringify(seed,null,2)+'\n','utf8');
  await file.sync();
 }finally{await file.close();}
 try{
  // Hard-link installation is atomic and refuses to overwrite another node.
  await link(scratch,destination);
 }finally{await unlink(scratch);}
 return {spaceId:seed.spaceId,destination};
}
async function main(){
 const [, , confirmation,draftFile,outputDirectory]=process.argv;
 if(confirmation!=='--confirm-public-readonly'||!draftFile||!outputDirectory){
  throw Error('Usage: space:install --confirm-public-readonly blueprint.json /absolute/space-directory');
 }
 const result=await installPublicSpace(resolve(draftFile),outputDirectory);
 process.stdout.write('Installed public read-only node: '+result.spaceId+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{console.error(error instanceof Error?error.message:'Installation failed');process.exitCode=1;});
}
