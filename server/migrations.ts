import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {Connections} from './database';
export async function migrateDatabase(pool:Connections,directory:URL){
 const connection=await pool.connect();
 try{
  await connection.query('BEGIN');await connection.query('SELECT pg_advisory_xact_lock(194733,2)');
  await connection.query('CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of (await readdir(directory)).filter(n=>/^\d+.*\.sql$/.test(n)).sort()){
   const sql=await readFile(new URL(name,directory),'utf8'),sha=createHash('sha256').update(sql).digest('hex');
   const old=await connection.query('SELECT sha256 FROM app_migrations WHERE name=$1',[name]);
   if(old.rows.length){if(old.rows[0].sha256!==sha)throw Error('Applied migration changed: '+name);continue;}
   await connection.query(sql);await connection.query('INSERT INTO app_migrations(name,sha256) VALUES($1,$2)',[name,sha]);
  }
  await connection.query('COMMIT');
 }catch(error){await connection.query('ROLLBACK');throw error;}finally{connection.release?.();}
}
