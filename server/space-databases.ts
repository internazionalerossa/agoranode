/**
 * Explicit one-PostgreSQL-database-per-community connection registry.
 * Prevents two local thematic spaces from accidentally selecting the same
 * PostgreSQL database, even when the users/passwords differ. A registry is
 * not a replacement for independent DB roles and real integration tests.
 */
import {createPool} from './pool';

export type SpaceDatabaseInput = {spaceId:string; connectionString:string};
const SPACE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function databaseTarget(connectionString: string): string {
  let url: URL;
  try {url=new URL(connectionString);} catch {throw Error('Invalid space database URL');}
  if(!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname ||
     !url.pathname || url.pathname === '/' || url.hash ||
     !url.pathname.startsWith('/')) throw Error('Space must use an explicit PostgreSQL database');
  let dbName: string;
  try {dbName=decodeURIComponent(url.pathname.slice(1));} catch {throw Error('Invalid database name encoding');}
  if(!dbName || dbName.includes('/') || dbName.includes('\0') || dbName.includes('\\')) throw Error('Invalid database name');
  // Reject libpq options that could secretly override host/database/search_path.
  const allowedOptions=new Set(['sslmode','sslcert','sslkey','sslrootcert']);
  for(const key of url.searchParams.keys()) if(!allowedOptions.has(key)) throw Error('Unsafe PostgreSQL connection option');
  const host=url.hostname.toLowerCase();
  // The connection target excludes credentials by design.
  return host+':'+(url.port||'5432')+'/'+dbName;
}

export function validateSpaceDatabaseInputs(inputs: readonly SpaceDatabaseInput[]): void {
  if(inputs.length<1)throw Error('At least one community database is required');
  const spaces=new Set<string>(),targets=new Set<string>();
  for(const {spaceId,connectionString} of inputs) {
    if(!SPACE_ID.test(spaceId)||spaceId.length>64||spaces.has(spaceId)) throw Error('Duplicate or invalid space ID');
    const target=databaseTarget(connectionString);
    if(targets.has(target))throw Error('Two communities cannot share a PostgreSQL database');
    spaces.add(spaceId);
    targets.add(target);
  }
}

export function openSpaceDatabaseRegistry<T extends {end(): Promise<unknown>}>(
  inputs:readonly SpaceDatabaseInput[],
  factory:(connectionString:string)=>T = createPool as unknown as (connectionString:string)=>T,
) {
  validateSpaceDatabaseInputs(inputs);
  const pools=new Map<string,T>();
  for(const entry of inputs) pools.set(entry.spaceId,factory(entry.connectionString));
  return {
    get(spaceId:string): T {
      const pool=pools.get(spaceId);
      if(!pool)throw Error('Unknown community database');
      return pool;
    },
    ids(): string[] {return [...pools.keys()];},
    async close() {await Promise.all([...pools.values()].map(pool=>pool.end()));},
  };
}
