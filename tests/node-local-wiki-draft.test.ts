import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCAL_WIKI_DRAFT_FORMAT,localWikiDraftKey,validateLocalWikiDraft} from '../app/lib/local-wiki-draft';

const fixture={
 format:LOCAL_WIKI_DRAFT_FORMAT,
 spaceId:'polisrossa',kind:'event',id:'comune',
 revisionSha256:'a'.repeat(64),
 reason:'Il contesto deve essere approfondito.',
 source:'https://example.org/original',
 blocks:[{id:'first',text:'Una proposta migliorata.'}],
};
test('wiki corrections are bounded, scoped and tied to their original published revision',()=>{
 assert.equal(validateLocalWikiDraft(fixture).revisionSha256,'a'.repeat(64));
 assert.notEqual(localWikiDraftKey('polisrossa','event','comune'),localWikiDraftKey('agora','event','comune'));
 assert.throws(()=>localWikiDraftKey('../private','event','comune'));
 assert.throws(()=>validateLocalWikiDraft({...fixture,spaceId:'../private'}));
 assert.throws(()=>validateLocalWikiDraft({...fixture,revisionSha256:'bad'}));
 assert.throws(()=>validateLocalWikiDraft({...fixture,source:'javascript:alert(1)'}));
 assert.throws(()=>validateLocalWikiDraft({...fixture,blocks:[{id:'dup',text:'A'},{id:'dup',text:'B'}]}));
 assert.throws(()=>validateLocalWikiDraft({...fixture,blocks:Array.from({length:11},(_,i)=>({id:'a'+i,text:'x'}))}));
 assert.throws(()=>validateLocalWikiDraft({...fixture,privateKey:'forbidden'}));
});
