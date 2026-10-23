import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newNodeDraft} from '../app/lib/node-studio-model';
import {createPublicSpaceSeed,validatePublicSpaceSeed} from '../app/platform/public-space-seed';
import {publicSpaceSeedResponse,publicSpaceDirectoryResponse} from '../server/public-space-registry';
import {installPublicSpace} from '../server/install-public-space';
import {isAppShellPath,siteRouteFromUrl} from '../app/lib/site-routing';

function fixture(){
 const draft=newNodeDraft('create-node','storia-locale');
 draft.name='Storia della città';
 draft.topic='Eventi, patrimoni e fonti locali';
 draft.description='Una raccolta di fonti e documenti sulla storia della città.';
 draft.sources=[{id:'archivio',name:'Archivio pubblico',homepage:'https://example.org',feedUrl:'https://example.org/rss'}];
 draft.blocks=[{id:crypto.randomUUID(),kind:'timeline',title:'Primo evento',body:'Una breve narrazione storica da verificare con fonti.',url:'https://example.org/source'}];
 return draft;
}
test('operator-controlled install creates an isolated public node without publishing personal draft identifiers',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'agora-space-install-'));
 try{
  const draft=fixture(),input=join(dir,'draft.json'),seeds=join(dir,'spaces');
  await writeFile(input,JSON.stringify(draft));
  const result=await installPublicSpace(input,seeds);
  assert.equal(result.spaceId,'storia-locale');
  const raw=await readFile(join(seeds,'storia-locale.json'),'utf8');
  assert.doesNotMatch(raw,new RegExp(draft.draftId));
  assert.doesNotMatch(raw,/ownerId|password|session/i);
  assert.equal(validatePublicSpaceSeed(JSON.parse(raw)).blocks.length,1);
  await assert.rejects(installPublicSpace(input,seeds),/EEXIST/);
  const response=await publicSpaceSeedResponse(new Request('https://site.test/api/public-spaces/storia-locale'),seeds);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.spaceId,'storia-locale');
  assert.equal(body.sources[0].name,'Archivio pubblico');
  const directory=await publicSpaceDirectoryResponse(new Request('https://site.test/api/public-spaces'),seeds);
  assert.equal(directory.status,200);
  assert.deepEqual((await directory.json()).spaces.map((x:{spaceId:string})=>x.spaceId),['storia-locale']);
  assert.equal((await publicSpaceSeedResponse(new Request('https://site.test/api/public-spaces/other'),seeds)).status,404);
  assert.equal(isAppShellPath('/n/storia-locale'),true);
  assert.equal(isAppShellPath('/n/storia-locale/private'),false);
  assert.deepEqual(siteRouteFromUrl('/n/storia-locale'),{kind:'thematic-node',spaceId:'storia-locale',canonicalPath:'/n/storia-locale'});
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('node bootstrap denies unsupported roles, invalid names, symlinks and arbitrary URLs',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'agora-space-security-'));
 try{
  const draft=fixture();
  assert.throws(()=>createPublicSpaceSeed({...draft,operation:'edit-node'}),/Only a new space/);
  assert.throws(()=>createPublicSpaceSeed({...draft,spaceId:'polisrossa'}));
  const seed=createPublicSpaceSeed(draft);
  assert.throws(()=>validatePublicSpaceSeed({...seed,privateKey:'never-export'}),/Invalid public/);
  assert.throws(()=>validatePublicSpaceSeed({...seed,spaceId:'../path'}),/Invalid public/);
  assert.equal((await publicSpaceSeedResponse(new Request('https://site.test/api/public-spaces/../secret'),dir)).status,404);
  assert.equal((await publicSpaceSeedResponse(new Request('https://site.test/api/public-spaces/storia-locale',{method:'POST'}),dir)).status,405);
  assert.equal((await publicSpaceDirectoryResponse(new Request('https://site.test/api/public-spaces?debug=1'),dir)).status,400);
  await writeFile(join(dir,'outside.json'),JSON.stringify(seed));
  await symlink(join(dir,'outside.json'),join(dir,'storia-locale.json'));
  assert.equal((await publicSpaceSeedResponse(new Request('https://site.test/api/public-spaces/storia-locale'),dir)).status,404);
 }finally{await rm(dir,{recursive:true,force:true});}
});
