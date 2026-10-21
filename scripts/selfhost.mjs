import {createHash,randomBytes} from 'node:crypto';
import {mkdir,writeFile,access,readFile,rename,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isIP} from 'node:net';
import {spawn} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const projectPattern=/^[a-z0-9][a-z0-9_-]{0,62}$/;
const basenamePattern=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const snapshotIdPattern=/^sha256:[0-9a-f]{64}$/;
const bookIdPattern=/^[a-z0-9][a-z0-9-]{0,127}$/;
const languagePattern=/^[a-z][a-z0-9-]{0,15}$/;
const emailPattern=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const bootstrapPattern=/^[0-9a-f]{64}$/;
const accountAccessCodePattern=/^pr1-[A-Za-z0-9_-]{43}$/;
const dnsLabelPattern=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const edgeSecretPattern=/^[A-Za-z0-9_-]{43,128}$/;
const runtimeEnvironmentKeys=new Set([
 'COMPOSE_PROJECT_NAME','APP_URL','NODE_ENV','PORT','POSTGRES_PASSWORD','DATABASE_URL','AUTH_SECRET','MIRROR_MODE',
 'MAIL_TRANSPORT','MAIL_FROM','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','BREVO_API_KEY',
 'DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','FACEBOOK_CLIENT_ID','FACEBOOK_CLIENT_SECRET','COMMUNITY_BOOTSTRAP_HASH','ACCOUNT_ACCESS_HASH',
 'REGISTRATIONS_OPEN','FORUM_OPEN','PUBLIC_OPERATOR_NAME','PUBLIC_PRIVACY_CONTACT','BIND_ADDRESS','LOCAL_UID','LOCAL_GID',
 'HTTPS_PORT','HTTP_PORT','LOCAL_HTTPS_PORT','EDGE_SHARED_SECRET','EDGE_PUBLIC_ORIGIN','EDGE_UPSTREAM_ORIGIN','EDGE_ORIGIN_ACTIVE',
]);
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
 const env=[`COMPOSE_PROJECT_NAME=${project}`,`APP_URL=${url.origin}`,'NODE_ENV=production','PORT=8000',`POSTGRES_PASSWORD=${password}`,`DATABASE_URL=postgresql://polisrossa:${password}@localhost/polisrossa?host=%2Fvar%2Frun%2Fpostgresql`,`AUTH_SECRET=${secret}`,`MIRROR_MODE=${mode==='mirror'}`,'MAIL_TRANSPORT=none','MAIL_FROM=','SMTP_HOST=','SMTP_PORT=465','SMTP_USER=','SMTP_PASSWORD=','BREVO_API_KEY=','DISCORD_CLIENT_ID=','DISCORD_CLIENT_SECRET=','FACEBOOK_CLIENT_ID=','FACEBOOK_CLIENT_SECRET=','COMMUNITY_BOOTSTRAP_HASH=','ACCOUNT_ACCESS_HASH=','REGISTRATIONS_OPEN=false','FORUM_OPEN=false','PUBLIC_OPERATOR_NAME=','PUBLIC_PRIVACY_CONTACT=','BIND_ADDRESS=127.0.0.1',`LOCAL_UID=${process.getuid?.()??1000}`,`LOCAL_GID=${process.getgid?.()??1000}`,`HTTPS_PORT=${httpsPort}`,`HTTP_PORT=${httpPort}`,'LOCAL_HTTPS_PORT=','EDGE_SHARED_SECRET=','EDGE_PUBLIC_ORIGIN=','EDGE_UPSTREAM_ORIGIN=','EDGE_ORIGIN_ACTIVE=false'];
 await writeFile(resolve(state,'runtime.env'),env.join('\n')+'\n',{flag:'wx',mode:0o600});
 // HTTP redirects are disabled during local preparation; only HTTPS is served.
 const local=url.hostname==='localhost';
 await writeFile(resolve(state,'Caddyfile'),`{\n auto_https disable_redirects\n}\n${url.hostname}:443 {\n${local?' tls internal\n':''} reverse_proxy app:8000\n}\n`,{flag:'wx',mode:0o600});
 await writeFile(resolve(state,'recipients.txt'),'# Public age1 recipients only. Never put private keys here.\n',{flag:'wx',mode:0o600});
 await mkdir(resolve(state,'backups'),{mode:0o700});
 await ensureSnapshotDirectories(directory);
 return {origin:url.origin,mode,project,httpPort,httpsPort};
}
function runtimeEnvironment(content){
 const env={};
 for(const [index,line] of content.split(/\r?\n/).entries()){
  if(!line.trim()||line.trimStart().startsWith('#'))continue;
  const match=/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
  if(!match)throw Error(`Invalid runtime.env entry on line ${index+1}`);
  if(Object.hasOwn(env,match[1]))throw Error(`Duplicate runtime.env entry: ${match[1]}`);
  let value=match[2].trim();
  if(value.length>=2&&((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))))value=value.slice(1,-1);
  env[match[1]]=value;
 }
 return env;
}
function setRuntimeValue(content,key,value){
 if(/[\r\n]/.test(value))throw Error('Runtime values must use one line');
 const eol=content.includes('\r\n')?'\r\n':'\n',lines=content.replace(/\r?\n$/,'').split(/\r?\n/),matches=[];
 for(let index=0;index<lines.length;index++)if(lines[index].startsWith(key+'='))matches.push(index);
 if(matches.length>1)throw Error(`Duplicate runtime.env entry: ${key}`);
 if(matches.length)lines[matches[0]]=`${key}=${value}`;else lines.push(`${key}=${value}`);
 return lines.join(eol)+eol;
}
async function replacePrivateFile(path,content){
 const temporary=path+`.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
 await writeFile(temporary,content,{flag:'wx',mode:0o600});
 try{await rename(temporary,path);}catch(error){try{await unlink(temporary);}catch{}throw error;}
}
function invitationCodes(content){
 const found=new Map();
 for(const [index,line] of content.split(/\r?\n/).entries()){
  if(!line.trim()||line.startsWith('#'))continue;
  const match=/^([1-3])=(pr2-[A-Za-z0-9_-]{43})$/.exec(line);
  if(!match||found.has(match[1]))throw Error(`Invalid founder invitation file on line ${index+1}`);
  found.set(match[1],match[2]);
 }
 if(found.size!==3)throw Error('Founder invitation file must contain exactly three codes');
 return ['1','2','3'].map(slot=>found.get(slot));
}
async function optionalInvitationCodes(path){
 try{return invitationCodes(await readFile(path,'utf8'));}catch(error){if(error?.code==='ENOENT')return null;throw error;}
}
const invitationHashes=codes=>codes.map(code=>createHash('sha256').update(code).digest('hex'));
export async function createFounderInvitations(directory){
 const state=resolve(directory,'.selfhost'),runtimePath=resolve(state,'runtime.env'),privateDirectory=resolve(state,'private'),invitationPath=resolve(privateDirectory,'community-founder-invites.txt');
 const content=await readFile(runtimePath,'utf8'),env=runtimeEnvironment(content);
 if(env.MIRROR_MODE!=='false')throw Error('Founder invitations can only be prepared for a primary installation');
 await mkdir(privateDirectory,{recursive:true,mode:0o700});
 let codes=await optionalInvitationCodes(invitationPath),created=false;
 const configured=env.COMMUNITY_BOOTSTRAP_HASH??'';
 if(configured){
  const hashes=configured.split(',');
  if(hashes.length!==3||hashes.some(hash=>!bootstrapPattern.test(hash))||new Set(hashes).size!==3)throw Error('COMMUNITY_BOOTSTRAP_HASH must contain three distinct SHA-256 hashes');
  if(!codes)throw Error('Bootstrap hashes already exist but the private invitation file is missing; codes cannot be recovered or replaced safely');
  if(invitationHashes(codes).join(',')!==configured)throw Error('The private invitation codes do not match COMMUNITY_BOOTSTRAP_HASH');
  return {created:false,count:3,path:invitationPath};
 }
 if(!codes){
  codes=Array.from({length:3},()=>`pr2-${randomBytes(32).toString('base64url')}`);
  if(new Set(codes).size!==3)throw Error('Could not generate distinct founder invitations');
  const file=['# PolisRossa PR2 founder invitations (plaintext secrets).','# Give one different code to each founder through a private channel.','# Never commit, publish, email in bulk, or paste this file into a chat.',...codes.map((code,index)=>`${index+1}=${code}`),''].join('\n');
  await writeFile(invitationPath,file,{flag:'wx',mode:0o600});created=true;
 }
 await replacePrivateFile(runtimePath,setRuntimeValue(content,'COMMUNITY_BOOTSTRAP_HASH',invitationHashes(codes).join(',')));
 return {created,count:3,path:invitationPath};
}
function accountAccessCode(content){
 const values=content.split(/\r?\n/).filter(line=>line&&!line.startsWith('#'));
 if(values.length!==1||!accountAccessCodePattern.test(values[0]))throw Error('Invalid private account access code file');
 return values[0];
}
async function optionalAccountAccessCode(path){
 try{return accountAccessCode(await readFile(path,'utf8'));}catch(error){if(error?.code==='ENOENT')return null;throw error;}
}
export async function createAccountAccessCode(directory){
 const state=resolve(directory,'.selfhost'),runtimePath=resolve(state,'runtime.env'),privateDirectory=resolve(state,'private'),codePath=resolve(privateDirectory,'account-access-code.txt');
 const content=await readFile(runtimePath,'utf8'),env=runtimeEnvironment(content);
 if(env.MIRROR_MODE!=='false')throw Error('Account access can only be prepared for a primary installation');
 await mkdir(privateDirectory,{recursive:true,mode:0o700});
 let code=await optionalAccountAccessCode(codePath),created=false;
 const configured=env.ACCOUNT_ACCESS_HASH??'';
 if(configured){
  if(!bootstrapPattern.test(configured))throw Error('ACCOUNT_ACCESS_HASH must contain one SHA-256 hash');
  if(!code)throw Error('The account access hash exists but the private code file is missing; do not replace it silently');
  if(createHash('sha256').update(code).digest('hex')!==configured)throw Error('The private account access code does not match ACCOUNT_ACCESS_HASH');
  return {created:false,path:codePath};
 }
 if(!code){
  code=`pr1-${randomBytes(32).toString('base64url')}`;
  await writeFile(codePath,['# PolisRossa initial account access code (plaintext secret).','# Share only through a private channel; rotate it if it becomes public.',code,''].join('\n'),{flag:'wx',mode:0o600});created=true;
 }
 await replacePrivateFile(runtimePath,setRuntimeValue(content,'ACCOUNT_ACCESS_HASH',createHash('sha256').update(code).digest('hex')));
 return {created,path:codePath};
}
function senderAddress(value){return (value.match(/<([^<>]+)>$/)?.[1]??value).trim();}
function publicHttpsOrigin(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash&&!url.port&&url.hostname.includes('.')&&!url.hostname.endsWith('.localhost')&&url.hostname!=='localhost'&&!url.hostname.endsWith('.local')&&!isIP(url.hostname)?url:null;}catch{return null;}
}
function workersDevHttpsOrigin(value){
 const url=publicHttpsOrigin(value);if(!url)return null;
 const labels=url.hostname.split('.');
 return labels.length===4&&labels[2]==='workers'&&labels[3]==='dev'&&labels.slice(0,2).every(label=>dnsLabelPattern.test(label))?url:null;
}
function tailscaleFunnelOrigin(value){
 const url=publicHttpsOrigin(value);if(!url)return null;
 const labels=url.hostname.split('.');
 return labels.length>=3&&labels.at(-2)==='ts'&&labels.at(-1)==='net'&&labels.slice(0,-2).every(label=>dnsLabelPattern.test(label))?url:null;
}
function validEdgeSecret(value){
 if(!edgeSecretPattern.test(value))return false;
 try{return Buffer.from(value,'base64url').length>=32;}catch{return false;}
}
export function tunnelCaddyConfiguration(origin){
 const url=publicHttpsOrigin(origin);if(!url)throw Error('Use a public HTTPS origin without path, port, credentials or an IP address');
 // Funnel terminates public TLS. Caddy deliberately uses its private CA only
 // on the loopback hop and accepts both the public Host header and localhost.
 const httpsHosts=['localhost',url.hostname].map(host=>`https://${host}:443`).join(', ');
 const httpHosts=['localhost',url.hostname].map(host=>`http://${host}:80`).join(', ');
 return `{
 auto_https disable_redirects
 servers {
  trusted_proxies static private_ranges
  trusted_proxies_strict
 }
}
${httpsHosts} {
 tls internal
 reverse_proxy app:8000 {
  header_up X-Forwarded-For {client_ip}
 }
}
${httpHosts} {
 redir ${url.origin}{uri} permanent
}
`;
}
export async function configureTunnelOrigin(directory,origin){
 const state=resolve(directory,'.selfhost'),runtimePath=resolve(state,'runtime.env'),caddyPath=resolve(state,'Caddyfile');
 const content=await readFile(runtimePath,'utf8'),env=runtimeEnvironment(content),url=publicHttpsOrigin(origin);
 if(!url)throw Error('Use a public HTTPS origin without path, port, credentials or an IP address');
 if(env.BIND_ADDRESS!=='127.0.0.1')throw Error('Tunnel publication requires BIND_ADDRESS=127.0.0.1');
 await replacePrivateFile(caddyPath,tunnelCaddyConfiguration(url.origin));
 let next=setRuntimeValue(content,'APP_URL',url.origin);next=setRuntimeValue(next,'EDGE_ORIGIN_ACTIVE','false');
 if(tailscaleFunnelOrigin(url.origin))next=setRuntimeValue(next,'EDGE_UPSTREAM_ORIGIN',url.origin);
 await replacePrivateFile(runtimePath,next);
 return {origin:url.origin,caddyPath,runtimePath};
}
export function edgeOriginCaddyConfiguration(edgeOrigin,upstreamOrigin){
 const edge=workersDevHttpsOrigin(edgeOrigin),upstream=tailscaleFunnelOrigin(upstreamOrigin);
 if(!edge)throw Error('Use a workers.dev HTTPS origin in the form https://worker.account.workers.dev, without a path or port');
 if(!upstream)throw Error('The edge origin requires an existing public Tailscale Funnel HTTPS origin under ts.net');
 const httpsHosts=[...new Set(['localhost',upstream.hostname,edge.hostname])].map(host=>`https://${host}:443`).join(', ');
 return `{
 auto_https disable_redirects
}
${httpsHosts} {
 tls internal
 @edge {
  header X-Agoranode-Edge-Key {$EDGE_SHARED_SECRET}
  header X-Agoranode-Client-IP *
 }
 handle @edge {
  route {
   vars edge_client_ip {http.request.header.X-Agoranode-Client-IP}
   request_header -Forwarded
   request_header -X-Forwarded-*
   request_header -X-Real-IP
   request_header -CF-Connecting-IP
   request_header -True-Client-IP
   request_header -X-Agoranode-*
   reverse_proxy app:8000 {
    header_up X-Forwarded-For {vars.edge_client_ip}
    header_up X-Forwarded-Proto https
    header_up X-Forwarded-Host ${edge.hostname}
    header_up Host ${edge.hostname}
   }
  }
 }
 handle {
  header Cache-Control "no-store"
  respond "" 403
 }
}
https://localhost:444 {
 tls internal
 route {
  request_header -Forwarded
  request_header -X-Forwarded-*
  request_header -X-Real-IP
  request_header -CF-Connecting-IP
  request_header -True-Client-IP
  request_header -X-Agoranode-*
  reverse_proxy app:8000 {
   header_up X-Forwarded-For {remote_host}
   header_up X-Forwarded-Proto https
   header_up X-Forwarded-Host localhost
  }
 }
}
http:// {
 redir ${edge.origin}{uri} permanent
}
`;
}
export function parseEdgeOriginArgs(args){
 const positional=[],options={activate:false};
 for(let index=0;index<args.length;index++){
  const value=args[index];
  if(value==='--activate'){
   if(options.activate)throw Error('Duplicate option: --activate');options.activate=true;
  }else if(value==='--local-https-port'){
   const next=args[++index];if(!next||next.startsWith('--'))throw Error('Missing value for --local-https-port');
   if(options.localHttpsPort!==undefined)throw Error('Duplicate option: --local-https-port');options.localHttpsPort=port(next,'Local HTTPS port');
  }else if(value.startsWith('--'))throw Error('Unknown edge-origin option: '+value);
  else positional.push(value);
 }
 if(positional.length!==1)throw Error('Use edge-origin https://worker.account.workers.dev [--activate] [--local-https-port 9443]');
 return {origin:positional[0],options};
}
export async function configureEdgeOrigin(directory,origin,options={}){
 const state=resolve(directory,'.selfhost'),runtimePath=resolve(state,'runtime.env'),caddyPath=resolve(state,'Caddyfile'),stagedPath=resolve(state,'Caddyfile.edge-origin');
 const content=await readFile(runtimePath,'utf8'),env=runtimeEnvironment(content),edge=workersDevHttpsOrigin(origin);
 if(!edge)throw Error('Use a workers.dev HTTPS origin in the form https://worker.account.workers.dev, without a path or port');
 if(env.MIRROR_MODE!=='false')throw Error('An edge origin can only be activated for a primary installation');
 if(env.BIND_ADDRESS!=='127.0.0.1')throw Error('Edge publication requires BIND_ADDRESS=127.0.0.1');
 if(env.EDGE_ORIGIN_ACTIVE==='true'&&!options.activate)throw Error('The edge origin is already active; use --activate to update it or tunnel-origin to roll back');
 const upstream=tailscaleFunnelOrigin(env.EDGE_UPSTREAM_ORIGIN||env.APP_URL);
 if(!upstream)throw Error('Prepare Tailscale Funnel with tunnel-origin before configuring the workers.dev edge');
 const configuredSecret=env.EDGE_SHARED_SECRET??'';
 if(configuredSecret&&!validEdgeSecret(configuredSecret))throw Error('EDGE_SHARED_SECRET is invalid; keep a base64url secret of at least 32 random bytes');
 if(options.activate&&(!configuredSecret||env.EDGE_PUBLIC_ORIGIN!==edge.origin||env.EDGE_UPSTREAM_ORIGIN!==upstream.origin))throw Error('Prepare this edge origin without --activate first, configure the Worker with its private secret, then activate it');
 const secret=configuredSecret||randomBytes(32).toString('base64url'),secretCreated=!configuredSecret;
 const localHttpsPort=port(options.localHttpsPort??(env.LOCAL_HTTPS_PORT||9443),'Local HTTPS port');
 if([Number(env.HTTPS_PORT),Number(env.HTTP_PORT)].includes(localHttpsPort))throw Error('Local HTTPS maintenance port must be different from HTTP_PORT and HTTPS_PORT');
 const caddy=edgeOriginCaddyConfiguration(edge.origin,upstream.origin);
 await replacePrivateFile(stagedPath,caddy);
 let next=content;
 for(const [key,value] of [['EDGE_SHARED_SECRET',secret],['EDGE_PUBLIC_ORIGIN',edge.origin],['EDGE_UPSTREAM_ORIGIN',upstream.origin]])next=setRuntimeValue(next,key,value);
 if(options.activate){
  next=setRuntimeValue(next,'LOCAL_HTTPS_PORT',String(localHttpsPort));next=setRuntimeValue(next,'EDGE_ORIGIN_ACTIVE','true');next=setRuntimeValue(next,'APP_URL',edge.origin);
  await replacePrivateFile(caddyPath,caddy);
 }else if(!env.EDGE_ORIGIN_ACTIVE)next=setRuntimeValue(next,'EDGE_ORIGIN_ACTIVE','false');
 await replacePrivateFile(runtimePath,next);
 return {origin:edge.origin,upstreamOrigin:upstream.origin,localHttpsPort,activated:Boolean(options.activate),secretCreated,stagedPath};
}
export async function publicationPreflight(directory){
 const state=resolve(directory,'.selfhost'),content=await readFile(resolve(state,'runtime.env'),'utf8'),env=runtimeEnvironment(content),checks=[];
 const add=(id,label,ok,detail)=>checks.push({id,label,ok,detail});
 const origin=publicHttpsOrigin(env.APP_URL??'');
 add('mode','Installazione primaria',env.MIRROR_MODE==='false','MIRROR_MODE deve essere false per ospitare dati privati.');
 add('runtime','Runtime di produzione',env.NODE_ENV==='production'&&Boolean(env.DATABASE_URL)&&Boolean(env.POSTGRES_PASSWORD)&&Boolean(env.AUTH_SECRET&&env.AUTH_SECRET.length>=32),'Servono produzione, database persistente e segreti locali generati.');
 add('origin','Origine HTTPS pubblica stabile',Boolean(origin),'APP_URL deve essere un nome HTTPS pubblico senza percorso né porta interna.');
 const workerOrigin=workersDevHttpsOrigin(env.APP_URL??'');
 if(workerOrigin||env.EDGE_ORIGIN_ACTIVE==='true'){
  let localPort=0;try{localPort=port(env.LOCAL_HTTPS_PORT,'Local HTTPS port');}catch{}
  const edgeReady=Boolean(workerOrigin&&env.EDGE_ORIGIN_ACTIVE==='true'&&env.EDGE_PUBLIC_ORIGIN===workerOrigin.origin&&tailscaleFunnelOrigin(env.EDGE_UPSTREAM_ORIGIN)&&validEdgeSecret(env.EDGE_SHARED_SECRET??'')&&env.BIND_ADDRESS==='127.0.0.1'&&localPort!==Number(env.HTTP_PORT)&&localPort!==Number(env.HTTPS_PORT));
  add('edge-origin','Ingresso Worker protetto e manutenzione locale',edgeReady,'La modalità edge richiede workers.dev coerente con APP_URL, segreto privato valido, origine Funnel ts.net e una porta di manutenzione distinta su loopback.');
 }
 const operator=Boolean(env.PUBLIC_OPERATOR_NAME?.trim()&&env.PUBLIC_OPERATOR_NAME.trim().length<=200&&!/[\r\n]/.test(env.PUBLIC_OPERATOR_NAME));
 const privacy=Boolean(env.PUBLIC_PRIVACY_CONTACT&&emailPattern.test(env.PUBLIC_PRIVACY_CONTACT));
 add('operator','Gestore e contatto privacy pubblici',operator&&privacy,'Compilare PUBLIC_OPERATOR_NAME e un indirizzo PUBLIC_PRIVACY_CONTACT operativo.');
 const transport=env.MAIL_TRANSPORT??'none',fromAddress=senderAddress(env.MAIL_FROM??''),mailFrom=Boolean(env.MAIL_FROM&&!/[\r\n]/.test(env.MAIL_FROM)&&emailPattern.test(fromAddress));
 const smtpHost=(env.SMTP_HOST??'').trim().toLowerCase(),smtpUser=(env.SMTP_USER??'').trim();
 const gmailIdentity=smtpHost!=='smtp.gmail.com'||(emailPattern.test(smtpUser)&&smtpUser.toLowerCase()===fromAddress.toLowerCase());
 const smtp=transport==='smtp'&&Boolean(smtpHost)&&['465','587'].includes(env.SMTP_PORT??'465')&&Boolean(smtpUser)&&Boolean(env.SMTP_PASSWORD)&&mailFrom&&gmailIdentity;
 const brevo=transport==='brevo'&&Boolean(env.BREVO_API_KEY)&&mailFrom;
 add('mail','Conferma e recupero email configurati',smtp||brevo,transport==='smtp'?(smtpHost==='smtp.gmail.com'&&!gmailIdentity?'Per Gmail, SMTP_USER e MAIL_FROM devono usare la stessa casella verificata.':'SMTP richiede host, porta TLS 465 o STARTTLS 587, utente, password per app e mittente.'):(transport==='brevo'?'Brevo richiede API key e mittente verificato.':'Scegliere un trasporto email e collaudare un messaggio reale.'));
 const facebook={name:'FACEBOOK',id:Boolean(env.FACEBOOK_CLIENT_ID),secret:Boolean(env.FACEBOOK_CLIENT_SECRET)},discord=Boolean(env.DISCORD_CLIENT_ID||env.DISCORD_CLIENT_SECRET),forumOpen=env.FORUM_OPEN==='true';
 const partial=facebook.id!==facebook.secret,complete=facebook.id&&facebook.secret?[facebook]:[];
 const socialLabel=facebook.id?'Facebook OAuth configurato per PR2':'PR1 pronto; Facebook OAuth non ancora configurato';
 add('social',socialLabel,!partial&&!discord&&(!forumOpen||facebook.id),discord?'Discord non è usato per PR1 o PR2: rimuovere le relative credenziali.':partial?'Facebook richiede client ID e client secret insieme.':facebook.id?'Facebook è configurato per autenticare le domande PR2.':'Facebook non è configurato: configurarlo prima di aprire FORUM_OPEN; PR1 continua a usare soltanto email e password.');
 const hashes=(env.COMMUNITY_BOOTSTRAP_HASH??'').split(',').filter(Boolean),validHashes=hashes.length===3&&hashes.every(hash=>bootstrapPattern.test(hash))&&new Set(hashes).size===3;
 add('founders','Tre inviti fondatori predisposti',validHashes,'Eseguire community-invites prima del collaudo PR2.');
 let invitations='missing';
 try{const codes=await optionalInvitationCodes(resolve(state,'private','community-founder-invites.txt'));if(codes)invitations=validHashes&&invitationHashes(codes).join(',')===hashes.join(',')?'matching':'mismatch';}catch{invitations='invalid';}
 add('founder-file','Inviti fondatori privati coerenti',invitations==='matching','Il file privato deve esistere, essere valido e corrispondere ai tre hash configurati.');
 const accountHash=env.ACCOUNT_ACCESS_HASH??'';let accountAccess=accountHash?'missing':'disabled';
 if(accountHash)try{const code=await optionalAccountAccessCode(resolve(state,'private','account-access-code.txt'));if(code)accountAccess=bootstrapPattern.test(accountHash)&&createHash('sha256').update(code).digest('hex')===accountHash?'matching':'mismatch';}catch{accountAccess='invalid';}
 add('account-access','Codice privato account facoltativo',['disabled','matching'].includes(accountAccess),'Se ACCOUNT_ACCESS_HASH è configurato, il file privato deve esistere e corrispondere; lasciarlo vuoto apre le nuove registrazioni senza codice condiviso. Il recupero password non usa questa barriera.');
 const callbacks=origin?complete.map(provider=>`${origin.origin}/api/identity/callback/${provider.name.toLowerCase()}`):[];
 return {ready:checks.every(check=>check.ok),checks,callbacks,registrationsOpen:env.REGISTRATIONS_OPEN==='true',forumOpen:env.FORUM_OPEN==='true',invitations,accountAccess};
}
export function formatPublicationPreflight(result){
 const lines=['Preflight pubblicazione completa (nessun segreto viene mostrato):'];
 for(const check of result.checks)lines.push(`${check.ok?'[OK]':'[BLOCCO]'} ${check.label}${check.ok?'':' — '+check.detail}`);
 for(const callback of result.callbacks)lines.push(`[CALLBACK] ${callback}`);
 lines.push(`[STATO] Registrazioni ${result.registrationsOpen?'aperte':'chiuse'}; forum ${result.forumOpen?'aperto':'chiuso'}.`);
 if(result.invitations!=='matching')lines.push(`[ATTENZIONE] File privato inviti fondatori: ${result.invitations}. Non rigenerare codici già distribuiti.`);
 if(!['disabled','matching'].includes(result.accountAccess))lines.push(`[ATTENZIONE] Codice privato account: ${result.accountAccess}. Correggerlo o disabilitarlo prima di aprire i flussi email.`);
 lines.push(result.ready?'Configurazione statica pronta. Lascia i flag chiusi finché email e PR2 non superano il collaudo reale; Facebook OAuth deve essere collaudato prima di aprire FORUM_OPEN.':'Configurazione non pronta: risolvi tutti i blocchi lasciando chiusi i flag.');
 return lines.join('\n');
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
 const commands={start:['up','-d','--build','--wait','--force-recreate'],stop:['stop'],status:['ps'],logs:['logs','--tail','80'],backup:['run','--build','--rm','-T','backup'],certificate:['cp','proxy:/data/caddy/pki/authorities/local/root.crt','.selfhost/local-root.crt'],'knowledge-import':['run','--rm','-T','knowledge-import'],'mail-status':['run','--rm','-T','mail-limits','status'],'mail-reset':['run','--rm','-T','mail-limits','reset'],'snapshot-keygen':['run','--rm','-T','--no-deps','snapshot-sign','keygen'],'snapshot-status':['run','--rm','-T','snapshot-db','status']};
 if(action==='snapshot-export'){
  snapshotExportOptions(operands);
  return [...base,'run','--rm','-T','--no-deps','snapshot-sign','export'];
 }
 if(['snapshot-verify','snapshot-import'].includes(action)){
  if(operands.length!==2||!operands.every(validSnapshotBasename))throw Error(`${action} requires a snapshot basename and a public-key basename`);
  return [...base,'run','--rm','-T',...(action==='snapshot-verify'?['--no-deps','snapshot']:['snapshot-db']),action.slice('snapshot-'.length),...operands];
 }
 if(action==='library-import'){
  if(operands.length!==2||!bookIdPattern.test(operands[0])||!languagePattern.test(operands[1]))throw Error('library-import requires a catalogue book ID and language');
  return [...base,'run','--rm','-T','library-import',...operands];
 }
 if(operands.length)throw Error('Unexpected command arguments');
 if(!commands[action])throw Error('Use init, tunnel-origin, edge-origin, start, stop, status, logs, backup, certificate, mail-status, mail-reset, library-import, knowledge-import or a snapshot-* command');
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
 // The private runtime file is authoritative. Shell variables with common
 // names must not change the database, listening address, ports or secrets of
 // the saved installation. Docker-related variables remain available, while
 // Compose and snapshot controls are set only by this wrapper.
 for(const key of Object.keys(env)){
  const upper=key.toUpperCase();
  if(runtimeEnvironmentKeys.has(upper)||upper.startsWith('COMPOSE_')||upper.startsWith('SNAPSHOT_'))delete env[key];
 }
 // Snapshot mounts are writable only for the one operation that creates their
 // files.
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
  else if(action==='tunnel-origin'){
   if(process.argv.length!==4)throw Error('Use tunnel-origin https://public-name.example');
   const result=await configureTunnelOrigin(root,process.argv[3]);console.log(`Private runtime origin and Caddy tunnel host updated to ${result.origin}. Restart the stack before enabling the tunnel.`);
  }else if(action==='edge-origin'){
   const parsed=parseEdgeOriginArgs(process.argv.slice(3)),result=await configureEdgeOrigin(root,parsed.origin,parsed.options);
   if(result.activated)console.log(`Edge origin activated for ${result.origin}; local maintenance remains on loopback port ${result.localHttpsPort}. No secret was printed. Restart the stack only after the Worker is configured.`);
   else console.log(`Edge origin prepared for ${result.origin}. APP_URL and the active Caddy configuration were not changed. The edge secret remains only in the private runtime file and was not printed. Configure and test the Worker, then repeat with --activate.`);
  }else if(action==='community-invites'){
   if(process.argv.length!==3)throw Error('community-invites does not accept arguments');
   const result=await createFounderInvitations(root);console.log(`${result.created?'Created':'Verified'} ${result.count} founder invitations in the private file ${result.path}. The codes were not printed.`);
  }else if(action==='account-access'){
   if(process.argv.length!==3)throw Error('account-access does not accept arguments');
   const result=await createAccountAccessCode(root);console.log(`${result.created?'Created':'Verified'} the private account access code in ${result.path}. The code was not printed.`);
  }else if(action==='preflight'){
   if(process.argv.length!==3)throw Error('preflight does not accept arguments');
   const result=await publicationPreflight(root);console.log(formatPublicationPreflight(result));if(!result.ready)process.exitCode=2;
  }
  else{const operands=process.argv.slice(3);if(action?.startsWith('snapshot-'))await ensureSnapshotDirectories(root);const child=spawn('docker',composeArgs(action,operands),{cwd:root,stdio:'inherit',shell:false,env:composeEnvironment(action,process.env,operands)});child.on('error',()=>{console.error('Docker with Compose is required.');process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});}
 }catch(e){console.error(e.message);process.exitCode=1;}
}
