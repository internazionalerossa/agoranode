import test from'node:test';import assert from'node:assert/strict';
import{viewFromUrl,viewUrl,VIEWS}from'../app/lib/view-navigation.ts';
test('observatory links open a separate view on clicks, reload and legacy anchors',()=>{
 for(const raw of ['https://site.example/?view=osservatorio','https://site.example/#osservatorio-sei-ore'])assert.equal(viewFromUrl(raw),'osservatorio');
 assert.equal(viewUrl('https://site.example/?view=teoria&storia=italia#vecchio','osservatorio'),'/?view=osservatorio');
 for(const view of VIEWS)assert.equal(viewFromUrl('https://site.example'+viewUrl('https://site.example/',view)),view);
 assert.equal(viewFromUrl('https://site.example/?view=invalid'),'notizie');
 assert.equal(viewUrl('https://site.example/?view=osservatorio','notizie'),'/');
});

test('navigation clears parameters owned by other areas while preserving unrelated links',()=>{const from='https://site.example/?view=teoria&storia=italia&percorso=conquiste&indicatore=SP.DYN.LE00.IN&stanza=generale&proposal=topic&ref=shared#world-history-title';assert.equal(viewUrl(from,'notizie'),'/?ref=shared');assert.equal(viewUrl(from,'partecipa'),'/?view=partecipa&stanza=generale&proposal=topic&ref=shared');assert.equal(viewUrl(from,'teoria'),'/?view=teoria&storia=italia&percorso=conquiste&indicatore=SP.DYN.LE00.IN&ref=shared');assert.equal(viewFromUrl('https://site.example/?stanza=generale'),'partecipa');});
