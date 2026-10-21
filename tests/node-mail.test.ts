import test from 'node:test';import assert from 'node:assert/strict';
import {configuration} from '../server/config';import {createAccountMailer} from '../server/mail';import {INSTANCE_NAME} from '../app/lib/instance';
const env={APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'test-only-secret-012345678901234567890',MAIL_TRANSPORT:'brevo',BREVO_API_KEY:'test-only-key',MAIL_FROM:'PolisRossa <mail@example.test>'};
test('HTTPS verification mail needs no SMTP credentials, accepts only actual provider success and keeps secrets out of failures',async()=>{
 const config=configuration(env);assert.equal(config.smtp,undefined);
 const send=createAccountMailer(config,async(url,options)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');assert.equal(options?.redirect,'error');assert.equal(new Headers(options?.headers).get('api-key'),'test-only-key');const body=JSON.parse(String(options?.body));assert.equal(body.sender.email,'mail@example.test');assert.equal(body.sender.name,INSTANCE_NAME);assert.equal(body.to[0].email,'reader@example.test');assert.ok(body.textContent.includes('https://example.test/verify?token=test'));assert.equal(body.subject,`${INSTANCE_NAME} · Conferma la tua email`);return Response.json({messageId:'test-id'},{status:201});});
 assert.equal(await send('reader@example.test','https://example.test/verify?token=test'),'test-id');
 await assert.rejects(createAccountMailer(config,async()=>new Response('secret diagnostic',{status:429}))('reader@example.test','https://example.test/verify'),/delivery unavailable/);
 await assert.rejects(createAccountMailer(config,async()=>Response.json({},{status:201}))('reader@example.test','https://example.test/verify'),/Invalid email/);
 assert.throws(()=>configuration({...env,BREVO_API_KEY:undefined}),/BREVO_API_KEY/);
});
test('Gmail SMTP uses implicit TLS on 465 or mandatory STARTTLS on 587 with the authenticated sender',()=>{
 const gmail={APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'test-only-secret-012345678901234567890',NODE_ENV:'production',MAIL_TRANSPORT:'smtp',SMTP_HOST:'smtp.gmail.com',SMTP_USER:'project.sender@gmail.com',SMTP_PASSWORD:'test-only-app-password',MAIL_FROM:'PolisRossa <project.sender@gmail.com>'};
 const implicit=configuration(gmail).smtp!;
 assert.equal(implicit.port,465);assert.equal(implicit.secure,true);assert.equal(implicit.requireTLS,false);assert.equal(implicit.tls?.minVersion,'TLSv1.2');
 const starttls=configuration({...gmail,SMTP_PORT:'587'}).smtp!;
 assert.equal(starttls.port,587);assert.equal(starttls.secure,false);assert.equal(starttls.requireTLS,true);assert.equal(starttls.tls?.minVersion,'TLSv1.2');
 assert.throws(()=>configuration({...gmail,MAIL_FROM:'PolisRossa <another@gmail.com>'}),/same verified email address/);
 assert.throws(()=>configuration({...gmail,SMTP_USER:'not-an-email'}),/same verified email address/);
});
