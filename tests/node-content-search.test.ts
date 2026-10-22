import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNodeSearch,searchNodeContent,type NodeContentItem} from '../app/lib/node-content-search';
import {POLISROSSA_CONTENT} from '../app/instances/polisrossa-content';

test('search indexes library and thematic timeline with existing routes and no foreign-node leakage',()=>{
  assert.ok(POLISROSSA_CONTENT.some(x=>x.kind==='book'));
  assert.ok(POLISROSSA_CONTENT.some(x=>x.kind==='timeline'));
  const marx=searchNodeContent(POLISROSSA_CONTENT,'polisrossa','manifesto');
  assert.ok(marx.some(x=>x.id==='manifesto'));
  const commune=searchNodeContent(POLISROSSA_CONTENT,'polisrossa','comune');
  assert.ok(commune.some(x=>x.kind==='timeline'));
  assert.equal(searchNodeContent(POLISROSSA_CONTENT,'agora','manifesto').length,0);
  assert.equal(normalizeNodeSearch('Rivolúzione CULTURALE'),'rivoluzione culturale');
  assert.ok(POLISROSSA_CONTENT.every(x=>x.href.startsWith('/polisrossa')));
});
test('scoped search rejects unsafe URLs, oversized indices and invalid identifiers',()=>{
  const example:NodeContentItem={
    spaceId:'polisrossa',kind:'wiki',id:'foo',title:'Foo',
    summary:'Verified sources',href:'/polisrossa?view=teoria',tags:['sources'],
  };
  assert.deepEqual(searchNodeContent([example],'polisrossa','verified'),[example]);
  assert.deepEqual(searchNodeContent([example],'polisrossa','unknown'),[]);
  assert.throws(()=>searchNodeContent([{...example,href:'//attacker.test'}],'polisrossa','foo'),/Invalid scoped/);
  assert.throws(()=>searchNodeContent([example],'../test','foo'),/Invalid discovery/);
  assert.throws(()=>searchNodeContent([example],'polisrossa','x'.repeat(241)),/Invalid discovery/);
  assert.throws(()=>searchNodeContent([example],'polisrossa','foo',{limit:101}),/Invalid discovery/);
});
