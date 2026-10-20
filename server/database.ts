/** Shared statement contract for the API; PostgreSQL owns persistence and transactions. */
export type QueryResult={rows:Record<string,unknown>[];rowCount?:number|null;affectedRows?:number};
export type Connection={query(sql:string,values?:unknown[]):Promise<QueryResult>;release?():void};
export type Connections=Connection&{connect():Promise<Connection>};
const photoLookup="SELECT value FROM public_news_cache, json_each(body) WHERE cache_key LIKE 'photo-references-v1:radar-%' AND expires_at > ? AND json_extract(value, '$.id') = ? AND json_extract(value, '$.sourceId') = ? LIMIT 1";
export function postgresSql(query:string){
 if(query===photoLookup)return "SELECT item::text AS value FROM public_news_cache CROSS JOIN LATERAL jsonb_array_elements(body::jsonb) item WHERE cache_key LIKE 'photo-references-v1:radar-%' AND expires_at > $1 AND item->>'id' = $2 AND item->>'sourceId' = $3 LIMIT 1";
 let index=0,quoted=false,result='';
 for(let i=0;i<query.length;i++){
  const c=query[i];
  if(c==="'"){result+=c;if(quoted&&query[i+1]==="'"){result+=query[++i];continue;}quoted=!quoted;continue;}
  result+=c==='?'&&!quoted?'$'+(++index):c;
 }
 return result;
}
export class PostgresDatabase{
 constructor(readonly pool:Connections){}
 prepare(sql:string){return new Statement(this,postgresSql(sql));}
 async batch(statements:Statement[]){
  if(statements.some(s=>s.database!==this))throw Error('Mixed database transaction');
  const connection=await this.pool.connect();
  try{
   await connection.query('BEGIN');
   // Serialize membership and electorate decisions across application replicas.
   await connection.query('SELECT pg_advisory_xact_lock(194733,1)');
   const results=[];
   for(const statement of statements)results.push(await statement.execute(connection));
   await connection.query('COMMIT');return results;
  }catch(error){await connection.query('ROLLBACK');throw error;}finally{connection.release?.();}
 }
}
class Statement{
 constructor(readonly database:PostgresDatabase,readonly sql:string,readonly values:unknown[]=[] ){}
 bind(...values:unknown[]){return new Statement(this.database,this.sql,values);}
 async execute(connection:Connection){const result=await connection.query(this.sql,this.values);return {results:result.rows,meta:{changes:result.rowCount??result.affectedRows??0}};}
 all(){return this.execute(this.database.pool);}
 run(){return this.execute(this.database.pool);}
 async first<T>():Promise<T|null>{return ((await this.all()).results[0] as T|undefined)??null;}
}
