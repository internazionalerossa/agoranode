import {getMigrations} from 'better-auth/db/migration';
import {configuration} from './config';
import {createPool,connections} from './pool';
import {createAuth} from './auth';
import {migrateDatabase} from './migrations';
const config=configuration(),pool=createPool(config.connectionString);
try{
 await migrateDatabase(connections(pool),new URL('./migrations/',import.meta.url));
 const {auth}=createAuth(pool,config),migration=await getMigrations(auth.options);
 await migration.runMigrations();console.info('Database migrations completed');
}finally{await pool.end();}
