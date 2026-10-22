import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPublicPeerServer, peerOrigin, publicPeerRequest, pullPublicPeer, pullFromPublicPeers, watchPublicPeers, PublicPeerIndexCache} from '../server/public-peer-transport';

const options = (directory: string) => ({
  directory, validatorSet: {}, expectedNetworkId: 'agoranode.public.v1',
  expectedSpaceId: 'polisrossa', allowLegacyBootstrap: true,
});

test('peer origins reject insecure, credential-bearing, path and query URLs', () => {
  for (const url of [
    'http://example.com', 'http://127.0.0.1:5000', 'https://user:pass@example.com',
    'https://example.com/a', 'https://example.com?x=1', 'file:///etc/passwd',
    'https://example.com/#private',
  ]) assert.throws(() => peerOrigin(url), /Peer origin|Invalid URL/);
  assert.equal(peerOrigin('https://example.com'), 'https://example.com');
  assert.equal(peerOrigin('http://127.0.0.1:5000', true), 'http://127.0.0.1:5000');
  assert.throws(() => peerOrigin('http://example.com', true));
});

test('read-only peer endpoint never exposes unrelated local files, private routes or symlinks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agoranode-peer-sec-'));
  try {
    const privateName = '0000000000000000-'+'a'.repeat(64)+'.knowledge-final.json';
    await writeFile(join(dir, 'account.json'), '{"password":"secret"}');
    await symlink(join(dir, 'account.json'), join(dir, privateName));
    const index = await publicPeerRequest(new Request('http://localhost/v1/index'), options(dir));
    assert.equal(index.status, 200);
    assert.deepEqual((await index.json()).packages, []);
    const name = await publicPeerRequest(new Request('http://localhost/v1/packages/'+privateName), options(dir));
    assert.equal(name.status, 404);
    for (const path of ['/etc/passwd','/v1/packages/..%2Faccount.json','/v1/packages/account.json']) {
      const result = await publicPeerRequest(new Request('http://localhost'+path), options(dir));
      assert.equal(result.status, 404);
    }
    assert.equal((await publicPeerRequest(new Request('http://localhost/v1/index',{method:'POST'}),options(dir))).status,405);
    assert.equal((await publicPeerRequest(new Request('http://localhost/v1/index?key=a'), options(dir))).status,400);
  } finally {await rm(dir, {recursive:true,force:true});}
});

test('peer pull rejects tampered indices and foreign namespaces even on loopback', async () => {
  const dir = await mkdtemp(join(tmpdir(),'agoranode-peer-pull-'));
  const fetcher = (async () => Response.json({
    format: 'org.agoranode.public-peer-index.v1', networkId: 'wrong-network',
    spaceId: 'polisrossa', packages: [],
  })) as typeof fetch;
  try {
    await assert.rejects(pullPublicPeer('http://127.0.0.1:9393',options(dir),
      {fetcher,allowInsecureLoopback:true}), /Invalid peer index/);
    const fake = (async () => Response.json({
      format:'org.agoranode.public-peer-index.v1',
      networkId:'agoranode.public.v1',spaceId:'polisrossa',
      packages:['../secrets'],
    })) as typeof fetch;
    await assert.rejects(pullPublicPeer('http://127.0.0.1:9393',options(dir),
      {fetcher:fake,allowInsecureLoopback:true}), /Invalid peer index/);
    const listener=createPublicPeerServer(options(dir));
    await new Promise<void>(r=>listener.listen(0,'127.0.0.1',r));
    try {
      const address=listener.address();
      if (!address || typeof address==='string') throw Error('No peer address');
      const fetched=await pullPublicPeer('http://127.0.0.1:'+address.port,options(dir),
        {allowInsecureLoopback:true});
      assert.deepEqual(fetched,[]);
    } finally {await new Promise<void>((resolve,reject)=>listener.close(e=>e?reject(e):resolve()));}
  } finally {await rm(dir,{recursive:true,force:true});}
});


