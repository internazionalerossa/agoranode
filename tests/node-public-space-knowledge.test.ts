import test from 'node:test';
import assert from 'node:assert/strict';
import type {Connections} from '../server/database';
import {publicSpaceKnowledgeResponse} from '../server/public-space-knowledge';

test('public thematic search is bound to the server-selected community database and namespace',async()=>{
 const calls:Array<{sql:string;args:unknown[]}>= [];
 const pool={async query(sql:string,args:unknown[]=[]){
  calls.push({sql,args});
  return {rows:[{kind:'wiki',entity_id:'energia',title:'Storia dell’energia',summary:'Una voce verificata',revision_sha256:'a'.repeat(64)}]};
 }} as unknown as Connections;
 const response=await publicSpaceKnowledgeResponse(new Request('https://site.test/api/public-spaces/energia-libera/search?q=energia'),pool,'energia-libera');
 assert.equal(response.status,200);
 const value=await response.json();
 assert.equal(value.spaceId,'energia-libera');
 assert.equal(value.matches[0].id,'energia');
 assert.equal(calls[0].args[0],'energia-libera');
 assert.equal(calls[0].args[1],'it');
 assert.match(calls[0].sql,/WHERE c.space_id=\$1 AND c.locale=\$2/);
 assert.equal((await publicSpaceKnowledgeResponse(new Request('https://site.test/api/public-spaces/energia-libera/search?q=x'),pool,'energia-libera')).status,400);
 assert.equal((await publicSpaceKnowledgeResponse(new Request('https://site.test/api/public-spaces/energia-libera/search?q=energia&debug=1'),pool,'energia-libera')).status,400);
});
test('public thematic page denies invalid IDs and does not fall back to another community',async()=>{
 const calls:unknown[][]=[];
 const db={async query(_sql:string,args:unknown[]=[]){
  calls.push(args);
  return {rows:[]};
 }} as unknown as Connections;
 const page=await publicSpaceKnowledgeResponse(new Request('https://site.test/api/public-spaces/archivio-locale/knowledge?kind=event&id=fonte-1'),db,'archivio-locale');
 assert.equal(page.status,404);
 assert.deepEqual(calls[0],['archivio-locale','event','fonte-1','it']);
 assert.equal((await publicSpaceKnowledgeResponse(new Request('https://site.test/api/public-spaces/archivio-locale/knowledge?kind=event&id=../secret'),db,'archivio-locale')).status,400);
 assert.equal((await publicSpaceKnowledgeResponse(new Request('https://site.test/api/public-spaces/archivio-locale/knowledge?kind=event&id=fonte-1',{method:'POST'}),db,'archivio-locale')).status,405);
});
