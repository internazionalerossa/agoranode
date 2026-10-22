import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPublicPeerServer, peerOrigin, publicPeerRequest, pullPublicPeer} from '../server/public-peer-transport';

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
