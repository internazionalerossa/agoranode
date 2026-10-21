import {createHash} from 'node:crypto';
import type {Connection} from './database';

export type TransactionalMailPurpose='verification'|'reset';
export const TRANSACTIONAL_MAIL_LIMITS={perRecipient:3,recipientWindowMs:15*60*1000,perHour:20,hourWindowMs:60*60*1000,perDay:100,dayWindowMs:24*60*60*1000} as const;
const HOUR_BUCKET='mail:global:hour',DAY_BUCKET='mail:global:day',RECIPIENT_PREFIX='mail:recipient:';

async function take(db:Connection,bucket:string,now:number,windowMs:number,max:number){
 const result=await db.query(`INSERT INTO auth_request_limits(bucket,window_start,attempts) VALUES($1,$2,1) ON CONFLICT(bucket) DO UPDATE SET window_start=CASE WHEN auth_request_limits.window_start<=$3 THEN $2 ELSE auth_request_limits.window_start END,attempts=CASE WHEN auth_request_limits.window_start<=$3 THEN 1 ELSE auth_request_limits.attempts+1 END RETURNING attempts`,[bucket,now,now-windowMs]);
 return Number(result.rows[0]?.attempts)<=max;
}

/** Limit actual delivery attempts per pseudonymous client, including verification mail triggered by sign-in. */
export async function allowTransactionalMailClient(db:Connection,clientKey:string,clock=Date.now){
 const key=/^[0-9a-f]{64}$/.test(clientKey)?clientKey:'unknown';
 return take(db,`mail:client:${key}`,clock(),TRANSACTIONAL_MAIL_LIMITS.recipientWindowMs,5);
}

/**
 * Fail-closed delivery quota for the only two account emails the application sends.
 * Recipient addresses are normalized and hashed before reaching persistent storage.
 */
export async function allowTransactionalMail(db:Connection,email:string,purpose:TransactionalMailPurpose,clock=Date.now){
 if(!['verification','reset'].includes(purpose))throw Error('Unsupported transactional email purpose');
 const now=clock(),digest=createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
 if(!await take(db,`${RECIPIENT_PREFIX}${purpose}:${digest}`,now,TRANSACTIONAL_MAIL_LIMITS.recipientWindowMs,TRANSACTIONAL_MAIL_LIMITS.perRecipient))return false;
 if(!await take(db,HOUR_BUCKET,now,TRANSACTIONAL_MAIL_LIMITS.hourWindowMs,TRANSACTIONAL_MAIL_LIMITS.perHour))return false;
 if(!await take(db,DAY_BUCKET,now,TRANSACTIONAL_MAIL_LIMITS.dayWindowMs,TRANSACTIONAL_MAIL_LIMITS.perDay))return false;
 await db.query(`DELETE FROM auth_request_limits WHERE bucket LIKE 'mail:%' AND window_start<$1`,[now-TRANSACTIONAL_MAIL_LIMITS.dayWindowMs]);
 return true;
}

export async function transactionalMailLimitStatus(db:Connection,clock=Date.now){
 const now=clock(),globals=await db.query('SELECT bucket,window_start,attempts FROM auth_request_limits WHERE bucket=$1 OR bucket=$2',[HOUR_BUCKET,DAY_BUCKET]);
 const row=(bucket:string)=>globals.rows.find(value=>value.bucket===bucket);
 const state=(bucket:string,windowMs:number,max:number)=>{const value=row(bucket),start=Number(value?.window_start??0),active=start>now-windowMs;return {used:active?Number(value?.attempts??0):0,max,resetsAt:active?start+windowMs:null};};
 const recipients=await db.query(`SELECT COUNT(*)::int AS count FROM auth_request_limits WHERE bucket LIKE 'mail:recipient:%' AND window_start>$1`,[now-TRANSACTIONAL_MAIL_LIMITS.recipientWindowMs]);
 return {hour:state(HOUR_BUCKET,TRANSACTIONAL_MAIL_LIMITS.hourWindowMs,TRANSACTIONAL_MAIL_LIMITS.perHour),day:state(DAY_BUCKET,TRANSACTIONAL_MAIL_LIMITS.dayWindowMs,TRANSACTIONAL_MAIL_LIMITS.perDay),activeRecipientBuckets:Number(recipients.rows[0]?.count??0)};
}

/** Removes only delivery counters. It never touches users, sessions, forum or mail credentials. */
export async function resetTransactionalMailLimits(db:Connection){
 const result=await db.query(`DELETE FROM auth_request_limits WHERE bucket LIKE 'mail:%' RETURNING bucket`);
 return result.rows.length;
}
