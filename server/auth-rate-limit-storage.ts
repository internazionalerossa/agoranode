import {createHmac} from 'node:crypto';
import type {BetterAuthRateLimitStorage} from '@better-auth/core';
import type {Connection} from './database';

/** Persist Better Auth counters without ever storing its raw IP/path key. */
export function persistentAuthRateLimitStorage(db:Connection,secret:string,clock=Date.now):BetterAuthRateLimitStorage{
 return {consume:async(key,{window,max})=>{
  const now=clock(),windowMs=Math.max(1,window)*1000;
  const digest=createHmac('sha256',secret).update(key).digest('hex');
  const result=await db.query(`INSERT INTO auth_request_limits(bucket,window_start,attempts) VALUES($1,$2,1) ON CONFLICT(bucket) DO UPDATE SET window_start=CASE WHEN auth_request_limits.window_start<=$3 THEN $2 ELSE auth_request_limits.window_start END,attempts=CASE WHEN auth_request_limits.window_start<=$3 THEN 1 ELSE auth_request_limits.attempts+1 END RETURNING window_start,attempts`,[`ba:${digest}`,now,now-windowMs]);
  const row=result.rows[0],attempts=Number(row?.attempts??Number.POSITIVE_INFINITY),start=Number(row?.window_start??now),allowed=attempts<=max;
  return {allowed,retryAfter:allowed?null:Math.max(1,Math.ceil((start+windowMs-now)/1000))};
 }};
}
