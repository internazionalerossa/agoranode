import pg from 'pg';
import type {Connections} from './database';
pg.types.setTypeParser(20,value=>{const number=Number(value);if(!Number.isSafeInteger(number))throw Error('Database integer out of range');return number;});

/**
 * TLS is always verified in production. Some managed PostgreSQL providers use
 * a private issuing CA not present in the Node.js default trust store.
 * Set PG_SSL_CA_PEM to the provider's verified PEM certificate chain.
 * Never set rejectUnauthorized=false or NODE_TLS_REJECT_UNAUTHORIZED=0.
 */
export function postgresTlsOptions(connectionString:string,env:NodeJS.ProcessEnv=process.env){
 const url=new URL(connectionString);
 const socket=url.searchParams.get('host')==='/var/run/postgresql';
 const local=env.NODE_ENV==='development'&&['localhost','127.0.0.1'].includes(url.hostname);
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 if(local||socket)return {connectionString:url.href,ssl:false as const};
 const ca=env.PG_SSL_CA_PEM?.replace(/\\n/g,'\n').trim();
 if(ca&&(!ca.includes('-----BEGIN CERTIFICATE-----')||!ca.includes('-----END CERTIFICATE-----')||ca.length>32768))
  throw Error('Invalid PG_SSL_CA_PEM: configure an authentic provider CA certificate chain');
 return {connectionString:url.href,ssl:ca?{rejectUnauthorized:true,ca,servername:url.hostname}:{rejectUnauthorized:true,servername:url.hostname}};
}
export function createPool(connectionString:string,maxConnections=8){
 if(!Number.isInteger(maxConnections)||maxConnections<1||maxConnections>8)throw Error('Invalid connection limit');
 return new pg.Pool({...postgresTlsOptions(connectionString),max:maxConnections,
  idleTimeoutMillis:30000,connectionTimeoutMillis:5000,statement_timeout:10000});
}
export const connections=(pool:pg.Pool)=>pool as unknown as Connections;
