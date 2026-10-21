import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {Connections} from './database';

export function migrationDigests(sql:string){
 const canonicalSql=sql.replace(/\r\n?/g,'\n');
 const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
 const canonical=digest(canonicalSql);
 // Early Windows installations recorded the bytes after a CRLF checkout.
 // Accept that one representation, then rewrite the metadata to the stable
 // LF digest. No SQL content change other than line endings is accepted.
 const compatible=new Set([canonical,digest(canonicalSql.replace(/\n/g,'\r\n'))]);
 return {canonical,compatible};
}
export async function migrateDatabase(pool:Connections,directory:URL){
 const connection=await pool.connect();
 try{
  await connection.query('BEGIN');await connection.query('SELECT pg_advisory_xact_lock(194733,2)');
  await connection.query('CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of (await readdir(directory)).filter(n=>/^\d+.*\.sql$/.test(n)).sort()){
   const sql=await readFile(new URL(name,directory),'utf8'),digests=migrationDigests(sql),sha=digests.canonical;
   const old=await connection.query('SELECT sha256 FROM app_migrations WHERE name=$1',[name]);
   if(old.rows.length){
    if(!digests.compatible.has(String(old.rows[0].sha256)))throw Error('Applied migration changed: '+name);
    if(old.rows[0].sha256!==sha)await connection.query('UPDATE app_migrations SET sha256=$1 WHERE name=$2',[sha,name]);
    continue;
   }
   await connection.query(sql);await connection.query('INSERT INTO app_migrations(name,sha256) VALUES($1,$2)',[name,sha]);
  }
  await connection.query('COMMIT');
 }catch(error){await connection.query('ROLLBACK');throw error;}finally{connection.release?.();}
}
