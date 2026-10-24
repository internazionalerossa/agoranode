import {createHash} from 'node:crypto';
import {nodeStudioDraft,type NodeBlueprintDraft} from '../app/lib/node-studio-model';
import {canonicalKnowledgeJson} from '../app/lib/knowledge-model';
import {createPublicSpaceSeed} from '../app/platform/public-space-seed';
import type {Connection,Connections} from './database';

const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store',vary:'cookie'}});
const eligibleSql=`SELECT DISTINCT e.owner_key FROM federation_pr2_electors e
 JOIN federation_pr2_attestations a ON a.owner_key=e.owner_key
 WHERE e.source_node_id='agora' AND a.source_node_id='agora'
 AND a.valid_from<=$1 AND a.valid_until>$1
 AND (a.proof_json::jsonb->>'state')='active'
 ORDER BY e.owner_key LIMIT 1001`;
const query=(c:Connection,sql:string,params:unknown[]=[])=>c.query(sql,params);

async function atomic<T>(pool:Connections,task:(c:Connection)=>Promise<T>):Promise<T>{
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  await c.query('SELECT pg_advisory_xact_lock(194733,9)');
  const output=await task(c);
  await c.query('COMMIT');
  return output;
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release?.();}
}
async function electorate(c:Connection,now:number):Promise<string[]>{
 const result=await query(c,eligibleSql,[now]);
 return result.rows.map(r=>String(r.owner_key));
}
/**
 * Node foundation can ONLY originate in Agorà and be approved by a majority
 * of its PR2s (the PR3 constituency of AgoraNode).
 * Approval does not provision databases, DNS or accounts.
 */
