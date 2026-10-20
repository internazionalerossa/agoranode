import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tally,validChoices,VOTING_METHODS} from '../app/lib/forum-model.ts';
const [path,receipt]=process.argv.slice(2);
if(!path){console.error('Usage: node scripts/verify-vote.mjs scrutinio.json [receipt]');process.exitCode=1;}else{
 try{
  const {sha256,notice,...payload}=JSON.parse(await readFile(path,'utf8'));
  const {rules,ballots,result}=payload;
  if(payload.format!=='internazionale-rossa.vote.v1'||!rules||!Object.hasOwn(VOTING_METHODS,rules.method)||!Array.isArray(rules.options)||rules.options.length<2||rules.options.length>8||!Number.isInteger(rules.eligible)||rules.eligible<0||!Number.isInteger(rules.quorum)||rules.quorum<0||rules.quorum>100||!Array.isArray(ballots)||ballots.length>rules.eligible)throw Error('Invalid election data');
  if(new Set(ballots.map(b=>b.receipt)).size!==ballots.length||ballots.some(b=>typeof b.receipt!=='string'||!validChoices(rules.method,rules.options.length,b.choices)))throw Error('Invalid ballots or duplicate receipts');
  const actual=createHash('sha256').update(JSON.stringify(payload)).digest('hex');if(actual!==sha256)throw Error('File digest does not match');
  const computed=tally(rules.method,rules.options.length,ballots.map(b=>b.choices),rules.eligible,rules.quorum);if(JSON.stringify(computed)!==JSON.stringify(result))throw Error('Published result does not match ballots');
  console.log(JSON.stringify({verified:true,topic:rules.id,ballots:ballots.length,result:computed,...(receipt?{receiptFound:ballots.some(b=>b.receipt===receipt)}:{})},null,2));
 }catch(error){console.error(error instanceof Error?error.message:'Verification failed');process.exitCode=1;}
}
