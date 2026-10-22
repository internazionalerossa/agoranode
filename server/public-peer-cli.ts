/**
 * Read-only public package gateway and pull command. Does not start from the
 * normal application server and never reads DATABASE_URL or account records.
 * Place the loopback gateway behind separately configured HTTPS if required.
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPublicPeerServer, pullPublicPeer, pullFromPublicPeers, watchPublicPeers} from './public-peer-transport';

function required(name: string): string {
  const value=process.env[name];
  if(!value) throw Error('Missing configuration: '+name);
  return value;
}
async function main() {
  const command=process.argv[2];
  if(command!=='serve'&&command!=='pull'&&command!=='watch') throw Error('Usage: peer-exchange serve|pull|watch');
  const options={
    validatorSet:JSON.parse(await readFile(required('KNOWLEDGE_REPLICA_VALIDATOR_SET'),'utf8')),
    expectedNetworkId:required('KNOWLEDGE_REPLICA_NETWORK_ID'),
    expectedSpaceId:required('KNOWLEDGE_REPLICA_SPACE_ID'),
    allowLegacyBootstrap:process.env.KNOWLEDGE_REPLICA_ALLOW_LEGACY_BOOTSTRAP==='true',
    directory:command==='serve'
      ? required('KNOWLEDGE_REPLICA_OUTBOX')
      : required('KNOWLEDGE_REPLICA_INBOX'),
  };
  if(command==='watch') {
    const configured=process.env.AGORANODE_PEER_ORIGINS;
    const origins=configured!==undefined
      ? configured.split(',').map(origin=>origin.trim())
      : [required('AGORANODE_PEER_ORIGIN')];
    const intervalMs=Number(process.env.AGORANODE_PEER_POLL_MS??'1000');
    const controller=new AbortController();
    process.once('SIGINT',()=>controller.abort());
    process.once('SIGTERM',()=>controller.abort());
    await watchPublicPeers(origins,options,{
      intervalMs,signal:controller.signal,
      onCycle:event=>{
        // Never log credentials, payload bytes or full peer addresses.
        if(event.status==='unavailable')
          process.stderr.write(JSON.stringify({status:event.status,error:event.error})+'\\n');
        else if(event.newPackages>0)
          process.stdout.write(JSON.stringify(event)+'\\n');
      },
    });
    return;
  }
  if(command==='pull') {
    // Optional comma-separated HTTPS origins owned by different custodians.
    // The existing single-origin variable remains backward compatible.
    const multiple=process.env.AGORANODE_PEER_ORIGINS;
    if (multiple !== undefined) {
      const origins=multiple.split(',').map(item=>item.trim());
      const pulled=await pullFromPublicPeers(origins,options);
      process.stdout.write(JSON.stringify({status:'pulled',...pulled})+'\n');
    } else {
      const pulled=await pullPublicPeer(required('AGORANODE_PEER_ORIGIN'),options);
      process.stdout.write(JSON.stringify({status:'pulled',packages:pulled})+'\n');
    }
    return;
  }
  const port=Number(process.env.AGORANODE_PEER_PORT??'9393');
  if(!Number.isInteger(port)||port<1024||port>65535) throw Error('Invalid AGORANODE_PEER_PORT');
  const server=createPublicPeerServer(options);
  await new Promise<void>((done,reject)=>{
    server.once('error',reject);
    server.listen(port,'127.0.0.1',done);
  });
  process.stdout.write('Public peer exchange bound to 127.0.0.1:'+port+'; HTTPS proxy is required for remote access\n');
  for(const signal of ['SIGTERM','SIGINT'] as const) process.once(signal,()=>{
    server.close(()=>process.exit(0));
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(error=>{console.error(error instanceof Error?error.message:'Peer exchange failed');process.exitCode=1;});
}
