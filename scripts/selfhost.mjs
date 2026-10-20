import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const projectPattern=/^[a-z0-9][a-z0-9_-]{0,62}$/;
const basenamePattern=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const snapshotIdPattern=/^sha256:[0-9a-f]{64}$/;
export function validSnapshotBasename(value){return basenamePattern.test(value)&&value!=='.'&&value!=='..';}
function port(value,name){
 const text=String(value);
 if(!/^[1-9][0-9]{0,4}$/.test(text)||Number(text)>65535)throw Error(`${name} must be an integer from 1 to 65535`);
 return Number(text);
}
export async function ensureSnapshotDirectories(directory){
 const state=resolve(directory,'.selfhost');
 await mkdir(resolve(state,'private','snapshot'),{recursive:true,mode:0o700});
 await mkdir(resolve(state,'snapshots'),{recursive:true,mode:0o700});
 await mkdir(resolve(state,'replica'),{recursive:true,mode:0o700});
}
export async function initialize(directory,urlText='https://localhost:8443',mode='primary',options={}){
 const url=new URL(urlText);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!/^localhost$|^[a-z0-9.-]+$/i.test(url.hostname))throw Error('Use an HTTPS origin, without path or credentials');
 if(!['primary','mirror'].includes(mode))throw Error('Choose primary or mirror');
 const project=options.project??`polisrossa-${randomBytes(6).toString('hex')}`;
 if(!projectPattern.test(project))throw Error('Project name must start with a lowercase letter or digit and contain at most 63 lowercase letters, digits, hyphens or underscores');
 const httpsPort=port(url.port||443,'HTTPS port'),httpPort=port(options.httpPort??8080,'HTTP port');
 if(httpPort===httpsPort)throw Error('HTTP and HTTPS ports must be different');
 const state=resolve(directory,'.selfhost');
 await mkdir(state,{recursive:true,mode:0o700});
 try{await access(resolve(state,'runtime.env'));throw Error('Configuration already exists; it will not be overwritten');}catch(e){if(e.code!=='ENOENT')throw e;}
 const password=randomBytes(32).toString('hex'),secret=randomBytes(48).toString('hex');
 const env=[`COMPOSE_PROJECT_NAME=${project}`,`APP_URL=${url.origin}`,'NODE_ENV=production','PORT=8000',`POSTGRES_PASSWORD=${password}`,`DATABASE_URL=postgresql://polisrossa:${password}@localhost/polisrossa?host=%2Fvar%2Frun%2Fpostgresql`,`AUTH_SECRET=${secret}`,`MIRROR_MODE=${mode==='mirror'}`,'MAIL_TRANSPORT=none','REGISTRATIONS_OPEN=false','FORUM_OPEN=false','PUBLIC_OPERATOR_NAME=','PUBLIC_PRIVACY_CONTACT=','BIND_ADDRESS=127.0.0.1',`LOCAL_UID=${process.getuid?.()??1000}`,`LOCAL_GID=${process.getgid?.()??1000}`,`HTTPS_PORT=${httpsPort}`,`HTTP_PORT=${httpPort}`];
 await writeFile(resolve(state,'runtime.env'),env.join('\n')+'\n',{flag:'wx',mode:0o600});
 // HTTP redirects are disabled during local preparation; only HTTPS is served.
 const local=url.hostname==='localhost';
 await writeFile(resolve(state,'Caddyfile'),`{\n auto_https disable_redirects\n}\n${url.hostname}:443 {\n${local?' tls internal\n':''} reverse_proxy app:8000\n}\n`,{flag:'wx',mode:0o600});
 await writeFile(resolve(state,'recipients.txt'),'# Public age1 recipients only. Never put private keys here.\n',{flag:'wx',mode:0o600});
 await mkdir(resolve(state,'backups'),{mode:0o700});
 await ensureSnapshotDirectories(directory);
 return {origin:url.origin,mode,project,httpPort,httpsPort};
}
export function parseInitArgs(args){
 const positional=[],options={};
 for(let index=0;index<args.length;index++){
  const value=args[index];
  if(value==='--project'||value==='--http-port'){
   const next=args[++index];if(!next||next.startsWith('--'))throw Error(`Missing value for ${value}`);
   const key=value==='--project'?'project':'httpPort';if(options[key]!==undefined)throw Error(`Duplicate option: ${value}`);options[key]=next;
  }else if(value.startsWith('--'))throw Error('Unknown init option: '+value);
  else positional.push(value);
 }
 if(positional.length>2)throw Error('Use init [HTTPS origin] [primary|mirror] [--project name] [--http-port port]');
 return {urlText:positional[0]??'https://localhost:8443',mode:positional[1]??'primary',options};
}
export function composeArgs(action,operands=[]){
 const base=['compose','--env-file','.selfhost/runtime.env','-f','deploy/selfhost/compose.yaml'];
 const commands={start:['up','-d','--build','--wait'],stop:['stop'],status:['ps'],logs:['logs','--tail','80'],backup:['run','--build','--rm','-T','backup'],certificate:['cp','proxy:/data/caddy/pki/authorities/local/root.crt','.selfhost/local-root.crt'],'snapshot-keygen':['run','--rm','-T','--no-deps','snapshot-sign','keygen'],'snapshot-status':['run','--rm','-T','snapshot-db','status']};
 if(action==='snapshot-export'){
  snapshotExportOptions(operands);
  return [...base,'run','--rm','-T','--no-deps','snapshot-sign','export'];
 }
 if(['snapshot-verify','snapshot-import'].includes(action)){
  if(operands.length!==2||!operands.every(validSnapshotBasename))throw Error(`${action} requires a snapshot basename and a public-key basename`);
  return [...base,'run','--rm','-T',...(action==='snapshot-verify'?['--no-deps','snapshot']:['snapshot-db']),action.slice('snapshot-'.length),...operands];
 }
 if(operands.length)throw Error('Unexpected command arguments');
 if(!commands[action])throw Error('Use init, start, stop, status, logs, backup, certificate or a snapshot-* command');
 return [...base,...commands[action]];
}
function snapshotExportOptions(operands){
 if(operands.length>2)throw Error('snapshot-export accepts an optional height and predecessor');
 const height=operands[0]??'0',previous=operands[1]??'';
 if(!/^(?:0|[1-9][0-9]{0,15})$/.test(height)||!Number.isSafeInteger(Number(height)))throw Error('Snapshot height must be a safe decimal integer');
 if((height==='0'&&previous)||(height!=='0'&&!snapshotIdPattern.test(previous)))throw Error('Non-genesis snapshots require their sha256 predecessor');
 return {height,previous};
}
export function composeEnvironment(action,source=process.env,operands=[]){
 const env={...source};
 // Snapshot mounts are writable only for the one operation that creates their
 // files. The saved project identity wins over unrelated shell configuration.
 delete env.COMPOSE_PROJECT_NAME;
 env.SNAPSHOT_PRIVATE_ACCESS=action==='snapshot-keygen'?'rw':'ro';
 env.SNAPSHOT_DIR_ACCESS=action==='snapshot-export'?'rw':'ro';
 env.SNAPSHOT_REPLICA_ACCESS=action==='snapshot-keygen'?'rw':'ro';
 if(action==='snapshot-export'){
  const options=snapshotExportOptions(operands);env.SNAPSHOT_HEIGHT=options.height;env.SNAPSHOT_PREVIOUS=options.previous;
 }
 return env;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const action=process.argv[2];
  if(action==='init'){const parsed=parseInitArgs(process.argv.slice(3)),result=await initialize(root,parsed.urlText,parsed.mode,parsed.options);console.log(`Configuration created for ${result.origin} (${result.mode}, project ${result.project}). No service has been started. Run: node scripts/selfhost.mjs start`);}
  else{const operands=process.argv.slice(3);if(action?.startsWith('snapshot-'))await ensureSnapshotDirectories(root);const child=spawn('docker',composeArgs(action,operands),{cwd:root,stdio:'inherit',shell:false,env:composeEnvironment(action,process.env,operands)});child.on('error',()=>{console.error('Docker with Compose is required.');process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});}
 }catch(e){console.error(e.message);process.exitCode=1;}
}
