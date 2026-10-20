import test from 'node:test';import assert from 'node:assert/strict';
import {configuration} from '../server/config';import {createAccountMailer} from '../server/mail';
const env={APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'test-only-secret-012345678901234567890',MAIL_TRANSPORT:'brevo',BREVO_API_KEY:'test-only-key',MAIL_FROM:'PolisRossa <mail@example.test>'};
test('HTTPS verification mail needs no SMTP credentials, accepts only actual provider success and keeps secrets out of failures',async()=>{
 const config=configuration(env);assert.equal(config.smtp,undefined);
 const send=createAccountMailer(config,async(url,options)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');assert.equal(options?.redirect,'error');assert.equal(new Headers(options?.headers).get('api-key'),'test-only-key');const body=JSON.parse(String(options?.body));assert.equal(body.sender.email,'mail@example.test');assert.equal(body.to[0].email,'reader@example.test');assert.ok(body.textContent.includes('https://example.test/verify?token=test'));assert.equal(body.subject.includes('Conferma'),true);return Response.json({messageId:'test-id'},{status:201});});
 assert.equal(await send('reader@example.test','https://example.test/verify?token=test'),'test-id');
 await assert.rejects(createAccountMailer(config,async()=>new Response('secret diagnostic',{status:429}))('reader@example.test','https://example.test/verify'),/delivery unavailable/);
 await assert.rejects(createAccountMailer(config,async()=>Response.json({},{status:201}))('reader@example.test','https://example.test/verify'),/Invalid email/);
 assert.throws(()=>configuration({...env,BREVO_API_KEY:undefined}),/BREVO_API_KEY/);
});
