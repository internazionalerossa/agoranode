import type { ForumDatabase } from './forum';
const digest=async(value:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
/** Export only records owned by the verified session. Credentials and other members' records are never selected. */
export async function handlePrivacyExport(request:Request,db:ForumDatabase|undefined,userId:string|null):Promise<Response>{
 const headers={'cache-control':'private, no-store','vary':'cookie','x-content-type-options':'nosniff'};
 const reply=(body:unknown,status:number)=>Response.json(body,{status,headers});
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 if(!userId)return reply({error:'Accedi al tuo account per scaricare i tuoi dati.'},401);
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 if(new URL(request.url).search)return reply({error:'I dati sono selezionati soltanto dalla sessione, senza parametri.'},400);
 if(!db)return reply({error:'Esportazione temporaneamente non disponibile.'},503);
 try{
  const owner=await digest('internazionale-rossa:forum:'+userId);
  const communityOwner=await digest('internazionale-rossa:community:'+userId);
  const queries={
   bookmarks:['SELECT kind,item_key,payload,deleted,updated_at FROM bookmarks WHERE owner_id=?',userId],
   readingProgress:['SELECT book_id,edition,chapter,page,scroll,revision,updated_at FROM reading_progress WHERE owner_id=?',userId],
   membership:['SELECT id,alias,intro,reference_url,identity_name,identity_kind,identity_url,identity_provider,identity_subject,language,status,created_at,deadline,admitted_at FROM forum_members WHERE owner_key=?',owner],
   topics:['SELECT id,title,body,references_text,category,language,created_at,starts_at,ends_at,withdrawn FROM forum_topics WHERE author_id IN (SELECT id FROM forum_members WHERE owner_key=?)',owner],
   comments:['SELECT id,topic_id,body,language,created_at FROM forum_comments WHERE author_id IN (SELECT id FROM forum_members WHERE owner_key=?)',owner],
   ballots:['SELECT topic_id,choices_json,receipt,updated_at FROM forum_ballots WHERE member_id IN (SELECT id FROM forum_members WHERE owner_key=?)',owner],
   nodeStudioDrafts:['SELECT draft_id::text AS draft_id,space_id,body_json,updated_at FROM node_studio_drafts WHERE owner_id=?',userId],
   agoraForumTopics:['SELECT id::text AS id,space_id,author_alias,title,body,created_at FROM agora_forum_topics WHERE author_id=?',userId],
   nodeFeedPreferences:['SELECT space_id,sources_json,updated_at FROM node_feed_preferences WHERE owner_id=?',userId],
   communityProposals:['SELECT id,title,body,references_text,category,language,created_at,withdrawn FROM community_proposals WHERE owner_key=?',communityOwner],
   communityVotes:['SELECT proposal_id,value,updated_at FROM community_votes WHERE voter_key=?',communityOwner],
   federationPr2Electors:['SELECT actor_id,source_node_id,source_membership_id,voter_key_id,voter_public_key_spki_base64,public_alias,created_at FROM federation_pr2_electors WHERE owner_key=?',userId],
   federationPr2Attestations:['SELECT attestation_sha256,source_node_id,source_membership_id,issuer_key_id,proof_json,attestation_json,valid_from,valid_until,accepted_at FROM federation_pr2_attestations WHERE owner_key=?',userId],
   federationPr3Candidacies:['SELECT decision_id,kind,title,statement,created_at,opens_at,closes_at FROM federation_pr3_decisions WHERE candidate_owner_key=?',userId],
   federationPr3Electorate:['SELECT decision_id,actor_id,voter_key_id,source_attestation_sha256 FROM federation_pr3_electorate WHERE owner_key=?',userId],
   federationPr3Ballots:['SELECT decision_id,ballot_sha256,ballot_json,cast_at FROM federation_pr3_ballots WHERE owner_key=?',userId],
   federationPr3Mandates:['SELECT mandate_id,sequence,state,transition_at,record_json FROM federation_pr3_mandate_records WHERE owner_key=?',userId],
  } as const;
  const entries=await Promise.all(Object.entries(queries).map(async([key,[sql,id]])=>{
   const rows=(await db.prepare(sql+' LIMIT 10001').bind(id).all()).results;
   if(rows.length>10000)throw Error('Export too large');
   return [key,rows];
  }));
  return Response.json({format:'polisrossa-personal-data-v1',exportedAt:new Date().toISOString(),data:Object.fromEntries(entries),scope:'Dati applicativi del tuo account. Per email, log tecnici, copie di sicurezza e altre richieste usa il contatto privacy del titolare.'},{headers:{...headers,'content-disposition':'attachment; filename="PolisRossa-dati-personali.json"'}});
 }catch{return reply({error:'Esportazione non completata. Per una copia completa contatta il titolare indicato nella pagina Privacy.'},503);}
}
