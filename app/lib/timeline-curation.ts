/**
 * Node-local PR2 decisions curate WHICH already-published wiki pages appear in
 * the main timeline and HOW a selected item is introduced to the reader.
 * Not all indexable wiki pages are timeline entries.
 *
 * This module validates a decision contract, NOT PR2 voter status itself.
 * Callers must verify a scoped approved political certificate and confirm the
 * exact knowledge revision is already published/current.
 */
import {canonicalKnowledgeHash,canonicalKnowledgeJson} from './knowledge-model';

export const TIMELINE_CURATOR_FORMAT='org.agoranode.timeline-curation.v1' as const;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SPACE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KIND=/^[a-z][a-z0-9-]{0,63}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const LOCALE=/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;
const TOPIC=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export type TimelineNarrative={period:string;context:string;order:number};
export type TimelineCurationDecision={
  format:typeof TIMELINE_CURATOR_FORMAT;
  spaceId:string;
  entity:{kind:string;id:string;locale:string};
  revisionSha256:string;
  action:'include'|'exclude';
  previousSelectionDigest:string|null;
  forumTopicId:string;
  decisionDigest:string;
  narrative:TimelineNarrative|null;
};
export type TimelineSelection={
  decision:TimelineCurationDecision;
  selectionDigest:string;
  included:boolean;
};
export type TimelineCurationAuthority={
  /** Verify local PR2 electorate, successful forum vote and decision scope. */
  verifyLocalPR2Decision:(decision:TimelineCurationDecision)=>boolean|Promise<boolean>;
  /** Check current, already-published revision and namespace, not a draft. */
  publishedRevisionIsCurrent:(decision:TimelineCurationDecision)=>boolean|Promise<boolean>;
};
function object(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
    (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
}
function keys(value:Record<string,unknown>,expected:readonly string[]):boolean{
  return Object.keys(value).sort().join(',')===[...expected].sort().join(',');
}
export function validateTimelineDecision(value:unknown):TimelineCurationDecision {
  if(!object(value)||!keys(value,['format','spaceId','entity','revisionSha256','action','previousSelectionDigest','forumTopicId','decisionDigest','narrative'])||
      value.format!==TIMELINE_CURATOR_FORMAT||typeof value.spaceId!=='string'||!SPACE.test(value.spaceId)||
      !object(value.entity)||!keys(value.entity,['kind','id','locale'])||
      typeof value.entity.kind!=='string'||!KIND.test(value.entity.kind)||
      typeof value.entity.id!=='string'||!ID.test(value.entity.id)||
      typeof value.entity.locale!=='string'||!LOCALE.test(value.entity.locale)||
      typeof value.revisionSha256!=='string'||!HASH.test(value.revisionSha256)||
      (value.action!=='include'&&value.action!=='exclude')||
      (value.previousSelectionDigest!==null&&
        (typeof value.previousSelectionDigest!=='string'||!HASH.test(value.previousSelectionDigest)))||
      typeof value.decisionDigest!=='string'||!HASH.test(value.decisionDigest)||
      typeof value.forumTopicId!=='string'||!TOPIC.test(value.forumTopicId)){
    throw Error('Malformed scoped timeline curation decision');
  }
  if(value.action==='include'){
    if(!object(value.narrative)||!keys(value.narrative,['period','context','order'])||
      typeof value.narrative.period!=='string'||value.narrative.period.trim().length<2||
      value.narrative.period.length>120||
      typeof value.narrative.context!=='string'||value.narrative.context.trim().length<60||
      value.narrative.context.length>2500||
      !Number.isSafeInteger(value.narrative.order)||Number(value.narrative.order)<0){
      throw Error('Timeline inclusion needs a narrative context, period and ordered placement');
    }
  }else if(value.narrative!==null){
    throw Error('Timeline exclusion does not remove or rewrite the wiki page');
  }
  return value as TimelineCurationDecision;
}
export async function timelineSelectionDigest(decision:TimelineCurationDecision):Promise<string>{
  validateTimelineDecision(decision);
  return 'sha256:'+await canonicalKnowledgeHash(decision);
}
export async function applyTimelineDecision(
  current:TimelineSelection|null,input:unknown,authority:TimelineCurationAuthority,
):Promise<TimelineSelection>{
  const decision=validateTimelineDecision(input);
  if(decision.previousSelectionDigest!==(current?.selectionDigest??null))
    throw Error('Timeline selection moved while the PR2 proposal was discussed');
  if(current&&(current.decision.spaceId!==decision.spaceId||
      canonicalKnowledgeJson(current.decision.entity)!==canonicalKnowledgeJson(decision.entity)))
    throw Error('Cannot reuse selection of another wiki page or community');
  if(!await authority.publishedRevisionIsCurrent(decision))
    throw Error('Timeline proposal targets an unpublished or stale wiki revision');
  if(!await authority.verifyLocalPR2Decision(decision))
    throw Error('Timeline change requires a verified local PR2 decision');
  return {decision,selectionDigest:await timelineSelectionDigest(decision),included:decision.action==='include'};
}
export function isSelectedForTimeline(
  selection:TimelineSelection|null,spaceId:string,kind:string,id:string,locale:string,
):boolean{
  return Boolean(selection?.included&&
    selection.decision.spaceId===spaceId&&
    selection.decision.entity.kind===kind&&
    selection.decision.entity.id===id&&
    selection.decision.entity.locale===locale);
}