test('known peer sources fail over without trusting a failed origin or private credentials',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'agoranode-peer-failover-'));
  const calls:string[]=[];
  const fetcher=(async (input:RequestInfo|URL)=>{
    const address=String(input);
    calls.push(address);
    if(address.startsWith('https://first.example/'))return new Response('outage',{status:503});
    return Response.json({format:'org.agoranode.public-peer-index.v1',
      networkId:'agoranode.public.v1',spaceId:'polisrossa',packages:[]});
  }) as typeof fetch;
  try{
    const result=await pullFromPublicPeers(['https://first.example','https://second.example'],
      options(dir),{fetcher});
    assert.deepEqual(result,{packages:[],tried:2});
    assert.deepEqual(calls,['https://first.example/v1/index','https://second.example/v1/index']);
    await assert.rejects(
      pullFromPublicPeers(['https://first.example','http://unsafe.example'],options(dir),{fetcher}),
      /bare HTTPS/,
    );
    assert.deepEqual(calls,['https://first.example/v1/index','https://second.example/v1/index'],
      'reject insecure origins before any request');
    await assert.rejects(
      pullFromPublicPeers(['https://first.example','https://first.example'],options(dir),{fetcher}),
      /Duplicate/,
    );
  }finally{await rm(dir,{recursive:true,force:true});}
});


test('public index ETag avoids the unchanged response body',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'agoranode-etag-'));
  try{
    const cache=new PublicPeerIndexCache();
    const first=await publicPeerRequest(new Request('http://localhost/v1/index'),options(dir),cache);
    const etag=first.headers.get('etag');
    assert.equal(first.status,200);
    assert.match(etag??'',/^"[0-9a-f]{64}"$/);
    assert.deepEqual((await first.json()).packages,[]);
    const second=await publicPeerRequest(new Request('http://localhost/v1/index',
      {headers:{'if-none-match':etag!}}),options(dir),cache);
    assert.equal(second.status,304);
    assert.equal(await second.text(),'');
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('conditional polling uses ETag and rejects unsolicited 304',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'agoranode-conditional-'));
  const etag='"'+ 'a'.repeat(64)+'"';
  const seen:string[]=[];
  const fetcher=(async(_url:RequestInfo|URL,init?:RequestInit)=>{
    const previous=new Headers(init?.headers).get('if-none-match');
    seen.push(previous??'first');
    if(previous===etag)return new Response(null,{status:304,headers:{etag}});
    return Response.json({format:'org.agoranode.public-peer-index.v1',
      networkId:'agoranode.public.v1',spaceId:'polisrossa',packages:[]},{headers:{etag}});
  }) as typeof fetch;
  try{
    const state={};
    await pullPublicPeer('https://peer.example',options(dir),{fetcher,pollState:state});
    await pullPublicPeer('https://peer.example',options(dir),{fetcher,pollState:state});
    assert.deepEqual(seen,['first',etag]);
    await assert.rejects(pullPublicPeer('https://peer.example',options(dir),
      {fetcher:(async()=>new Response(null,{status:304})) as typeof fetch,pollState:{}}),
      /Unsolicited/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('one-second watch stops after abort without continuing requests',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'agoranode-watch-'));
  const controller=new AbortController();
  const events:string[]=[];
  const fetcher=(async()=>Response.json({format:'org.agoranode.public-peer-index.v1',
    networkId:'agoranode.public.v1',spaceId:'polisrossa',packages:[]})) as typeof fetch;
  try{
    await watchPublicPeers(['https://peer.example'],options(dir),{
      intervalMs:1000,signal:controller.signal,
      onCycle(event){events.push(event.status);if(events.length>=2)controller.abort();},
    },{fetcher});
    assert.deepEqual(events,['synced','synced']);
    await assert.rejects(watchPublicPeers(['https://peer.example'],options(dir),{intervalMs:500},{fetcher}),
      /poll interval/);
  }finally{await rm(dir,{recursive:true,force:true});}
});


test('actual HTTP peer listener preserves If-None-Match and emits body-free 304',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'agoranode-etag-wire-'));
  const server=createPublicPeerServer(options(dir));
  try{
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const addr=server.address();
    if(!addr||typeof addr==='string')throw Error('Invalid test listener');
    const url='http://127.0.0.1:'+addr.port+'/v1/index';
    const first=await fetch(url);
    assert.equal(first.status,200);
    const etag=first.headers.get('etag');
    assert.match(etag??'',/^"[a-f0-9]{64}"$/);
    const second=await fetch(url,{headers:{'if-none-match':etag!}});
    assert.equal(second.status,304);
    assert.equal(await second.text(),'');
  }finally{
    await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
    await rm(dir,{recursive:true,force:true});
  }
});
