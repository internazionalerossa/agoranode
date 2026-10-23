import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {AGORA_ATLAS,agoraAtlasEntry} from '../app/instances/agora-atlante';
import {LEGACY_NOT_RECORDED_DECISION_EVIDENCE} from '../app/lib/contribution-rights';
import {
  REPOSITORY_PUBLICATION_FORMAT,
  KNOWLEDGE_ENTRY_FORMAT,
  type KnowledgeRevisionInput,
  type KnowledgeRights,
  type KnowledgeJson,
  canonicalKnowledgeJson,
} from '../app/lib/knowledge-model';
import {validateAgoraSeedDatabase} from './agora-database';
import {importKnowledgeRevisions} from './knowledge';
import {createPool,connections} from './pool';
import {migrateDatabase} from './migrations';

/**
 * The origin community has its own REAL durable public knowledge database.
 * This bootstrap never clones PolisRossa's database, private users or PR2
 * electorate, and must not be confused with a PR2-approved contribution.
 */
export const AGORA_ORIGIN_SPACE_ID='agora';
const RIGHTS: KnowledgeRights={
 status:'reuse-not-documented',
 licenseSpdx:null,
 attribution:'AgoràNode · app/instances/agora-atlante.ts',
 reuseAllowed:false,
};
const publicationRecord={
 format:REPOSITORY_PUBLICATION_FORMAT,
 author:{publicId:'agora-node',displayName:'AgoràNode · revisione del repository'},
 previousRevisionSha256:null,
 approval:{
  method:'repository-review' as const,
  result:'approved' as const,
  approvedAt:null,
  evidence:LEGACY_NOT_RECORDED_DECISION_EVIDENCE,
 },
} as const;
function content(value:unknown):Record<string,KnowledgeJson>{
 canonicalKnowledgeJson(value);
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid Agora knowledge content');
 return value as Record<string,KnowledgeJson>;
}
export function agoraKnowledgeSeed():KnowledgeRevisionInput[]{
 return AGORA_ATLAS.map(entry=>({
  identity:{spaceId:AGORA_ORIGIN_SPACE_ID,kind:'article',id:entry.id,locale:'it'},
  sourceType:'repository-seed',
  rights:RIGHTS,
  publicationRecord,
  content:content({
   format:KNOWLEDGE_ENTRY_FORMAT,
   title:entry.title,
   summary:entry.abstract,
   category:entry.category,
   maturity:entry.state,
   sections:entry.sections.map(section=>({
    heading:section.heading,paragraphs:[...section.paragraphs],
   })),
   paragraphs:entry.sections.flatMap(section=>section.paragraphs),
   ...(entry.timeline?{timeline:{
    period:entry.timeline.period,order:entry.timeline.order,narrative:entry.timeline.narrative,
    presentation:'selected-in-editorial-alpha',
   }}:{}),
   originalUrl:'/agora?atlante='+entry.id,
  }),
  sources:entry.references.map(reference=>({
   sourceType:'repository-documentation',
   title:reference.title,
   url:reference.url,
   rights:{
    status:'reference-only' as const,
    licenseSpdx:null,
    attribution:reference.title+' · AgoràNode',
    reuseAllowed:false,
   },
  })),
  relations:entry.relatesTo.map(id=>({
   relationType:'related-article',
   target:{spaceId:AGORA_ORIGIN_SPACE_ID,kind:'article',id},
   metadata:content({name:agoraAtlasEntry(id)?.title??id}),
  })),
 }));
}
export async function importAgoraKnowledge(pool:Parameters<typeof importKnowledgeRevisions>[0]){
 return importKnowledgeRevisions(pool,agoraKnowledgeSeed());
}
/**
 * Explicit operator action only. The *different* URL is required to ensure
 * no accidental writes to PolisRossa. Run an isolated backup/restore test
 * before touching any live community database.
 */
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const run=async()=>{
  const target=process.env.AGORANODE_AGORA_DATABASE_URL??'';
  const other=process.env.DATABASE_URL??'';
  validateAgoraSeedDatabase(target,other);
  if(process.env.AGORANODE_SEED_CONFIRM!=='public-repository-alpha')
   throw Error('Set AGORANODE_SEED_CONFIRM=public-repository-alpha after backup and editorial review');
  const pool=createPool(target,2);
  try{
   await migrateDatabase(connections(pool),new URL('./migrations/',import.meta.url));
   const result=await importAgoraKnowledge(connections(pool));
   process.stdout.write(JSON.stringify({spaceId:AGORA_ORIGIN_SPACE_ID,result})+'\n');
  }finally{await pool.end();}
 };
 run().catch(error=>{
  console.error(error instanceof Error?error.message:'Agorà seed failed');
  process.exitCode=1;
 });
}
