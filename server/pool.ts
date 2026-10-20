import pg from 'pg';
import type {Connections} from './database';
// Application IDs and millisecond timestamps are bounded below Number.MAX_SAFE_INTEGER.
pg.types.setTypeParser(20,value=>{const number=Number(value);if(!Number.isSafeInteger(number))throw Error('Database integer out of range');return number;});
export function createPool(connectionString:string){const url=new URL(connectionString);const local=process.env.NODE_ENV==='development'&&['localhost','127.0.0.1'].includes(url.hostname);for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);return new pg.Pool({connectionString:url.href,max:8,idleTimeoutMillis:30000,connectionTimeoutMillis:5000,statement_timeout:10000,ssl:local?false:{rejectUnauthorized:true}});}
export const connections=(pool:pg.Pool)=>pool as unknown as Connections;
