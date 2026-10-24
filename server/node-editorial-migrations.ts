import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {Connections} from './database';

/**
 * A node-specific, single-schema migration. This deliberately does not apply
 * PolisRossa's account or legacy forum migrations to another node database.
 */
export async function migrateNodeEditorialDatabase(pool:Connections):Promise<void>{
 const migrations=[
  {version:1,file:'019-node-editorial-pr2.sql'},
  {version:2,file:'020-node-forum.sql'},
 ];
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  await c.query('SELECT pg_advisory_xact_lock(194733,8)');
  await c.query('CREATE TABLE IF NOT EXISTS node_editorial_schema_versions (version integer PRIMARY KEY, digest text NOT NULL)');
  for(const migration of migrations){
   const sql=await readFile(new URL('./migrations/'+migration.file,import.meta.url),'utf8');
   const digest=createHash('sha256').update(sql.replace(/\\r\\n?/g,'\\n')).digest('hex');
   const existing=await c.query('SELECT digest FROM node_editorial_schema_versions WHERE version=$1',[migration.version]);
   if(existing.rows.length){
    if(existing.rows[0].digest!==digest)throw Error('Node editorial schema changed after installation');
   }else{
    await c.query(sql);
    await c.query('INSERT INTO node_editorial_schema_versions(version,digest) VALUES($1,$2)',[migration.version,digest]);
   }
  }
  await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release?.();}
}
