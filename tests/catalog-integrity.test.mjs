import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE_CATALOG} from '../app/data/catalog.ts';
import EXTRA from '../app/data/international-sources.json' with {type:'json'};
import PROOF from '../app/data/source-verification.json' with {type:'json'};
import LANGUAGES from '../app/data/languages.json' with {type:'json'};
import SNAPSHOT from '../app/data/video-snapshot.json' with {type:'json'};
import {VIDEO_CHANNELS} from '../app/data/video-catalog.ts';
import {validateVideos} from '../app/lib/videos.ts';
test('catalogue additions retain unique configured destinations, supported languages and actual feed observations',()=>{
 assert.equal(new Set(SOURCE_CATALOG.map(s=>s.id)).size,SOURCE_CATALOG.length);
 assert.equal(new Set(PROOF.feeds.map(s=>s.id)).size,EXTRA.length);
 for(const source of EXTRA){
  const observation=PROOF.feeds.find(row=>row.id===source.id);assert.ok(observation,source.id);assert.ok(observation.entriesObserved>0);assert.ok(observation.feedTitle);
  assert.ok(LANGUAGES[source.language],source.id);assert.ok(source.country&&source.region);
  for(const address of [source.homepage,...source.feedUrls]){const url=new URL(address);assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.equal(url.password,'');}
 }
 const feeds=SOURCE_CATALOG.flatMap(source=>(source.feedUrls??[]).map(url=>[url,source.id]));
 const seen=new Map();for(const [url,id]of feeds){if(EXTRA.some(s=>s.id===id))assert.ok(!seen.has(url),`${id} duplicates ${seen.get(url)}`);seen.set(url,id);}
});
test('video entries resolve to distinct channel owners and snapshots retain only validated clips',()=>{
 const youtube=VIDEO_CHANNELS.filter(c=>c.platform==='youtube');assert.equal(new Set(youtube.map(c=>c.channelId)).size,youtube.length);
 assert.deepEqual(validateVideos(SNAPSHOT.videos),SNAPSHOT.videos);
 for(const proof of PROOF.videos){const c=VIDEO_CHANNELS.find(c=>c.id===proof.id);assert.equal(c?.channelId,proof.channelId);assert.ok(SNAPSHOT.videos.some(v=>v.channel===proof.id));}
});
