import {performance}from'node:perf_hooks';
import{collectAll,COLLECTION_CONCURRENCY}from'../app/lib/collection.ts';
const groups=[['direct',183,6,COLLECTION_CONCURRENCY.direct],['radar',136,2,COLLECTION_CONCURRENCY.radar]];
const run=async(count,concurrency)=>{let started=0,peak=0,active=0;const t=performance.now();await collectAll({items:Array.from({length:count},(_,i)=>i),concurrency,timeoutMs:1000,signal:new AbortController().signal,worker:async()=>{started++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,10));active--;return 1;},onResult(){},onError(){throw Error('Unexpected timeout');},onProgress(){}});return{milliseconds:Math.round(performance.now()-t),started,peak};};
const result={scenario:'Simulated independent feeds, 10 ms each; this is not a production network measurement.',results:[]};
for(const[kind,count,before,after]of groups){const old=await run(count,before),next=await run(count,after);result.results.push({kind,before:old,after:next,speedRatio:Number((old.milliseconds/next.milliseconds).toFixed(2))});}
console.log(JSON.stringify(result,null,2));
