import {nodeStudioDraft,type NodeBlueprintDraft,type NodeStudioBlock,type NodeStudioSource} from '../lib/node-studio-model';

/**
 * The public read-only bootstrap format is deliberately *not* an account,
 * database, membership, or signed governance record. Publishing a seed must
 * be an explicit operator action after source/licence review.
 */
export const PUBLIC_SPACE_SEED_FORMAT='org.agoranode.public-space-seed.v1' as const;
export const PUBLIC_BOOTSTRAP_NOTICE='Public read-only bootstrap. Account, PR2 membership, forum, BFT and democratic publication are not enabled.' as const;
export const PR2_APPROVED_NOTICE='This public content revision was approved by the configured node PR2 editorial procedure. This does not attest to federated consensus, independent hosting, or a live forum.' as const;
export type PublicSpaceSeed={
  format:typeof PUBLIC_SPACE_SEED_FORMAT;
  spaceId:string;
  name:string;
  topic:string;
  description:string;
  accent:string;
  sources:NodeStudioSource[];
  blocks:NodeStudioBlock[];
  publication:{kind:'manual-bootstrap'|'pr2-approved';notice:string};
};

const FIELDS=['format','spaceId','name','topic','description','accent','sources','blocks','publication'].sort().join(',');
const PUB=['kind','notice'].join(',');
const ID=/^[a-z][a-z0-9-]{2,47}$/;
export function createPublicSpaceSeed(input:unknown):PublicSpaceSeed{
 const draft=nodeStudioDraft(input);
 if(draft.operation!=='create-node'||['agora','polisrossa'].includes(draft.spaceId))
   throw Error('Only a new space can be bootstrapped with this tool');
 return {
  format:PUBLIC_SPACE_SEED_FORMAT,
  spaceId:draft.spaceId,name:draft.name,topic:draft.topic,description:draft.description,accent:draft.accent,
  sources:draft.sources,blocks:draft.blocks,
  publication:{kind:'manual-bootstrap',
    notice:PUBLIC_BOOTSTRAP_NOTICE},
 };
}
export function validatePublicSpaceSeed(raw:unknown):PublicSpaceSeed{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid public node seed');
 const v=raw as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!==FIELDS||v.format!==PUBLIC_SPACE_SEED_FORMAT||
    typeof v.spaceId!=='string'||!ID.test(v.spaceId)||
    !v.publication||typeof v.publication!=='object'||Array.isArray(v.publication)||
    Object.keys(v.publication).sort().join(',')!==PUB){
   throw Error('Invalid public node seed');
 }
 const p=v.publication as Record<string,unknown>;
 if(!((p.kind==='manual-bootstrap'&&p.notice===PUBLIC_BOOTSTRAP_NOTICE)||(p.kind==='pr2-approved'&&p.notice===PR2_APPROVED_NOTICE)))
  throw Error('Invalid public node publication status');
 // Derive a synthetic private draft for reusing *all* block/source validation,
 // excluding user identifiers from the public record.
 const synthetic:NodeBlueprintDraft={
  format:'org.agoranode.node-blueprint-draft.v1',
  draftId:'00000000-0000-4000-8000-000000000000',
  operation:'create-node',spaceId:v.spaceId,
  name:v.name as string,topic:v.topic as string,
  description:v.description as string,accent:v.accent as string,
  sources:v.sources as NodeStudioSource[],blocks:v.blocks as NodeStudioBlock[],
  updatedAt:0,
 };
 nodeStudioDraft(synthetic);
 if(JSON.stringify(raw).length>62_000)throw Error('Public node seed exceeds limit');
 return raw as PublicSpaceSeed;
}
