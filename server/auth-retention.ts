import type {PostgresDatabase} from './database';

export const AUTH_RETENTION_INTERVAL_MS=24*60*60*1000;
export const AUTH_LIMIT_RETENTION_MS=24*60*60*1000;
export const UNVERIFIED_ACCOUNT_RETENTION_MS=7*24*60*60*1000;
export const FACEBOOK_GRANT_RETENTION_MS=24*60*60*1000;
type RetentionTimer={unref():unknown};
type RetentionScheduler=(callback:()=>void,delay:number)=>RetentionTimer;

/** Remove expired auth artifacts, abandoned grants and empty unverified accounts. */
export async function purgeAuthenticationState(db:PostgresDatabase,now=Date.now()){
 const [sessions,verifications,limits,unverifiedUsers,facebookGrants]=await db.batch([
  db.prepare(`DELETE FROM "session" session_row WHERE session_row."expiresAt"<NOW() OR NOT EXISTS (SELECT 1 FROM "account" account_row WHERE account_row."userId"=session_row."userId" AND account_row."providerId"='credential' AND account_row."password" IS NOT NULL) RETURNING session_row.id`),
  db.prepare(`DELETE FROM "verification" WHERE "expiresAt"<NOW() RETURNING id`),
  db.prepare(`DELETE FROM auth_request_limits WHERE window_start<? RETURNING bucket`).bind(now-AUTH_LIMIT_RETENTION_MS),
  db.prepare(`DELETE FROM "user" user_row WHERE user_row."emailVerified"=FALSE AND user_row."createdAt"<TO_TIMESTAMP(? / 1000.0) AND EXISTS (SELECT 1 FROM "account" account_row WHERE account_row."userId"=user_row.id AND account_row."providerId"='credential' AND account_row."password" IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "account" account_row WHERE account_row."userId"=user_row.id AND account_row."providerId"<>'credential') AND NOT EXISTS (SELECT 1 FROM "session" session_row WHERE session_row."userId"=user_row.id) AND NOT EXISTS (SELECT 1 FROM bookmarks bookmark_row WHERE bookmark_row.owner_id=user_row.id) AND NOT EXISTS (SELECT 1 FROM reading_progress progress_row WHERE progress_row.owner_id=user_row.id) RETURNING user_row.id`).bind(now-UNVERIFIED_ACCOUNT_RETENTION_MS),
  db.prepare(`DELETE FROM "account" WHERE "providerId"='facebook' AND "updatedAt"<TO_TIMESTAMP(? / 1000.0) RETURNING id`).bind(now-FACEBOOK_GRANT_RETENTION_MS),
 ]);
 return {sessions:sessions.results.length,verifications:verifications.results.length,limits:limits.results.length,unverifiedUsers:unverifiedUsers.results.length,facebookGrants:facebookGrants.results.length};
}

export function startAuthenticationRetention(run:()=>void,schedule:RetentionScheduler=(callback,delay)=>setInterval(callback,delay)){
 run();const timer=schedule(run,AUTH_RETENTION_INTERVAL_MS);timer.unref();return timer;
}
