import type {Connections} from './database';
import {readKnowledgeEntity} from './knowledge';

const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const KIND=/^[a-z][a-z0-9-]{0,63}$/;
const PUBLIC_HEADERS={'cache-control':'public, max-age=60','x-content-type-options':'nosniff'};
const ERROR_HEADERS={'cache-control':'no-store'};

function error(message:string,status:number){
 return Response.json({error:message},{status,headers:ERROR_HEADERS});
}
/**
 * Public knowledge projection from ONE namespace-scoped PostgreSQL pool.
 * Pools are selected by the server; clients can neither choose a database URL
 * nor query private account/forum tables.
 */
export async function publicSpaceKnowledgeResponse(
 request:Request,pool:Connections,spaceId:string,
):Promise<Response>{
 if(request.method!=='GET')return error('Method not allowed',405);
 const url=new URL(request.url),path=url.pathname;
 const search=path.endsWith('/search');
 if(search){
  const keys=[...url.searchParams.keys()];
  if(keys.length!==1||keys[0]!=='q')return error('Invalid search query',400);
  const term=url.searchParams.get('q')??'';
  if(term.length<2||term.length>120||/[\u0000-\u001f]/.test(term))return error('Invalid search term',400);
  try{
   const rows=(await pool.query(
     'SELECT e.kind,e.entity_id,r.revision_sha256,'+
     ' COALESCE(r.content_json::jsonb->>\'title\',r.content_json::jsonb->>\'name\',e.entity_id) AS title,'+
     ' LEFT(COALESCE(r.content_json::jsonb->>\'summary\',\'\'),350) AS summary'+
     ' FROM knowledge_current_revisions c'+
     ' JOIN knowledge_entities e ON e.entity_sha256=c.entity_sha256'+
     ' JOIN knowledge_revisions r ON r.revision_sha256=c.revision_sha256'+
     ' WHERE c.space_id=$1 AND c.locale=$2 AND'+
     ' (COALESCE(r.content_json::jsonb->>\'title\',r.content_json::jsonb->>\'name\',e.entity_id) ILIKE $3'+
     ' OR COALESCE(r.content_json::jsonb->>\'summary\',\'\') ILIKE $3)'+
     ' ORDER BY title ASC LIMIT 30',
     [spaceId,'it','%'+term.replace(/[\\%_]/g,'\\$&')+'%'],
   )).rows;
   const matches=rows.map(row=>({
    kind:row.kind,id:row.entity_id,title:row.title,summary:row.summary,revisionSha256:row.revision_sha256,
   }));
   return Response.json({spaceId,matches},{headers:PUBLIC_HEADERS});
  }catch{return error('Search temporarily unavailable',503);}
 }
 const keys=[...url.searchParams.keys()];
 if(keys.length!==2||!keys.includes('kind')||!keys.includes('id')||
    keys.some(key=>url.searchParams.getAll(key).length!==1))return error('Invalid page identity',400);
 const kind=url.searchParams.get('kind')??'',id=url.searchParams.get('id')??'';
 if(!KIND.test(kind)||!ID.test(id))return error('Invalid page identity',400);
 try{
  const identity={spaceId,kind,id,locale:'it'};
  const current=await readKnowledgeEntity(pool,identity);
  if(!current)return error('Public page not found',404);
  const history=(await pool.query(
    'SELECT revision_sha256 FROM knowledge_revisions'+
    ' WHERE space_id=$1 AND kind=$2 AND entity_id=$3 AND locale=$4'+
    ' ORDER BY imported_at DESC LIMIT 100',
    [spaceId,kind,id,'it'],
  )).rows.map(row=>row.revision_sha256);
  return Response.json({
   format:'org.agoranode.public-space-knowledge-page.v1',
   identity,revisionSha256:current.revisionSha256,
   content:current.content,
   sources:current.sources.map(source=>({title:source.title,url:source.url,rights:source.rights})),
   relations:current.relations.map(relation=>({
    relationType:relation.relationType,target:relation.target,metadata:relation.metadata,
   })),
   revisionHistory:history,
  },{headers:PUBLIC_HEADERS});
 }catch{return error('Public page temporarily unavailable',503);}
}
