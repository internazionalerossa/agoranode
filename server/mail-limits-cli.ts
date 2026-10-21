import {createPool,connections} from './pool';
import {resetTransactionalMailLimits,transactionalMailLimitStatus} from './mail-limits';

const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw Error('Missing configuration: DATABASE_URL');
const action=process.argv[2],pool=createPool(connectionString),db=connections(pool);
try{
 if(action==='status'){
  const status=await transactionalMailLimitStatus(db),format=(value:{used:number;max:number;resetsAt:number|null})=>`${value.used}/${value.max}${value.resetsAt?`; si azzera alle ${new Date(value.resetsAt).toISOString()}`:''}`;
  console.log('Limite email transazionali (nessun destinatario o segreto viene mostrato):');
  console.log(`Finestra oraria: ${format(status.hour)}`);
  console.log(`Finestra 24 ore: ${format(status.day)}`);
  console.log(`Contatori destinatario attivi: ${status.activeRecipientBuckets}`);
 }else if(action==='reset'){
  const removed=await resetTransactionalMailLimits(db);
  console.log(`Azzerati ${removed} contatori email. Account, sessioni, forum, configurazione e credenziali non sono stati modificati.`);
 }else throw Error('Use status or reset');
}finally{await pool.end();}
