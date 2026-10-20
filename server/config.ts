import {publicOperator} from '../app/lib/service-info';
export function configuration(env:Record<string,string|undefined>=process.env){
 const required=(name:string)=>{const value=env[name];if(!value)throw Error('Missing configuration: '+name);return value;};
 const origin=new URL(required('APP_URL'));
 const local=env.NODE_ENV==='development'&&origin.hostname==='localhost';
 if((origin.protocol!=='https:'&&!(local&&origin.protocol==='http:'))||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('APP_URL must be an HTTPS origin');
 const secret=required('AUTH_SECRET');if(secret.length<32)throw Error('AUTH_SECRET needs at least 32 random characters');
 const connectionString=required('DATABASE_URL'),database=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(database.protocol))throw Error('DATABASE_URL must use PostgreSQL');
 if(env.NODE_ENV==='production'&&secret.startsWith('development-only'))throw Error('Replace the development auth secret');
 const mailTransport=env.MAIL_TRANSPORT??'smtp';
 if(!['smtp','brevo'].includes(mailTransport))throw Error('MAIL_TRANSPORT must be smtp or brevo');
 const smtpPort=Number(env.SMTP_PORT??465);
 if(mailTransport==='smtp'&&![465,587].includes(smtpPort)&&!(local&&smtpPort===1025))throw Error('SMTP_PORT must be 465 or 587');
 const smtp=mailTransport==='smtp'?{host:required('SMTP_HOST'),port:smtpPort,secure:smtpPort===465,requireTLS:!local,auth:{user:required('SMTP_USER'),pass:required('SMTP_PASSWORD')},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000}:undefined;
 const brevoKey=mailTransport==='brevo'?required('BREVO_API_KEY'):undefined;
 const bootstrapHash=env.COMMUNITY_BOOTSTRAP_HASH;
 if(bootstrapHash&&(!/^[0-9a-f]{64}(?:,[0-9a-f]{64}){0,2}$/.test(bootstrapHash)||new Set(bootstrapHash.split(',')).size!==bootstrapHash.split(',').length))throw Error('Invalid bootstrap hash');
 const socialProviders:Partial<Record<'discord'|'facebook',{clientId:string;clientSecret:string;disableImplicitSignUp:true}>>={};
 for(const provider of ['discord','facebook'] as const){const prefix=provider.toUpperCase(),clientId=env[prefix+'_CLIENT_ID'],clientSecret=env[prefix+'_CLIENT_SECRET'];if(Boolean(clientId)!==Boolean(clientSecret))throw Error('Configure both credentials for '+prefix);if(clientId&&clientSecret)socialProviders[provider]={clientId,clientSecret,disableImplicitSignUp:true};}
 const operator=publicOperator(env);
 if(env.NODE_ENV==='production'&&(env.REGISTRATIONS_OPEN==='true'||env.FORUM_OPEN==='true')&&!operator)throw Error('Configure PUBLIC_OPERATOR_NAME and PUBLIC_PRIVACY_CONTACT before opening registrations or participation');
 return {operator,socialProviders,registrationOpen:env.REGISTRATIONS_OPEN==='true',forumOpen:env.FORUM_OPEN==='true',origin:origin.origin,secret,connectionString,bootstrapHash,port:Number(env.PORT??8000),mailTransport,smtp,brevoKey,mailFrom:required('MAIL_FROM').replace(/[\r\n]/g,'')};
}
