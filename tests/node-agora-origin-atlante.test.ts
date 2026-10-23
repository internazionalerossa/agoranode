import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import AgoraAtlas from '../app/components/AgoraAtlas';
import {AGORA_ATLAS,AGORA_ATLAS_TIMELINE,AGORA_READING,agoraAtlasEntry,agoraAtlasHref,validateAgoraAtlas} from '../app/instances/agora-atlante';
import {AGORA_MANIFEST} from '../app/instances/agora';
import {agoraKnowledgeSeed} from '../server/agora-knowledge-seed';
import {validateAgoraSeedDatabase} from '../server/agora-database';
import {validateKnowledgeRevisionInput,knowledgeRevisionHash} from '../app/lib/knowledge-model';

test('Agora is the canonical thematic alpha with a real source-backed Atlas and narrative timeline',()=>{
 assert.doesNotThrow(validateAgoraAtlas);
 assert.ok(AGORA_ATLAS.length>=12);
 assert.ok(AGORA_READING.length>=5);
 assert.ok(AGORA_ATLAS_TIMELINE.length>=5);
 assert.equal(new Set(AGORA_ATLAS.map(entry=>entry.id)).size,AGORA_ATLAS.length);
 assert.equal(new Set(AGORA_ATLAS_TIMELINE.map(entry=>entry.timeline!.order)).size,AGORA_ATLAS_TIMELINE.length);
 assert.ok(AGORA_ATLAS.some(entry=>!entry.timeline),'not every knowledge page belongs in the featured timeline');
 assert.ok(AGORA_ATLAS_TIMELINE.every(entry=>entry.timeline!.narrative.trim().length>=100));
 assert.ok(AGORA_ATLAS.every(entry=>entry.references.every(ref=>ref.url.startsWith('https://'))));
 assert.ok(AGORA_ATLAS.every(entry=>entry.relatesTo.every(id=>agoraAtlasEntry(id)!==null)));
 assert.equal(AGORA_MANIFEST.capabilities.wiki.status,'implemented');
 assert.equal(AGORA_MANIFEST.capabilities.library.status,'implemented');
 assert.equal(AGORA_MANIFEST.capabilities.storyline.status,'implemented');
 assert.equal(AGORA_MANIFEST.capabilities.community.status,'planned');
 assert.equal(AGORA_MANIFEST.governance.scope,'instance');
 assert.equal(agoraAtlasHref('atlante'),'/agora?atlante=atlante');
 assert.throws(()=>agoraAtlasHref('nonexistent'));
});

test('same Agora Atlas code renders readable public index, story, technical library and dedicated pages',()=>{
 const html=renderToStaticMarkup(createElement(AgoraAtlas));
 assert.match(html,/Atlante di Agorà/);
 assert.match(html,/Dalla prima comunità alla conoscenza in rete/);
 assert.match(html,/La biblioteca tecnica|BIBLIOTECA TECNICA/);
 assert.match(html,/agora\?atlante=atlante/);
 assert.match(html,/Fonti e documentazione|pagine.*fonti/);
 assert.match(html,/type="search"/);
 assert.doesNotMatch(html,/Pubblica subito|Votazione approvata automaticamente/);
});

test('Agorà Atlas seeds approved repository-reviewed PUBLIC revisions in its own knowledge namespace',async()=>{
 const records=agoraKnowledgeSeed();
 assert.equal(records.length,AGORA_ATLAS.length);
 assert.ok(records.every(row=>row.identity.spaceId==='agora'&&row.identity.kind==='article'));
 assert.ok(records.every(row=>row.publicationRecord.format==='org.agoranode.repository-publication.v1'));
 assert.ok(records.every(row=>row.rights.reuseAllowed===false&&row.sources.length>=1));
 for(const row of records){
  const validated=await validateKnowledgeRevisionInput(row);
  assert.equal(validated.identity.spaceId,'agora');
  assert.match(await knowledgeRevisionHash(row),/^[a-f0-9]{64}$/);
 }
 assert.doesNotThrow(()=>validateAgoraSeedDatabase('postgres://user@localhost/agora',
   'postgres://other@localhost/polisrossa'));
 assert.throws(()=>validateAgoraSeedDatabase('postgres://user@localhost/shared',
   'postgres://another@localhost:5432/shared'),/distinct PostgreSQL/);
});
