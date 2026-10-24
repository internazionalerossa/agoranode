import test from 'node:test';
import assert from 'node:assert/strict';
import {publicFeedUrl,publisherFeedUrl,fetchPublicFeedResponse} from '../app/lib/feed-fetch-policy';

test('feed outbound URLs reject IP literals, credentials, internal names and nonstandard ports',()=>{
 for(const unsafe of [
  'http://127.0.0.1/admin','http://169.254.169.254/latest/meta-data',
  'https://[::1]/','https://127.1/','http://0x7f000001/',
  'https://localhost/','https://service.internal/',
  'https://api.example.com:8443/','file:///etc/passwd',
  'https://user:pass@publisher.example/rss',
 ]) assert.equal(publicFeedUrl(unsafe),null,unsafe);
 assert.equal(publicFeedUrl('https://publisher.example/rss')?.hostname,'publisher.example');
 assert.equal(publicFeedUrl('http://www.cubadebate.cu/feed/')?.protocol,'http:');
});
test('a discovered feed cannot expand beyond the publisher host',()=>{
 assert.equal(publisherFeedUrl('/rss','https://publisher.example/'),'https://publisher.example/rss');
 assert.equal(publisherFeedUrl('https://www.publisher.example/rss','https://publisher.example/'),'https://www.publisher.example/rss');
 assert.equal(publisherFeedUrl('https://evil.example/rss','https://publisher.example/'),null);
 assert.equal(publisherFeedUrl('http://127.0.0.1/rss','https://publisher.example/'),null);
});
test('redirects are explicit, bounded and limited to the approved publisher',async()=>{
 const visited:string[]=[];
 const mock=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);visited.push(url);
  assert.equal(init?.redirect,'manual');assert.equal(init?.credentials,'omit');
  return visited.length===1?
   new Response(null,{status:301,headers:{location:'https://www.publisher.example/rss'}}):
   new Response('rss',{status:200});
 }) as typeof fetch;
 const response=await fetchPublicFeedResponse('https://publisher.example/feed',{headers:{accept:'application/rss+xml'}},mock);
 assert.equal(await response.text(),'rss');
 assert.deepEqual(visited,['https://publisher.example/feed','https://www.publisher.example/rss']);
 for(const location of ['http://127.0.0.1/secret','https://bad.example/rss','http://publisher.example/insecure','file:///etc/passwd']){
  let calls=0;
  const redirect=(async()=>{calls++;return new Response(null,{status:302,headers:{location}})}) as typeof fetch;
  await assert.rejects(fetchPublicFeedResponse('https://publisher.example/feed',{},redirect));
  assert.equal(calls,1,location);
 }
});
