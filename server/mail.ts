import nodemailer from 'nodemailer';
import type {configuration} from './config';
export function createAccountMailer(config:ReturnType<typeof configuration>,fetcher:typeof fetch=fetch){
 const smtp=config.mailTransport==='smtp'?nodemailer.createTransport(config.smtp!):null;
 return async(to:string,url:string,reset=false)=>{
  const subject=reset?'PolisRossa · Recupero dell’account':'PolisRossa · Conferma la tua email';
  const text=reset?'Per scegliere una nuova password apri questo collegamento: '+url:'Conferma la tua email per attivare l’account personale: '+url;
  if(smtp)return smtp.sendMail({from:config.mailFrom,to,subject,text});
  const email=config.mailFrom.match(/<([^<>]+)>$/)?.[1]??config.mailFrom;
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw Error('Invalid verified email sender');
  const response=await fetcher('https://api.brevo.com/v3/smtp/email',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json',accept:'application/json','api-key':config.brevoKey!},body:JSON.stringify({sender:{email,name:'PolisRossa'},to:[{email:to}],subject,textContent:text})});
  if(response.status!==201){await response.body?.cancel();throw Error('Authentication email delivery unavailable');}
  const data=await response.json();if(typeof data.messageId!=='string')throw Error('Invalid email delivery response');
  return data.messageId;
 };
}
