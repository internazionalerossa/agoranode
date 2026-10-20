import test from 'node:test';
import assert from 'node:assert/strict';
import {videoCountry,browserVideoCountry,visitorCountryResponse} from '../app/lib/visitor-country.ts';
import {rankVideos,mergeVideoUpdates} from '../app/lib/videos.ts';
import {VIDEO_CHANNELS} from '../app/data/video-catalog.ts';
test('visitor country precedes reading language without hiding international channels',()=>{
 const local=VIDEO_CHANNELS.find(c=>c.country==='Francia'),other=VIDEO_CHANNELS.find(c=>c.country==='Italia');
 const clip=(id,channel,date)=>({id,channel:channel.id,title:id,url:'https://example.org/'+id,image:null,publishedAt:date});
 const clips=[clip('one',other,'2026-10-20T00:00:00Z'),clip('two',local,'2026-10-18T00:00:00Z'),clip('three',local,'2026-10-19T00:00:00Z')];
 const ranked=rankVideos(clips,'it','Francia');assert.deepEqual(ranked.map(v=>v.id),['three','two','one']);assert.equal(ranked.length,clips.length);
 assert.equal(rankVideos(clips,'it',null)[0].id,'one');
 assert.equal(videoCountry('GB'),'Regno Unito');assert.equal(videoCountry('br'),'Brasile');
 for(const code of ['XX','T1','unknown',null,42])assert.equal(videoCountry(code),null);
 assert.equal(browserVideoCountry(['en-GB','it-IT']),'Regno Unito');assert.equal(browserVideoCountry(['fr-CA']),'Canada');
 assert.equal(browserVideoCountry(['it','en','bad--tag']),null);
});
test('country endpoint discloses country only, is never publicly cached and ignores caller location headers',async()=>{
 const request=new Request('https://example.test/api/visitor-country',{headers:{'cf-ipcountry':'US','x-country':'US'}});
 const response=visitorCountryResponse(request,'IT');assert.deepEqual(await response.json(),{country:'Italia'});assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(await visitorCountryResponse(request).json(),{country:null});
 assert.equal(visitorCountryResponse(new Request(request,{method:'POST'}),'IT').status,405);
});
test('completed video updates preserve covers and real view counts without deleting channels or duplicating clips',()=>{
 const previous=[{id:'a',channel:'a',title:'Old',url:'https://example.org/a',image:'https://example.org/photo.jpg',publishedAt:null,viewCount:42},{id:'b',channel:'b',title:'Other',url:'https://example.org/b',image:null,publishedAt:null}];
 const updated=mergeVideoUpdates(previous,[{...previous[0],title:'New',image:null,viewCount:undefined}]);
 assert.equal(updated.length,2);assert.equal(updated[0].title,'New');assert.equal(updated[0].image,previous[0].image);assert.equal(updated[0].viewCount,42);
 assert.equal(mergeVideoUpdates(updated,[{...previous[0],viewCount:0}])[0].viewCount,0);
});
