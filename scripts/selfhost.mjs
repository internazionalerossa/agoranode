import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function initialize(directory,urlText='https://localhost:8443',mode='primary'){
 const url=new URL(urlText);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!/^localhost$|^[a-z0-9.-]+$/i.test(url.hostname))throw Error('Use an HTTPS origin, without path or credentials');
 if(!['primary','mirror'].includes(mode))throw Error('Choose primary or mirror');
 const state=resolve(directory,'.selfhost');
 await mkdir(state,{recursive:true,mode:0o700});
 try{await access(resolve(state,'runtime.env'));throw Error('Configuration already exists; it will not be overwritten');}catch(e){if(e.code!=='ENOENT')throw e;}
 const password=randomBytes(32).toString('hex'),secret=randomBytes(48).toString('hex');
 const env=[`APP_URL=${url.origin}`,'NODE_ENV=production','PORT=8000',`POSTGRES_PASSWORD=${password}`,`DATABASE_URL=postgresql://polisrossa:${password}@localhost/polisrossa?host=%2Fvar%2Frun%2Fpostgresql`,`AUTH_SECRET=${secret}`,`MIRROR_MODE=${mode==='mirror'}`,'MAIL_TRANSPORT=none','REGISTRATIONS_OPEN=false','FORUM_OPEN=false','PUBLIC_OPERATOR_NAME=','PUBLIC_PRIVACY_CONTACT=','BIND_ADDRESS=127.0.0.1',`LOCAL_UID=${process.getuid?.()??1000}`,`LOCAL_GID=${process.getgid?.()??1000}`,`HTTPS_PORT=${url.port||443}`,'HTTP_PORT=8080'];
 await writeFile(resolve(state,'runtime.env'),env.join('\n')+'\n',{flag:'wx',mode:0o600});
 // HTTP redirects are disabled during local preparation; only HTTPS is served.
 const local=url.hostname==='localhost';
 await writeFile(resolve(state,'Caddyfile'),`{\n auto_https disable_redirects\n}\n${url.hostname}:443 {\n${local?' tls internal\n':''} reverse_proxy app:8000\n}\n`,{flag:'wx',mode:0o600});
 await writeFile(resolve(state,'recipients.txt'),'# Public age1 recipients only. Never put private keys here.\n',{flag:'wx',mode:0o600});
 await mkdir(resolve(state,'backups'),{mode:0o700});
 return {origin:url.origin,mode};
}
export function composeArgs(action){
 const base=['compose','--env-file','.selfhost/runtime.env','-f','deploy/selfhost/compose.yaml'];
 const commands={start:['up','-d','--build','--wait'],stop:['stop'],status:['ps'],logs:['logs','--tail','80'],backup:['run','--build','--rm','-T','backup'],certificate:['cp','proxy:/data/caddy/pki/authorities/local/root.crt','.selfhost/local-root.crt']};
 if(!commands[action])throw Error('Use init, start, stop, status, logs, backup or certificate');
 return [...base,...commands[action]];
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const action=process.argv[2];
  if(action==='init'){const result=await initialize(root,process.argv[3],process.argv[4]);console.log(`Configuration created for ${result.origin} (${result.mode}). No service has been started. Run: node scripts/selfhost.mjs start`);}
  else{const child=spawn('docker',composeArgs(action),{cwd:root,stdio:'inherit',shell:false});child.on('error',()=>{console.error('Docker with Compose is required.');process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});}
 }catch(e){console.error(e.message);process.exitCode=1;}
}
