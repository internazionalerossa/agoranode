import {databaseTarget} from './space-databases';

/** Fail closed before opening the origin alpha's own PostgreSQL connection. */
export function validateAgoraSeedDatabase(agoraUrl:string,polisrossaUrl:string){
 if(!agoraUrl||!polisrossaUrl||databaseTarget(agoraUrl)===databaseTarget(polisrossaUrl))
  throw Error('Agorà requires a distinct PostgreSQL database from PolisRossa');
}
