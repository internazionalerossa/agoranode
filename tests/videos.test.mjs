import test from 'node:test';
import assert from 'node:assert/strict';
import {VIDEO_CHANNELS,videoChannel} from '../app/data/video-catalog.ts';
import {parseVideoFeed,parsePeerTubeVideos} from '../app/lib/video-parser.ts';
import {validateVideos,rankVideos} from '../app/lib/videos.ts';
const channel=videoChannel('clara-statello');
const entry=(id='abcdefghijk',publisher=channel.channelId)=>`<entry><yt:videoId>${id}</yt:videoId><yt:channelId>${publisher}</yt:channelId><title>Cooperazione &amp; libert&agrave;</title><published>2026-10-19T10:00:00Z</published><media:thumbnail url="https://i.ytimg.com/vi/${id}/hqdefault.jpg"/></entry>`;

test('video sources include the requested channels, European and global languages and an independent platform',()=>{
 for(const id of ['clara-statello','dazibao','ottolina'])assert.ok(videoChannel(id));
 assert.equal(new Set(VIDEO_CHANNELS.map(c=>c.id)).size,VIDEO_CHANNELS.length);
 assert.ok(new Set(VIDEO_CHANNELS.map(c=>c.language)).size>=6);
 for(const country of ['Francia','Germania','Spagna','Regno Unito','Brasile','India','Australia'])assert.ok(VIDEO_CHANNELS.some(c=>c.country===country));
 assert.equal(videoChannel('le-media').platform,'peertube');
});

test('channel feeds return actual bounded videos, decoded titles and dates while rejecting other channels and unsafe destinations',()=>{
 const videos=parseVideoFeed('<feed>'+entry()+entry('otherabcdef','wrong-channel')+entry('invalid-id')+'</feed>',channel);
 assert.equal(videos.length,1);assert.equal(videos[0].title,'Cooperazione & libertà');
 assert.equal(videos[0].publishedAt,'2026-10-19T10:00:00Z');
 assert.deepEqual(parseVideoFeed('<html>Consent required</html>',channel),[]);
 for(const changes of [{channel:'unknown'},{url:'javascript:alert(1)'},{url:'https://www.youtube.com.evil.example/watch?v=abcdefghijk'},{url:'https://user:pass@www.youtube.com/watch?v=abcdefghijk'},{id:'otherabcdef'}])assert.deepEqual(validateVideos([{...videos[0],...changes}]),[]);
 const noImage=validateVideos([{...videos[0],image:'https://127.0.0.1/private.jpg'}]);assert.equal(noImage[0].image,null);
});

test('PeerTube accepts only the official channel and its fixed host; language priority preserves every channel',()=>{
 const c=videoChannel('le-media'),id='11111111-1111-4111-8111-111111111111';
 const item={uuid:id,name:'Une autre information',url:`https://video.lemediatv.fr/videos/watch/${id}`,thumbnailPath:'/lazy-static/photo.jpg',publishedAt:'2026-10-18T10:00:00Z',channel:{name:'chaine_officielle'}};
 const clips=parsePeerTubeVideos({data:[item,{...item,url:'https://unverified.example/videos/watch/'+id}]},c);assert.equal(clips.length,1);
 assert.equal(clips[0].image,'https://video.lemediatv.fr/lazy-static/photo.jpg');
 assert.deepEqual(parsePeerTubeVideos({data:[{...item,channel:{name:'someone-else'}}]},c),[]);
 const italian=parseVideoFeed('<feed>'+entry()+'</feed>',channel);
 const ranked=rankVideos([...italian,...clips], 'fr');assert.equal(ranked[0].channel,'le-media');assert.equal(ranked.length,2);
});

test('video filters combine original language, publisher country, channel topics and accent-insensitive search without changing reading language',async()=>{
 const {matchesVideoChannel}=await import('../app/lib/videos.ts');
 const all={language:'all',country:'all',topic:'all',search:''};assert.equal(VIDEO_CHANNELS.filter(c=>matchesVideoChannel(c,all)).length,VIDEO_CHANNELS.length);
 assert.ok(VIDEO_CHANNELS.length>40);assert.ok(new Set(VIDEO_CHANNELS.map(c=>c.language)).size>=10);
 const filters={...all,language:'pt',country:'Brasile',topic:'Formazione',search:'boitempo'};
 const result=VIDEO_CHANNELS.filter(c=>matchesVideoChannel(c,filters));assert.deepEqual(result.map(c=>c.id),['boitempo']);assert.deepEqual(VIDEO_CHANNELS.filter(c=>matchesVideoChannel(c,{...filters,country:'Cina'})),[]);
 assert.ok(matchesVideoChannel(videoChannel('mesaredondacuba'),{...all,search:'mesa redonda'}));
 assert.equal('platform' in all,false);
});

test('platform view counts preserve zero and exact integers without fabricating missing statistics',()=>{
 const xml='<feed>'+entry().replace('</entry>','<media:statistics views="1234567"/></entry>')+'</feed>';
 const [video]=parseVideoFeed(xml,channel);assert.equal(video.viewCount,1234567);
 assert.equal(parseVideoFeed('<feed>'+entry()+'</feed>',channel)[0].viewCount,undefined);
 for(const value of [0,42,Number.MAX_SAFE_INTEGER])assert.equal(validateVideos([{...video,viewCount:value}])[0].viewCount,value);
 for(const value of [-1,1.2,Infinity,Number.MAX_SAFE_INTEGER+1,'1200',null])assert.equal(validateVideos([{...video,viewCount:value}])[0].viewCount,undefined);
 assert.equal(validateVideos([{...video,publishedAt:'2026-10-19'}])[0].publishedAt,null);
 const c=videoChannel('le-media'),id='11111111-1111-4111-8111-111111111111';
 const [peer]=parsePeerTubeVideos({data:[{uuid:id,name:'Information',url:`https://video.lemediatv.fr/videos/watch/${id}`,views:5678,channel:{name:'chaine_officielle'}}]},c);
 assert.equal(peer.viewCount,5678);
});
