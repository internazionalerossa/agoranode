import {publicOperator} from '../app/lib/service-info';
export function configuration(env:Record<string,string|undefined>=process.env){
 const required=(name:string)=>{const value=env[name];if(!value)throw Error('Missing configuration: '+name);return value;};
 const origin=new URL(required('APP_URL'));
 const local=env.NODE_ENV==='development'&&origin.hostname==='localhost';
 if((origin.protocol!=='https:'&&!(local&&origin.protocol==='http:'))||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('APP_URL must be an HTTPS origin');
 const secret=required('AUTH_SECRET');if(secret.length<32)throw Error('AUTH_SECRET needs at least 32 random characters');
 const connectionString=required('DATABASE_URL');let database:URL;try{database=new URL(connectionString);}catch{throw Error('DATABASE_URL has an invalid format; URL-encode the database password');}
 if(!['postgres:','postgresql:'].includes(database.protocol))throw Error('DATABASE_URL must use PostgreSQL');
 if(env.NODE_ENV==='production'&&secret.startsWith('development-only'))throw Error('Replace the development auth secret');
 const mirror=env.MIRROR_MODE==='true';
 const mailTransport=mirror?'none':env.MAIL_TRANSPORT??'none';
 if(!['none','smtp','brevo'].includes(mailTransport))throw Error('MAIL_TRANSPORT must be none, smtp or brevo');
 const smtpPort=Number(env.SMTP_PORT??465);
 if(mailTransport==='smtp'&&![465,587].includes(smtpPort)&&!(local&&smtpPort===1025))throw Error('SMTP_PORT must be 465 or 587');
 const smtpHost=mailTransport==='smtp'?required('SMTP_HOST').trim():'',smtpUser=mailTransport==='smtp'?required('SMTP_USER').trim():'';
 if(mailTransport==='smtp'&&(!smtpHost||!smtpUser))throw Error('SMTP_HOST and SMTP_USER cannot be blank');
 const smtp=mailTransport==='smtp'?{host:smtpHost,port:smtpPort,secure:smtpPort===465,requireTLS:!local&&smtpPort===587,auth:{user:smtpUser,pass:required('SMTP_PASSWORD')},...(!local?{tls:{minVersion:'TLSv1.2' as const}}:{}),connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000}:undefined;
 const brevoKey=mailTransport==='brevo'?required('BREVO_API_KEY'):undefined;
 const bootstrapHash=env.COMMUNITY_BOOTSTRAP_HASH;
 if(bootstrapHash&&(!/^[0-9a-f]{64}(?:,[0-9a-f]{64}){0,2}$/.test(bootstrapHash)||new Set(bootstrapHash.split(',')).size!==bootstrapHash.split(',').length))throw Error('Invalid bootstrap hash');
 const accountAccessHash=env.ACCOUNT_ACCESS_HASH?.trim();
 if(accountAccessHash&&!/^[0-9a-f]{64}$/.test(accountAccessHash))throw Error('ACCOUNT_ACCESS_HASH must be one SHA-256 hash');
 const socialProviders:Partial<Record<'facebook',{clientId:string;clientSecret:string;disableImplicitSignUp:true;disableDefaultScope:true;scope:string[]}>>={};
 for(const provider of ['facebook'] as const){
  const prefix=provider.toUpperCase(),clientId=env[prefix+'_CLIENT_ID'],clientSecret=env[prefix+'_CLIENT_SECRET'];
  if(Boolean(clientId)!==Boolean(clientSecret))throw Error('Configure both credentials for '+prefix);
  if(!mirror&&clientId&&clientSecret)socialProviders[provider]={clientId,clientSecret,disableImplicitSignUp:true,disableDefaultScope:true,scope:['public_profile']};
 }
 const operator=publicOperator(env);
 const registrationOpen=!mirror&&env.REGISTRATIONS_OPEN==='true',forumOpen=!mirror&&env.FORUM_OPEN==='true';
 const mailFrom=mailTransport==='none'?'':required('MAIL_FROM');
 if(/[\r\n]/.test(mailFrom))throw Error('MAIL_FROM must be a single line');
 if(mailFrom){const address=mailFrom.match(/<([^<>]+)>$/)?.[1]??mailFrom;if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address.trim()))throw Error('MAIL_FROM must contain a valid email address');}
 if(smtp?.host.toLowerCase()==='smtp.gmail.com'){
  const address=(mailFrom.match(/<([^<>]+)>$/)?.[1]??mailFrom).trim().toLowerCase(),user=smtp.auth.user.trim().toLowerCase();
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(user)||address!==user)throw Error('Gmail SMTP requires SMTP_USER and MAIL_FROM to use the same verified email address');
 }
 if(env.NODE_ENV==='production'&&!mirror){
  if((registrationOpen||forumOpen)&&!operator)throw Error('Configure PUBLIC_OPERATOR_NAME and PUBLIC_PRIVACY_CONTACT before opening registrations or participation');
  if((registrationOpen||forumOpen)&&mailTransport==='none')throw Error('Configure verified email delivery before opening registrations or participation');
  if((registrationOpen||forumOpen)&&!accountAccessHash)throw Error('Configure the private account access code before opening registrations or participation');
  if(forumOpen&&(!bootstrapHash||bootstrapHash.split(',').length!==3))throw Error('Configure three distinct founder invitation hashes before opening participation');
 }
 return {mirror,operator,socialProviders,registrationOpen,forumOpen,origin:origin.origin,secret,connectionString,bootstrapHash,accountAccessHash,port:Number(env.PORT??8000),mailTransport,smtp,brevoKey,mailFrom};
}
