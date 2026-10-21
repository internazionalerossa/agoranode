import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import STORY from '../app/data/history-story.json' with {type:'json'};
import SocialHistoryStory from '../app/components/SocialHistoryStory.tsx';
import {LocalizationProvider} from '../app/components/Localization.tsx';
import {copyHistoryEventUrl,historyEventFromUrl,historyEventUrl,historyTimelineUrl,shareHistoryEvent} from '../app/lib/history-event-navigation.ts';

const events=STORY.flatMap(era=>era.events);
const ids=new Set(events.map(event=>event.id));

test('every timeline event has an explicit unique stable destination',()=>{
 assert.equal(events.length,64);
 assert.equal(ids.size,events.length);
 for(const event of events){
  assert.match(event.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  const url=historyEventUrl(event.id);
  assert.equal(historyEventFromUrl(url,ids),event.id);
  assert.equal(new URL(url,'https://example.test').hash,'');
  assert.equal(new URL(historyTimelineUrl(event.id),'https://example.test').hash,'#'+event.id);
 }
 assert.equal(historyEventFromUrl('/?view=teoria&percorso=timeline&evento=non-esiste',ids),null);
});

test('the timeline exposes one public page link for every indexed event',()=>{
 const html=renderToStaticMarkup(h(LocalizationProvider,{language:'it'},h(SocialHistoryStory)));
 for(const event of events)assert.ok(html.includes(historyEventUrl(event.id).replaceAll('&','&amp;')),event.id);
 assert.equal((html.match(/class="story-event-page-link"/g)??[]).length,events.length);
});

test('the public event destination reuses the complete sourced timeline entry',()=>{
 const event=events.find(item=>item.id==='haymarket-1886');
 const previous=globalThis.window;
 globalThis.window={location:{href:'https://polisrossa.example'+historyEventUrl(event.id),origin:'https://polisrossa.example'}};
 try{
  const html=renderToStaticMarkup(h(LocalizationProvider,{language:'it'},h(SocialHistoryStory)));
  assert.match(html,/class="social-history-story story-event-page"/);
  assert.match(html,/id="history-event-title"/);
  assert.match(html,/Haymarket: il prezzo della lotta per le otto ore/);
  assert.match(html,/Library of Congress/);
  assert.match(html,/<details class="story-event-details" open=""/);
  assert.match(html,/>Condividi</);
  assert.match(html,/>Copia link</);
  assert.match(html,/data-knowledge-kind="event" data-knowledge-entity="haymarket-1886"/);
  assert.match(html,/Storico delle modifiche/);
  assert.match(html,/Caricamento della cronologia/);
  assert.doesNotMatch(html,/story-opening/);
 }finally{
  if(previous===undefined)delete globalThis.window;else globalThis.window=previous;
 }
});

test('sharing uses Web Share and falls back to an explicit clipboard copy',async()=>{
 const payload={title:'Una tappa',text:'1900 · Mondo',url:'https://example.test/?evento=tappa'};
 let shared=null,copied='';
 assert.equal(await shareHistoryEvent({share:async value=>{shared=value;}},payload),'shared');
 assert.deepEqual(shared,payload);
 assert.equal(await shareHistoryEvent({share:async()=>{throw new Error('not available');},clipboard:{writeText:async value=>{copied=value;}}},payload),'copied');
 assert.equal(copied,payload.url);
 assert.equal(await copyHistoryEventUrl({clipboard:{writeText:async value=>{copied=value;}}},payload.url),'copied');
 assert.equal(await shareHistoryEvent({},payload),'unavailable');
 const cancelled=new Error('cancelled');cancelled.name='AbortError';
 assert.equal(await shareHistoryEvent({share:async()=>{throw cancelled;},clipboard:{writeText:async()=>assert.fail('cancel must not copy')}},payload),'cancelled');
});
