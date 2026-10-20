import {createHash} from 'node:crypto';
import type {Connection} from './database';
/** Persistent counters work across replicas even when forwarded IP headers are forged. */
export async function allowAuthAttempt(db:Connection,action:string,email:string,clock=Date.now){
 const now=clock();
 const take=async(bucket:string,window:number,max:number)=>{
  const result=await db.query(`INSERT INTO auth_request_limits(bucket,window_start,attempts) VALUES($1,$2,1) ON CONFLICT(bucket) DO UPDATE SET window_start=CASE WHEN auth_request_limits.window_start<=$3 THEN $2 ELSE auth_request_limits.window_start END,attempts=CASE WHEN auth_request_limits.window_start<=$3 THEN 1 ELSE auth_request_limits.attempts+1 END RETURNING attempts`,[bucket,now,now-window]);
  return Number(result.rows[0].attempts)<=max;
 };
 if(!await take('global',60000,120))return false;
 if(['signin','signup','recover'].includes(action)){
  const digest=createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  if(!await take(action+':'+digest,900000,action==='signin'?20:5))return false;
 }
 await db.query('DELETE FROM auth_request_limits WHERE window_start<$1',[now-86400000]);
 return true;
}
