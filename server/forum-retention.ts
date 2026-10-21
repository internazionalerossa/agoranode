import type {PostgresDatabase} from './database';

export const FORUM_APPLICATION_RETENTION_MS=30*24*60*60*1000;
export const FORUM_APPLICATION_RETENTION_INTERVAL_MS=24*60*60*1000;

type RetentionTimer={unref():unknown};
type RetentionScheduler=(callback:()=>void,delay:number)=>RetentionTimer;

/**
 * Remove application details only after the review window and retention period.
 * Append-only forum events remain as opaque audit identifiers.
 */
export async function purgeForumApplications(db:PostgresDatabase,now=Date.now()){
 const cutoff=now-FORUM_APPLICATION_RETENTION_MS;
 const [result]=await db.batch([db.prepare(`WITH stale AS MATERIALIZED (
  SELECT member.id
  FROM forum_members member
  WHERE (member.status='pending' AND member.deadline<=?)
     OR (member.status='rejected' AND COALESCE((
       SELECT MAX(event.created_at)
       FROM forum_events event
       WHERE event.kind='membership'
         AND event.entity_id=member.id
         AND event.detail::jsonb->>'to'='rejected'
     ),member.deadline)<=?)
 ), removed_votes AS (
  DELETE FROM forum_admission_votes vote
  USING stale
  WHERE vote.candidate_id=stale.id OR vote.member_id=stale.id
 ), removed_electorate AS (
  DELETE FROM forum_admission_electorate electorate
  USING stale
  WHERE electorate.candidate_id=stale.id OR electorate.member_id=stale.id
 )
 DELETE FROM forum_members member
 USING stale
 WHERE member.id=stale.id
 RETURNING member.id`).bind(cutoff,cutoff)]);
 return result.results.length;
}

/** Start once immediately and then repeat without depending on forum reads. */
export function startForumApplicationRetention(
 run:()=>void,
 schedule:RetentionScheduler=(callback,delay)=>setInterval(callback,delay),
){
 run();
 const timer=schedule(run,FORUM_APPLICATION_RETENTION_INTERVAL_MS);
 timer.unref();
 return timer;
}
