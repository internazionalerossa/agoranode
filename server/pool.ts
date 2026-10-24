import pg from 'pg';
import {X509Certificate} from 'node:crypto';
import type {Connections} from './database';

// PostgreSQL bigint values must never silently lose integer precision.
pg.types.setTypeParser(20,value=>{
 const number=Number(value);
 if(!Number.isSafeInteger(number))throw Error('Database integer out of range');
 return number;
});

/**
 * Verify the server certificate and hostname using an operator-configured CA.
 * Supabase's pooler uses a CA which may not be in Node's default trust roots.
 * Put the exact PEM downloaded from Supabase Database > SSL Configuration in
 * POSTGRES_CA_CERT_PEM. Never disable TLS verification or accept a client URL
 * supplied CA path. Both migrations and the HTTP server call createPool().
 */
export function postgresTlsConfig(
 connectionString:string,
 env:Record<string,string|undefined>=process.env,
):false|{rejectUnauthorized:true;ca?:string}{
 const url=new URL(connectionString);
 const local=env.NODE_ENV==='development'&&['localhost','127.0.0.1'].includes(url.hostname);
 const socket=url.searchParams.get('host')==='/var/run/postgresql';
 if(local||socket)return false;
 const ca=env.POSTGRES_CA_CERT_PEM?.replace(/\\n/g,'\n').trim();
 if(!ca)return {rejectUnauthorized:true};
 if(!/^-----BEGIN CERTIFICATE-----\s[\s\S]*-----END CERTIFICATE-----$/.test(ca))
  throw Error('POSTGRES_CA_CERT_PEM must contain a PEM X.509 CA certificate');
 try{
  const parsed=new X509Certificate(ca);
  if(!parsed.ca)throw Error('Not a CA certificate');
 }catch{throw Error('POSTGRES_CA_CERT_PEM is not a valid X.509 CA certificate');}
 return {rejectUnauthorized:true,ca:ca+'\n'};
}

export function createPool(connectionString:string,maxConnections=8){
 if(!Number.isInteger(maxConnections)||maxConnections<1||maxConnections>8)
  throw Error('Invalid connection limit');
 const url=new URL(connectionString);
 // URL sslmode/sslrootcert options can override node-postgres ssl settings.
 // All trust roots are server-side policy, never database URL query arguments.
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 return new pg.Pool({
  connectionString:url.href,max:maxConnections,idleTimeoutMillis:30000,
  connectionTimeoutMillis:5000,statement_timeout:10000,
  ssl:postgresTlsConfig(connectionString),
 });
}
export const connections=(pool:pg.Pool)=>pool as unknown as Connections;
