import {connections,createPool} from './pool';
import {migrateDatabase} from './migrations';
import {importLibraryEdition,validateLibraryImportTarget} from './library-archive';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function parseLibraryImportArgs(args:string[]){
 if(args.length!==2)throw new Error('Use library-import <book-id> <language>');
 const [bookId,language]=args;validateLibraryImportTarget(bookId,language);return {bookId,language};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const {bookId,language}=parseLibraryImportArgs(process.argv.slice(2)),connectionString=process.env.DATABASE_URL;
  if(!connectionString)throw new Error('Missing configuration: DATABASE_URL');
  const pool=createPool(connectionString);
  try{
   await migrateDatabase(connections(pool),new URL('./migrations/',import.meta.url));
   const result=await importLibraryEdition(connections(pool),bookId,language);
   console.log(JSON.stringify(result));
  }finally{await pool.end();}
 }catch(error){console.error(error instanceof Error?error.message:'Library import failed');process.exitCode=1;}
}
