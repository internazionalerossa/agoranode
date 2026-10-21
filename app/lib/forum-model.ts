import type {CommunityDecision} from './community-model.ts';
export const VOTING_METHODS={single:'Scelta singola',approval:'Approvazione multipla',ranked:'Preferenze ordinate'} as const;
export type VotingMethod=keyof typeof VOTING_METHODS;
export type Member={id:string;alias:string;intro:string;referenceUrl:string|null;identityName:string;identityKind:'person'|'organization';identityUrl:string;identityProvider?:string|null;language:string;status:string;createdAt:number;deadline:number;admittedAt:number|null};
export type Admission={member:Member;eligible:number;yes:number;no:number;threshold:number;myVote:number|null;canVote:boolean};
export type ForumTopic={private:boolean;kind:'discussion'|'proposal';id:string;author:string;title:string;body:string;references:string;category:string;language:string;options:string[];method:VotingMethod;quorum:number;createdAt:number;startsAt:number;endsAt:number;eligible:number;turnout:number;phase:'discussion'|'voting'|'closed'|'withdrawn';own:boolean;decision:CommunityDecision|null};
export type Ballot={receipt:string;choices:number[]};
export type ForumComment={id:string;author:string;body:string;language:string;createdAt:number;own:boolean};
export type Tally={valid:boolean;required:number;turnout:number;abstentions:number;counts:number[];winners:number[];reason:string;rounds:{counts:number[];exhausted:number;eliminated:number|null}[]};
export type ForumBoard={participationOpen?:boolean;previewOnly?:boolean;authenticated:boolean;signInUrl:string;member:Member|null;activeCount:number;pendingCount:number;bootstrapAvailable:boolean;topics:ForumTopic[];nextOffset:number|null;applications:Admission[];applicationsNextOffset:number|null;serverNow:number};
export type ForumDetail={topic:ForumTopic;comments:ForumComment[];nextCommentsOffset:number|null;ballot:Ballot|null;canVote:boolean;result:Tally|null;ballots:(Ballot&{voter:{id:string;name:string;kind:string}})[];serverNow:number};
export function validChoices(method:VotingMethod,options:number,choices:unknown):choices is number[]{return Array.isArray(choices)&&choices.length<=options&&(method!=='single'||choices.length<=1)&&choices.every(x=>Number.isSafeInteger(x)&&x>=0&&x<options)&&new Set(choices).size===choices.length;}
export function tally(method:VotingMethod,options:number,ballots:number[][],eligible:number,quorum:number):Tally{
 const required=Math.ceil(eligible*quorum/100),abstentions=ballots.filter(x=>!x.length).length;
 const result:Tally={valid:ballots.length>=required&&ballots.length>0,required,turnout:ballots.length,abstentions,counts:Array(options).fill(0),winners:[],reason:'',rounds:[]};
 if(!result.valid){result.reason=ballots.length?'Quorum non raggiunto':'Nessun voto espresso';return result;}
 if(abstentions===ballots.length){result.reason='Solo astensioni';return result;}
 if(method!=='ranked'){
  for(const ballot of ballots)for(const choice of ballot)result.counts[choice]++;
  const maximum=Math.max(...result.counts);result.winners=result.counts.flatMap((count,index)=>count===maximum?[index]:[]);
  if(result.winners.length!==1){result.reason='Pareggio: occorre una nuova votazione';result.winners=[];}else result.reason=method==='single'?'Maggior numero di scelte':'Maggior numero di approvazioni';
  return result;
 }
 const active=new Set(Array.from({length:options},(_,index)=>index));
 while(active.size){
  const counts:number[]=Array(options).fill(0);let exhausted=0;
  for(const ballot of ballots){const choice=ballot.find(x=>active.has(x));if(choice===undefined)exhausted++;else counts[choice]++;}
  result.counts=counts;const continuing=ballots.length-exhausted;
  const winner=[...active].find(index=>counts[index]>continuing/2);
  if(winner!==undefined){result.rounds.push({counts,exhausted,eliminated:null});result.winners=[winner];result.reason='Maggioranza delle preferenze ancora valide';return result;}
  const minimum=Math.min(...[...active].map(index=>counts[index])),last=[...active].filter(index=>counts[index]===minimum);
  if(last.length!==1||!continuing){result.rounds.push({counts,exhausted,eliminated:null});result.reason='Pareggio nelle eliminazioni: occorre una nuova votazione';return result;}
  result.rounds.push({counts,exhausted,eliminated:last[0]});active.delete(last[0]);
 }
 result.reason='Nessun risultato';return result;
}
