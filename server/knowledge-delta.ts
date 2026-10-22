import type {Connections} from './database';

/**
 * Transactionally emitted LOCAL change cursor for PUBLIC knowledge.
 * The existing knowledge_audit_events triggers write within the same
 * transaction as revisions and current-pointer changes.
 *
 * An audit event is not a finalized checkpoint. Publishing it to any remote
 * peer still requires validation of rights, governance and quorum.
 */
const SPACE=/^[a-z0-9][a-z0-9._-]{1,127}$/;
const HEX=/^[a-f0-9]{64}$/;
export type PublicKnowledgeDelta={
  sequence:number;
  action:'revision-imported'|'current-selected';
  entitySha256:string;
  locale:string;
  revisionSha256:string;
  previousRevisionSha256:string|null;
};
export type PublicKnowledgeDeltaPage={
  spaceId:string;
  after:number;
  nextCursor:number;
  hasMore:boolean;
  changes:PublicKnowledgeDelta[];
};
function sequence(raw:unknown):number{
  const n=Number(raw);
  if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid knowledge event sequence');
  return n;
}
export async function readCommittedKnowledgeDeltas(
  pool:Connections,spaceId:string,after=0,limit=100,
):Promise<PublicKnowledgeDeltaPage>{
  if(!SPACE.test(spaceId) || !Number.isSafeInteger(after)||after<0||
     !Number.isInteger(limit)||limit<1||limit>500)throw Error('Invalid public delta cursor');
  const response=await pool.query(
    'SELECT sequence,action,entity_sha256,locale,previous_revision_sha256,revision_sha256 '+
    'FROM knowledge_audit_events WHERE space_id=$1 AND sequence>$2 '+
    'ORDER BY sequence ASC LIMIT $3',
    [spaceId,after,limit+1],
  );
  const rows=response.rows;
  const changes:PublicKnowledgeDelta[]=[];
  for(const row of rows.slice(0,limit)){
    const number=sequence(row.sequence);
    if(number<=after || (changes.length>0&&number<=changes[changes.length-1].sequence)||
       !['revision-imported','current-selected'].includes(String(row.action))||
       !HEX.test(String(row.entity_sha256))||!HEX.test(String(row.revision_sha256))||
       (row.previous_revision_sha256!==null&&!HEX.test(String(row.previous_revision_sha256)))||
       typeof row.locale!=='string'||! /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(row.locale)
    )throw Error('Invalid committed public audit event');
    changes.push({sequence:number,
      action:row.action as PublicKnowledgeDelta['action'],
      entitySha256:String(row.entity_sha256),revisionSha256:String(row.revision_sha256),
      locale:row.locale,previousRevisionSha256:row.previous_revision_sha256===null?null:String(row.previous_revision_sha256)});
  }
  return {spaceId,after,nextCursor:changes.at(-1)?.sequence??after,hasMore:rows.length>limit,changes};
}