export async function handleAgoraNodeFoundations(
 request:Request,pool:Connections,userId:string|null,now=Date.now(),
):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname!=='/api/agora/foundations'||[...url.searchParams.keys()].some(k=>k!=='proposalId')||
  url.searchParams.getAll('proposalId').length>1)
  return response({error:'Invalid foundation request'},400);
 const proposalId=url.searchParams.get('proposalId');
 if(proposalId!==null&&!ID.test(proposalId))return response({error:'Invalid proposal'},400);
 if(request.method==='GET'){
  try{
   const eligible=userId?(await electorate(pool,now)).includes(userId):false;
   if(proposalId){
    const rows=await pool.query('SELECT id::text,space_id,digest,blueprint_json,electorate_size,status,created_at FROM agora_node_foundations WHERE id=$1::uuid',[proposalId]);
    if(!rows.rows[0])return response({error:'Proposal not found'},404);
    const record=rows.rows[0];
    const ballots=await pool.query("SELECT choice,COUNT(*)::int AS count FROM agora_node_foundation_votes WHERE proposal_id=$1::uuid GROUP BY choice",[proposalId]);
    const readable={id:record.id,spaceId:record.space_id,digest:record.digest,
      electorateSize:record.electorate_size,status:record.status,createdAt:record.created_at,
      counts:ballots.rows,required:Math.floor(Number(record.electorate_size)/2)+1,
      ...(eligible||record.status==='approved'?{blueprint:record.blueprint_json}:{})};
    return response({proposal:readable,canPropose:eligible,provisioned:false});
   }
   const rows=await pool.query('SELECT id::text,space_id,digest,electorate_size,status,created_at FROM agora_node_foundations ORDER BY created_at DESC,id DESC LIMIT 100');
   return response({proposals:rows.rows,canPropose:eligible});
  }catch{return response({error:'Foundation registry unavailable'},503);}
 }
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 if(!userId)return response({error:'Only an authenticated PR2 of Agorà may propose or vote'},401);
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
  return response({error:'Invalid origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return response({error:'JSON required'},415);
 let input:unknown;
 try{const raw=await request.text();if(Buffer.byteLength(raw,'utf8')>64000)return response({error:'Payload too large'},413);input=JSON.parse(raw);}
 catch{return response({error:'Invalid JSON'},400);}
 if(!input||typeof input!=='object'||Array.isArray(input))return response({error:'Invalid action'},400);
 const data=input as Record<string,unknown>;
 if(proposalId!==null)return response({error:'Unexpected proposal query parameter'},400);
 if(data.action==='propose'){
  if(Object.keys(data).sort().join(',')!=='action,draft')return response({error:'Invalid proposal shape'},400);
  let draft:NodeBlueprintDraft;
  try{draft=nodeStudioDraft(data.draft);}catch{return response({error:'Invalid node blueprint'},400);}
  if(draft.operation!=='create-node')return response({error:'Only Agorà may propose founding a new node'},400);
  const canonical=canonicalKnowledgeJson(draft);
  const digest='sha256:'+createHash('sha256').update(canonical).digest('hex');
  try{
   const created=await atomic(pool,async c=>{
    const voters=await electorate(c,now);
    if(!voters.includes(userId))return {error:'Verified Agorà PR2 required',statusCode:403};
    if(voters.length>1000)return {error:'Electorate capacity reached',statusCode:409};
    const inserted=await query(c,'INSERT INTO agora_node_foundations(space_id,created_by,digest,blueprint_json,electorate_size) VALUES($1,$2,$3,$4::jsonb,$5) RETURNING id::text',[draft.spaceId,userId,digest,canonical,voters.length]);
    const id=String(inserted.rows[0].id);
    for(const elector of voters)await query(c,'INSERT INTO agora_node_foundation_electors(proposal_id,user_id) VALUES($1::uuid,$2)',[id,elector]);
    return {id,spaceId:draft.spaceId,digest,status:'pending',electorateSize:voters.length,required:Math.floor(voters.length/2)+1};
   });
   if('error' in created)return response({error:created.error},created.statusCode);
   return response(created,201);
  }catch(e){
   if(e instanceof Error&&/duplicate key|unique constraint/i.test(e.message))return response({error:'A foundation proposal already exists for this node'},409);
   return response({error:'Could not register foundation proposal'},503);
  }
 }
 if(data.action==='vote'){
  if(Object.keys(data).sort().join(',')!=='action,choice,proposalId'||
   typeof data.proposalId!=='string'||!ID.test(data.proposalId)||!['yes','no'].includes(String(data.choice)))
   return response({error:'Invalid foundation vote'},400);
  try{
   const result=await atomic(pool,async c=>{
    const current=await electorate(c,now);
    if(!current.includes(userId))return {error:'Verified Agorà PR2 required',statusCode:403};
    const found=await query(c,'SELECT id::text,status,electorate_size FROM agora_node_foundations WHERE id=$1::uuid FOR UPDATE',[data.proposalId]);
    const proposal=found.rows[0];
    if(!proposal)return {error:'Unknown proposal',statusCode:404};
    if(proposal.status!=='pending')return {error:'Proposal already resolved',statusCode:409};
    const elector=await query(c,'SELECT 1 FROM agora_node_foundation_electors WHERE proposal_id=$1::uuid AND user_id=$2',[data.proposalId,userId]);
    if(!elector.rows.length)return {error:'Not part of the frozen electorate',statusCode:403};
    const ballot=await query(c,'INSERT INTO agora_node_foundation_votes(proposal_id,voter_id,choice) VALUES($1::uuid,$2,$3) ON CONFLICT DO NOTHING RETURNING choice',[data.proposalId,userId,data.choice]);
    if(!ballot.rows.length)return {error:'Ballot already cast',statusCode:409};
    const sums=await query(c,"SELECT COUNT(*) FILTER(WHERE choice='yes')::int AS yes,COUNT(*) FILTER(WHERE choice='no')::int AS no FROM agora_node_foundation_votes WHERE proposal_id=$1::uuid",[data.proposalId]);
    const yes=Number(sums.rows[0].yes),no=Number(sums.rows[0].no),required=Math.floor(Number(proposal.electorate_size)/2)+1;
    const status=yes>=required?'approved':no>=required?'rejected':'pending';
    if(status!=='pending')await query(c,'UPDATE agora_node_foundations SET status=$1,resolved_at=now() WHERE id=$2::uuid',[status,data.proposalId]);
    return {status,yes,no,required,provisioned:false};
   });
   if('error' in result)return response({error:result.error},result.statusCode);
   return response(result);
  }catch{return response({error:'Foundation ballot unavailable'},503);}
 }
 return response({error:'Unknown foundation action'},400);
}

export async function approvedFoundationSeed(pool:Connections,id:string){
 if(!ID.test(id))throw Error('Invalid foundation proposal');
 const result=await pool.query("SELECT blueprint_json FROM agora_node_foundations WHERE id=$1::uuid AND status='approved'",[id]);
 if(!result.rows[0])throw Error('No approved foundation');
 return createPublicSpaceSeed(nodeStudioDraft(result.rows[0].blueprint_json));
}
