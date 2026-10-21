import {validSocialIdentity,type SocialIdentity} from './social-identity.ts';
import {normalizeApplicantReferenceUrl} from './applicant-reference.ts';
import {COMMUNITY_CATEGORIES,proposalId} from './community-model.ts';
import {VOTING_METHODS,validChoices,tally,type Member,type ForumTopic,type Admission,type Ballot,type VotingMethod} from './forum-model.ts';
import DECISIONS from '../data/community-decisions.json' with {type:'json'};
type Row=Record<string,unknown>;
type Result={results:Row[];meta?:{changes?:number};changes?:number|bigint};
type Statement={bind(...values:unknown[]):Statement;all():Promise<Result>;run():Promise<Partial<Result>>};
export type ForumDatabase={prepare(sql:string):Statement;batch(statements:Statement[]):Promise<Partial<Result>[]>};
const headers={'cache-control':'private, no-store',vary:'cookie'};
const hidden=Object.entries(DECISIONS as Record<string,{status:string}>).filter(([,value])=>value.status==='hidden').map(([id])=>id);
const language=(x:unknown):x is string=>typeof x==='string'&&/^[a-z]{2,3}(?:-[a-zA-Z]{2,4})?$/.test(x);
const text=(x:unknown,min:number,max:number):x is string=>typeof x==='string'&&x.trim().length>=min&&x.trim().length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);
const count=(x:unknown)=>Number(x??0);
const changed=(x:Partial<Result>)=>Number(x.meta?.changes??x.changes??0)>0;
const digest=async(value:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const member=(r:Row):Member=>({id:String(r.id),alias:String(r.alias),intro:String(r.intro),referenceUrl:typeof r.reference_url==='string'?r.reference_url:null,identityName:String(r.identity_name),identityKind:r.identity_kind as Member['identityKind'],identityUrl:String(r.identity_url),identityProvider:r.identity_provider?String(r.identity_provider):null,language:String(r.language),status:String(r.status),createdAt:count(r.created_at),deadline:count(r.deadline),admittedAt:r.admitted_at===null?null:count(r.admitted_at)});
const safeEqual=(a:string,b:string)=>{if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0;};
const topicSelect=`SELECT t.*,m.alias AS author,(SELECT COUNT(*) FROM forum_electorate e WHERE e.topic_id=t.id) AS eligible,(SELECT COUNT(*) FROM forum_ballots b WHERE b.topic_id=t.id) AS turnout FROM forum_topics t JOIN forum_members m ON m.id=t.author_id`;
function publicTopic(r:Row,now:number,memberId?:string):ForumTopic{const discussion=JSON.parse(String(r.options_json)).length===0;return {private:count(r.private)===1,kind:discussion?'discussion':'proposal',id:String(r.id),author:String(r.author),title:String(r.title),body:String(r.body),references:String(r.references_text),category:String(r.category),language:String(r.language),options:JSON.parse(String(r.options_json)),method:r.method as VotingMethod,quorum:count(r.quorum),createdAt:count(r.created_at),startsAt:count(r.starts_at),endsAt:count(r.ends_at),eligible:count(r.eligible),turnout:count(r.turnout),phase:r.withdrawn?'withdrawn':discussion?'discussion':now<count(r.starts_at)?'discussion':now<count(r.ends_at)?'voting':'closed',own:r.author_id===memberId,decision:(DECISIONS as Record<string,import('./community-model.ts').CommunityDecision>)[String(r.id)]??null};}

export async function handleForum(request:Request,db:ForumDatabase|undefined,userId:string|null,bootstrapHash?:string,clock=Date.now,socialIdentity?:SocialIdentity|null,unlinkSocialIdentity?:()=>Promise<void>,accountVerified=true):Promise<Response>{
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
 const bootstrapHashes=(bootstrapHash??'').split(',').filter(value=>/^[0-9a-f]{64}$/.test(value)).slice(0,3);
 const url=new URL(request.url),signInUrl='/account?return_to=%2F%3Fview%3Dpartecipa';
 if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 if(request.method==='POST'&&!userId)return reply({authenticated:false,signInUrl},401);
 if(!db)return reply({error:'La comunità è temporaneamente non disponibile. Nessuna modifica è stata salvata.'},503);
 let now=clock();
 const sql=(query:string,...values:unknown[])=>db.prepare(query).bind(...values);
 const all=async(query:string,...values:unknown[])=>(await sql(query,...values).all()).results;
 try{
  const owner=userId?await digest('internazionale-rossa:forum:'+userId):null;
  // Admission expiry is derived in reads and enforced in writes; public reads do not mutate data.
  const ownRow=owner?(await all('SELECT * FROM forum_members WHERE owner_key=?',owner))[0]:null;
  const own=ownRow?member(ownRow):null;
  if(own?.status==='pending'&&own.deadline<=now)own.status='rejected';
  const active=own?.status==='active';
  if(request.method==='GET'){
   const kind=url.searchParams.get('kind')??'board';
   const allowed=kind==='board'?['kind','offset','category','applicationsOffset']:kind==='topic'?['kind','id','commentsOffset']:kind==='export'?['kind','id']:[];
   if(!allowed.length||[...url.searchParams.keys()].some(key=>!allowed.includes(key)||url.searchParams.getAll(key).length!==1))return reply({error:'Invalid query'},400);
   if(kind==='board'){
    const offset=Number(url.searchParams.get('offset')??0),applicationsOffset=Number(url.searchParams.get('applicationsOffset')??0),category=url.searchParams.get('category')??'all';
    if(![offset,applicationsOffset].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=100000)||(category!=='all'&&!Object.hasOwn(COMMUNITY_CATEGORIES,category)))return reply({error:'Invalid filters'},400);
    const [counts,bootstrap,rows,candidates]=await Promise.all([
     all("SELECT SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN status='pending' AND deadline>? THEN 1 ELSE 0 END) AS pending FROM forum_members",now),
     all('SELECT id FROM forum_bootstrap'),
     all(topicSelect+` WHERE t.withdrawn=0${active?'':' AND t.private=0'}${hidden.length?` AND t.id NOT IN (${hidden.map(()=>'?').join(',')})`:''}${category==='all'?'':' AND t.category=?'} ORDER BY t.created_at DESC,t.id LIMIT 21 OFFSET ?`,...hidden,...(category==='all'?[]:[category]),offset),
     active?all("SELECT * FROM forum_members WHERE status='pending' AND deadline>? ORDER BY created_at,id LIMIT 21 OFFSET ?",now,applicationsOffset):Promise.resolve([]),
    ]);
    const applications:Admission[]=await Promise.all(candidates.slice(0,20).map(async row=>{
     const id=String(row.id),[totals,vote]=await Promise.all([
      all('SELECT SUM(CASE WHEN value=1 THEN 1 ELSE 0 END) AS yes,SUM(CASE WHEN value=-1 THEN 1 ELSE 0 END) AS no FROM forum_admission_votes WHERE candidate_id=?',id),
      all('SELECT value FROM forum_admission_votes WHERE candidate_id=? AND member_id=?',id,own!.id),
     ]);const total=totals[0];return {member:member(row),eligible:count(counts[0].active),yes:count(total.yes),no:count(total.no),threshold:3,myVote:vote.length?count(vote[0].value):null,canVote:Boolean(active&&id!==own!.id&&!vote.length)};
    }));
    return reply({authenticated:Boolean(userId),signInUrl,member:own,activeCount:count(counts[0].active),pendingCount:count(counts[0].pending),bootstrapAvailable:Boolean(bootstrapHashes.some((_,index)=>!bootstrap.some(row=>count(row.id)===index+1))&&count(counts[0].active)<3),topics:rows.slice(0,20).map(r=>publicTopic(r,now,own?.id)),nextOffset:rows.length>20?offset+20:null,applications,applicationsNextOffset:candidates.length>20?applicationsOffset+20:null,serverNow:now});
   }
   const id=url.searchParams.get('id');if(!proposalId(id))return reply({error:'Invalid topic'},400);
   const raw=(await all(topicSelect+' WHERE t.id=?',id))[0];if(!raw||count(raw.withdrawn)===1||hidden.includes(id)||(!active&&count(raw.private)===1))return reply({error:'Discussione non disponibile.'},404);
   const topic=publicTopic(raw,now,own?.id),closed=topic.phase==='closed';
   let ballots:(Ballot&{voter:{id:string;name:string;kind:string}})[]=[],result=null;
   if(closed){const rows=await all('SELECT b.receipt,b.choices_json,m.id,m.alias AS voter_name,m.identity_kind FROM forum_ballots b JOIN forum_members m ON m.id=b.member_id WHERE b.topic_id=? ORDER BY b.receipt',id);ballots=rows.map(row=>({receipt:String(row.receipt),choices:JSON.parse(String(row.choices_json)),voter:{id:String(row.id),name:String(row.voter_name),kind:String(row.identity_kind)}}));result=tally(topic.method,topic.options.length,ballots.map(b=>b.choices),topic.eligible,topic.quorum);}
   if(kind==='export'){
    if(!closed)return reply({error:'Le schede nominative saranno pubblicate alla scadenza.'},409);
    const rules={id:topic.id,title:topic.title,options:topic.options,method:topic.method,quorum:topic.quorum,startsAt:topic.startsAt,endsAt:topic.endsAt,eligible:topic.eligible};
    const events=(await all("SELECT sequence,kind,detail FROM forum_events WHERE entity_id=? AND kind IN ('topic','electorate-added','ballot-cast','ballot-replaced','ballot-revoked') ORDER BY sequence",id)).map(row=>({sequence:row.sequence,kind:row.kind,detail:JSON.parse(String(row.detail))}));
    const payload={format:'internazionale-rossa.vote.v1',rules,ballots,result,events};
    return reply({...payload,sha256:await digest(JSON.stringify(payload)),notice:'Il digest permette di confrontare copie, non impedisce modifiche da parte di chi controlla il server.'});
   }
   const offset=Number(url.searchParams.get('commentsOffset')??0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return reply({error:'Invalid offset'},400);
   const [comments,myBallot,eligibility]=await Promise.all([
    all(`SELECT c.id,c.body,c.language,c.created_at,c.author_id,m.alias AS author FROM forum_comments c JOIN forum_members m ON m.id=c.author_id WHERE c.topic_id=? AND c.deleted=0${hidden.length?` AND c.id NOT IN (${hidden.map(()=>'?').join(',')})`:''} ORDER BY c.created_at DESC,c.id DESC LIMIT 51 OFFSET ?`,id,...hidden,offset),
    own?all('SELECT receipt,choices_json FROM forum_ballots WHERE topic_id=? AND member_id=?',id,own.id):Promise.resolve([]),
    active?all('SELECT member_id FROM forum_electorate WHERE topic_id=? AND member_id=?',id,own!.id):Promise.resolve([]),
   ]);
   return reply({topic,comments:comments.slice(0,50).reverse().map(c=>({id:c.id,author:c.author,body:c.body,language:c.language,createdAt:c.created_at,own:c.author_id===own?.id})),nextCommentsOffset:comments.length>50?offset+50:null,ballot:myBallot.length?{receipt:myBallot[0].receipt,choices:JSON.parse(String(myBallot[0].choices_json))}:null,canVote:active&&Boolean(eligibility.length)&&topic.phase==='voting',result,ballots,serverNow:now});
  }
  if((request.headers.get('origin')&&request.headers.get('origin')!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Invalid origin'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
  const reader=request.body?.getReader();if(!reader)return reply({error:'Invalid input'},400);
  let data:Record<string,unknown>;
  try{let size=0,body='';const decoder=new TextDecoder();for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>120000){await reader.cancel();return reply({error:'Payload too large'},413);}body+=decoder.decode(chunk.value,{stream:true});}data=JSON.parse(body+decoder.decode());}catch{return reply({error:'Invalid JSON'},400);}finally{reader.releaseLock();}
  now=clock();
  if(!data||Array.isArray(data)||typeof data!=='object'||['ownerKey','userId','memberId','status','eligible','turnout'].some(key=>Object.hasOwn(data,key)))return reply({error:'Invalid input'},400);
  if(data.action==='apply'){
   if(!accountVerified)return reply({error:'Conferma l’indirizzo email del tuo account PR1 prima di chiedere PR2.'},403);
   const referenceUrl=normalizeApplicantReferenceUrl(data.referenceUrl);
   if(data.consent!==true||['identityName','identityKind','identityUrl','identityProvider','identitySubject'].some(key=>Object.hasOwn(data,key))||!text(data.alias,3,40)||!text(data.intro,20,1500)||!referenceUrl||!language(data.language)||!proposalId(data.requestId))return reply({error:'Controlla nome pubblico, presentazione, riferimento HTTPS, lingua e consenso.'},400);
   if(own)return reply({error:'Hai già una domanda di adesione.',member:own},409);
   const alias=data.alias.trim().normalize('NFKC'),aliasKey=alias.toLocaleLowerCase('und');
   const existing=await all('SELECT id FROM forum_members WHERE alias_key=?',aliasKey);if(existing.length)return reply({error:'Questo nome pubblico è già in uso.'},409);
   const identity=validSocialIdentity(socialIdentity)?socialIdentity:null;
   if(identity&&(await all('SELECT id FROM forum_members WHERE identity_provider=? AND identity_subject=?',identity.provider,identity.subject)).length)return reply({error:'Questo account Facebook è già stato usato per una domanda PR2.'},409);
   // The OAuth grant is evidence gathered for this application, not a token the
   // forum needs to retain. Consume it before insertion; a lost insert race asks
   // the applicant to link again instead of leaving an unnecessary grant stored.
   if(identity){if(!unlinkSocialIdentity)return reply({error:'La prova Facebook non può essere rimossa in sicurezza. Scollegala o riprova.'},503);await unlinkSocialIdentity();}
   const values=[data.requestId,owner,alias,aliasKey,data.intro.trim(),referenceUrl,identity?.name??alias,'person',identity?.url??'',data.language,now,now+72*3600000,identity?.provider??null,identity?.subject??null];
   const results=await db.batch([
    sql("INSERT INTO forum_members (id,owner_key,alias,alias_key,intro,reference_url,identity_name,identity_kind,identity_url,language,status,created_at,deadline,identity_provider,identity_subject) VALUES (?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,?) ON CONFLICT DO NOTHING",...values),
    sql("INSERT INTO forum_admission_electorate (candidate_id,member_id) SELECT ?,id FROM forum_members WHERE status='active' AND EXISTS(SELECT 1 FROM forum_members WHERE id=? AND owner_key=?) ON CONFLICT DO NOTHING",data.requestId,data.requestId,owner),
   ]);
   return changed(results[0])?reply({ok:true,id:data.requestId},201):reply({error:'Domanda non inviata o nome già in uso. Aggiorna e verifica prima di riprovare.'},409);
  }
  if(data.action==='bootstrap'){
   if(!own||ownRow?.status!=='pending'||own.deadline<=now||!text(data.code,32,128))return reply({error:'Codice non valido o attivazione non disponibile.'},403);
   const codeHash=await digest(data.code),slot=bootstrapHashes.findIndex(hash=>safeEqual(hash,codeHash))+1;
   if(!slot)return reply({error:'Codice non valido o attivazione non disponibile.'},403);
   const results=await db.batch([
    sql("INSERT INTO forum_bootstrap (id,member_id,created_at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM forum_members WHERE status='active')<3 AND NOT EXISTS(SELECT 1 FROM forum_bootstrap WHERE member_id=?) AND EXISTS(SELECT 1 FROM forum_members WHERE id=? AND status='pending' AND deadline>?) ON CONFLICT DO NOTHING",slot,own.id,now,own.id,own.id,now),
    sql("UPDATE forum_members SET status='active',admitted_at=? WHERE id=? AND status='pending' AND deadline>? AND EXISTS(SELECT 1 FROM forum_bootstrap WHERE id=? AND member_id=?)",now,own.id,now,slot,own.id),
    sql("INSERT INTO forum_admission_electorate (candidate_id,member_id) SELECT m.id,? FROM forum_members m WHERE m.status='pending' AND m.deadline>? AND EXISTS(SELECT 1 FROM forum_bootstrap WHERE id=? AND member_id=?) ON CONFLICT DO NOTHING",own.id,now,slot,own.id),
    sql("INSERT INTO forum_electorate (topic_id,member_id) SELECT t.id,m.id FROM forum_topics t JOIN forum_members m ON m.id=? WHERE m.status='active' AND t.ends_at>? AND t.withdrawn=0 AND t.options_json<>'[]' ON CONFLICT DO NOTHING",own.id,now),
   ]);
   return changed(results[0])&&changed(results[1])?reply({ok:true}):reply({error:'Invito già utilizzato o avvio della comunità completato.'},409);
  }
  if(data.action==='cancelApplication'){
   if(!own)return reply({error:'Domanda non disponibile.'},404);
   if(!['pending','rejected'].includes(own.status))return reply({error:'Domanda non ritirabile.'},409);
   if(own.identityProvider==='facebook'){
    if(!unlinkSocialIdentity)return reply({error:'Ritiro temporaneamente non disponibile: il collegamento Facebook non può essere rimosso in sicurezza.'},503);
    // Reauthentication may be required by the auth layer. Do not claim a
    // successful withdrawal while its stored provider grant still exists.
    await unlinkSocialIdentity();
   }
   // A withdrawn applicant must be able to start over, and the profile evidence
   // must not remain in the membership table or its admission working sets.
   const results=await db.batch([
    sql('DELETE FROM forum_admission_votes WHERE candidate_id=? OR member_id=?',own.id,own.id),
    sql('DELETE FROM forum_admission_electorate WHERE candidate_id=? OR member_id=?',own.id,own.id),
    sql("DELETE FROM forum_members WHERE id=? AND status IN ('pending','rejected')",own.id),
   ]);
   return changed(results[2])?reply({ok:true}):reply({error:'Domanda non ritirabile.'},409);
  }
  if(!active)return reply({error:'Serve l’ammissione alla comunità per questa azione.'},403);
  if(data.action==='admit'){
   if(!proposalId(data.id)||![1,-1].includes(data.value as number)||(data.value===1&&data.identityChecked!==true))return reply({error:'Invalid admission vote'},400);
   const result=await db.batch([
    sql("INSERT INTO forum_admission_electorate(candidate_id,member_id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM forum_members WHERE id=? AND status='pending' AND deadline>?) ON CONFLICT DO NOTHING",data.id,own!.id,data.id,now),
    sql("INSERT INTO forum_admission_votes (candidate_id,member_id,value,identity_checked,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM forum_members WHERE id=? AND status='pending' AND deadline>?) AND EXISTS(SELECT 1 FROM forum_admission_electorate WHERE candidate_id=? AND member_id=?) ON CONFLICT DO NOTHING",data.id,own!.id,data.value,data.identityChecked===true?1:0,now,data.id,now,data.id,own!.id),
    sql("UPDATE forum_members SET status='rejected' WHERE id=? AND status='pending' AND deadline>? AND (SELECT COUNT(*) FROM forum_admission_votes WHERE candidate_id=? AND value=-1)>=3",data.id,now,data.id),
    sql("UPDATE forum_members SET status='active',admitted_at=? WHERE id=? AND status='pending' AND deadline>? AND (SELECT COUNT(*) FROM forum_admission_votes WHERE candidate_id=? AND value=1)>=3",now,data.id,now,data.id),
    sql("INSERT INTO forum_electorate (topic_id,member_id) SELECT t.id,m.id FROM forum_topics t JOIN forum_members m ON m.id=? WHERE m.status='active' AND t.ends_at>? AND t.withdrawn=0 AND t.options_json<>'[]' ON CONFLICT DO NOTHING",data.id,now),
   ]);
   return changed(result[1])?reply({ok:true}):reply({error:'Voto già espresso, domanda scaduta o nessun diritto di voto su questa ammissione.'},409);
  }
  if(data.action==='create'){
   const discussion=data.kind==='discussion';
   if((data.private!==undefined&&typeof data.private!=='boolean')||(data.private===true&&(!discussion||data.category!=='general')))return reply({error:'Solo le discussioni libere possono essere riservate ai membri PR2. Proposte e votazioni sono pubbliche.'},400);
   const privateTopic=data.private===true?1:0;
   if(data.kind!==undefined&&!['discussion','proposal'].includes(String(data.kind)))return reply({error:'Tipo di argomento non valido.'},400);
   if(!proposalId(data.requestId)||!text(data.title,3,140)||!text(data.body,3,30000)||!text(data.references??'',0,1500)||!language(data.language)||typeof data.category!=='string'||!Object.hasOwn(COMMUNITY_CATEGORIES,data.category)||(!discussion&&data.category==='general'))return reply({error:'Controlla titolo, testo e ambito.'},400);
   if(discussion&&(data.options!==undefined&&(!Array.isArray(data.options)||data.options.length)))return reply({error:'Una discussione libera non contiene una scheda di voto.'},400);
   if(!discussion&&(typeof data.method!=='string'||!Object.hasOwn(VOTING_METHODS,data.method)||!Array.isArray(data.options)||data.options.length<1||!data.options.every(x=>text(x,1,2000))||new Set(data.options.map(x=>String(x).trim().toLocaleLowerCase())).size!==data.options.length))return reply({error:'Controlla soluzioni e metodo di voto.'},400);
   const delay=discussion?0:Number(data.discussionHours),duration=discussion?0:Number(data.durationHours),quorum=discussion?0:Number(data.quorum);
   if(!Number.isInteger(delay)||delay<0||delay>168||!Number.isInteger(duration)||duration<(discussion?0:1)||duration>720||!Number.isInteger(quorum)||quorum<0||quorum>100)return reply({error:'Discussione: 0–168 ore; voto: 1–720 ore; quorum: 0–100%.'},400);
   const options=JSON.stringify(discussion?[]:(data.options as string[]).map(x=>x.trim())),method=discussion?'single':String(data.method),starts=now+delay*3600000,ends=starts+duration*3600000;
   const old=(await all('SELECT * FROM forum_topics WHERE id=?',data.requestId))[0];
   if(old){const same=old.author_id===own!.id&&count(old.private)===privateTopic&&old.title===data.title.trim()&&old.body===data.body.trim()&&old.references_text===String(data.references??'').trim()&&old.category===data.category&&old.language===data.language&&old.options_json===options&&old.method===method&&count(old.quorum)===quorum&&count(old.starts_at)-count(old.created_at)===delay*3600000&&count(old.ends_at)-count(old.starts_at)===duration*3600000;return same?reply({ok:true,id:data.requestId},201):reply({error:'Identificatore già usato per un altro contenuto.'},409);}
   const results=await db.batch([
    sql('INSERT INTO forum_topics (id,author_id,title,body,references_text,category,language,options_json,method,quorum,created_at,starts_at,ends_at,private) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? ON CONFLICT DO NOTHING',data.requestId,own!.id,data.title.trim(),data.body.trim(),String(data.references??'').trim(),data.category,data.language,options,method,quorum,now,starts,ends,privateTopic),
    sql("INSERT INTO forum_electorate (topic_id,member_id) SELECT ?,id FROM forum_members WHERE status='active' AND EXISTS(SELECT 1 FROM forum_topics WHERE id=? AND author_id=? AND sealed=0 AND options_json<>'[]') ON CONFLICT DO NOTHING",data.requestId,data.requestId,own!.id),
    sql('UPDATE forum_topics SET sealed=1 WHERE id=? AND author_id=? AND sealed=0',data.requestId,own!.id),
   ]);
   return changed(results[0])?reply({ok:true,id:data.requestId},201):reply({error:'Pubblicazione non completata o identificatore già utilizzato.'},409);
  }
  if(!proposalId(data.id)||hidden.includes(data.id))return reply({error:'Invalid topic'},400);
  const raw=(await all(topicSelect+' WHERE t.id=?',data.id))[0];if(!raw||raw.withdrawn)return reply({error:'Discussione non disponibile.'},404);
  const topic=publicTopic(raw,now,own!.id);
  if(data.action==='vote'||data.action==='revoke'){
   if(topic.kind==='discussion'||topic.phase!=='voting')return reply({error:'La votazione non è aperta.'},409);
   const eligibility=await all('SELECT member_id FROM forum_electorate WHERE topic_id=? AND member_id=?',data.id,own!.id);if(!eligibility.length)return reply({error:'La tua ammissione non è ancora registrata per questa votazione. Aggiorna e riprova.'},403);
   if(data.action==='revoke'){
    await sql('DELETE FROM forum_ballots WHERE topic_id=? AND member_id=? AND EXISTS(SELECT 1 FROM forum_topics WHERE id=? AND starts_at<=? AND ends_at>? AND withdrawn=0)',data.id,own!.id,data.id,now,now).run();return reply({ok:true});
   }
   if(data.publicVote!==true||!validChoices(topic.method,topic.options.length,data.choices)||!proposalId(data.receipt))return reply({error:'Scheda non valida per questo metodo di voto.'},400);
   const result=await sql('INSERT INTO forum_ballots (topic_id,member_id,choices_json,receipt,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM forum_topics WHERE id=? AND starts_at<=? AND ends_at>? AND withdrawn=0) ON CONFLICT(topic_id,member_id) DO UPDATE SET choices_json=excluded.choices_json,receipt=excluded.receipt,updated_at=excluded.updated_at',data.id,own!.id,JSON.stringify(data.choices),data.receipt,now,data.id,now,now).run();return changed(result)?reply({ok:true,receipt:data.receipt}):reply({error:'La votazione è chiusa.'},409);
  }
  if(data.action==='comment'){
   if(!proposalId(data.requestId)||!text(data.body,3,20000)||!language(data.language))return reply({error:'Commento non valido.'},400);
   const old=(await all('SELECT author_id,body,language FROM forum_comments WHERE id=?',data.requestId))[0];if(old)return old.author_id===own!.id&&old.body===data.body.trim()&&old.language===data.language?reply({ok:true},201):reply({error:'Identificatore già utilizzato.'},409);
   const result=await sql('INSERT INTO forum_comments (id,topic_id,author_id,body,language,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM forum_comments WHERE author_id=? AND created_at>?)<30 ON CONFLICT DO NOTHING',data.requestId,data.id,own!.id,data.body.trim(),data.language,now,own!.id,now-3600000).run();return changed(result)?reply({ok:true},201):reply({error:'Limite di 30 interventi ogni ora.'},429);
  }
  if(data.action==='withdrawTopic'){
   const result=await sql("UPDATE forum_topics SET withdrawn=1 WHERE id=? AND author_id=? AND (options_json='[]' OR starts_at>?) AND withdrawn=0",data.id,own!.id,now).run();return changed(result)?reply({ok:true}):reply({error:'Si può ritirare solo una discussione propria prima dell’inizio del voto.'},409);
  }
  if(data.action==='deleteComment'){
   if(!proposalId(data.commentId))return reply({error:'Invalid comment'},400);
   const result=await sql("UPDATE forum_comments SET body='',deleted=1 WHERE id=? AND topic_id=? AND author_id=? AND deleted=0",data.commentId,data.id,own!.id).run();return changed(result)?reply({ok:true}):reply({error:'Commento non disponibile.'},404);
  }
  return reply({error:'Unknown action'},400);
 }catch{return reply({error:'Operazione non completata. Aggiorna per verificare lo stato e riprova.'},503);}
}
