import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIMELINE_CURATOR_FORMAT,validateTimelineDecision,applyTimelineDecision,
  isSelectedForTimeline,type TimelineCurationDecision,
} from '../app/lib/timeline-curation';

const hash=(char:string)=>'sha256:'+char.repeat(64);
const topicId='aaaabbbb-cccc-4ddd-8eee-000000000001';
const decision:TimelineCurationDecision={
  format:TIMELINE_CURATOR_FORMAT,
  spaceId:'polisrossa',
  entity:{kind:'event',id:'comune',locale:'it'},
  revisionSha256:hash('a'),
  action:'include',
  previousSelectionDigest:null,
  forumTopicId:topicId,
  decisionDigest:hash('b'),
  narrative:{period:'1871',order:10,
    context:'La Comune di Parigi rappresenta un passaggio nel dibattito sull’autogoverno cittadino: la sua vicenda lega lavoro, servizi e partecipazione alle fonti del 1871.'},
};
test('verified local PR2 inclusion adds a narrative to timeline without creating a new encyclopedia page',async()=>{
  const current=await applyTimelineDecision(null,decision,{
    publishedRevisionIsCurrent:()=>true,
    verifyLocalPR2Decision:()=>true,
  });
  assert.equal(current.included,true);
  assert.equal(current.decision.narrative?.period,'1871');
  assert.equal(isSelectedForTimeline(current,'polisrossa','event','comune','it'),true);
  assert.equal(isSelectedForTimeline(current,'agora','event','comune','it'),false);
  assert.equal(isSelectedForTimeline(current,'polisrossa','event','other','it'),false);
  const exclusion=await applyTimelineDecision(current,{
    ...decision,
    action:'exclude',narrative:null,
    previousSelectionDigest:current.selectionDigest,
    decisionDigest:hash('c'),
  },{
    publishedRevisionIsCurrent:()=>true,
    verifyLocalPR2Decision:()=>true,
  });
  assert.equal(exclusion.included,false);
  assert.equal(isSelectedForTimeline(exclusion,'polisrossa','event','comune','it'),false);
  assert.equal(decision.revisionSha256,exclusion.decision.revisionSha256);
});

test('timeline moderation requires current publication and an approved local PR2 decision',async()=>{
  await assert.rejects(applyTimelineDecision(null,decision,{
    publishedRevisionIsCurrent:()=>false,
    verifyLocalPR2Decision:()=>true,
  }),/unpublished or stale/);
  await assert.rejects(applyTimelineDecision(null,decision,{
    publishedRevisionIsCurrent:()=>true,
    verifyLocalPR2Decision:()=>false,
  }),/verified local PR2/);
  await assert.rejects(applyTimelineDecision(null,{...decision,spaceId:'../system'},{
    publishedRevisionIsCurrent:()=>true,verifyLocalPR2Decision:()=>true,
  }),/Malformed/);
  assert.throws(()=>validateTimelineDecision({...decision,narrative:{period:'1871',context:'just a link',order:10}}),/narrative context/);
  assert.throws(()=>validateTimelineDecision({...decision,action:'exclude'}),/Timeline exclusion/);
  const previous=await applyTimelineDecision(null,decision,{
    publishedRevisionIsCurrent:()=>true,verifyLocalPR2Decision:()=>true,
  });
  await assert.rejects(applyTimelineDecision(previous,{...decision,decisionDigest:hash('d')},{
    publishedRevisionIsCurrent:()=>true,verifyLocalPR2Decision:()=>true,
  }),/selection moved/);
  assert.throws(()=>validateTimelineDecision({...decision,privateData:'secret'}),/Malformed/);
});
