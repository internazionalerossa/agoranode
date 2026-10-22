import test from'node:test';import assert from'node:assert/strict';
import{viewFromUrl,viewUrl,VIEWS,newsDaysFromUrl}from'../app/lib/view-navigation.ts';
test('legacy observatory links resolve to the news collection with a six-hour period',()=>{
 for(const raw of ['https://site.example/?view=osservatorio','https://site.example/#osservatorio-sei-ore']){assert.equal(viewFromUrl(raw),'notizie');assert.equal(newsDaysFromUrl(raw),'0.25');}
 for(const view of VIEWS.filter(view=>view!=='custodia'))assert.equal(viewFromUrl('https://site.example'+viewUrl('https://site.example/',view)),view);
 assert.equal(viewFromUrl('https://site.example/?view=invalid'),'notizie');
 assert.equal(viewUrl('https://site.example/?view=osservatorio','notizie'),'/polisrossa');
});

test('navigation clears parameters owned by other areas while preserving unrelated links',()=>{const from='https://site.example/?view=teoria&storia=italia&percorso=dati&indicatore=SP.DYN.LE00.IN&evento=alfabetizzazione&persona=clara-zetkin&paesi=CUB%2CITA&dal=1980&al=2020&scala=indice&stanza=generale&proposal=topic&ref=shared#world-history-title';assert.equal(viewUrl(from,'notizie'),'/polisrossa?ref=shared');assert.equal(viewUrl(from,'partecipa'),'/polisrossa?view=partecipa&stanza=generale&proposal=topic&ref=shared');assert.equal(viewUrl(from,'teoria'),'/polisrossa?view=teoria&storia=italia&percorso=dati&indicatore=SP.DYN.LE00.IN&evento=alfabetizzazione&persona=clara-zetkin&paesi=CUB%2CITA&dal=1980&al=2020&scala=indice&ref=shared');assert.equal(viewFromUrl('https://site.example/?stanza=generale'),'partecipa');});

test('encyclopedia and chart parameters select theory directly and survive only inside theory',()=>{
 assert.equal(viewFromUrl('/?persona=clara-zetkin'),'teoria');
 assert.equal(viewFromUrl('/?evento=haymarket-1886'),'teoria');
 assert.equal(viewFromUrl('/?indicatore=life'),'teoria');
 assert.equal(viewFromUrl('/?knowledgeKind=concept&knowledgeId=collective-memory'),'teoria');
 const graph='https://site.example/?view=teoria&percorso=dati&indicatore=life&paesi=CUB%2CUSA&dal=1960&al=2024&scala=indice';
 assert.equal(viewUrl(graph,'teoria'),'/polisrossa?view=teoria&percorso=dati&indicatore=life&paesi=CUB%2CUSA&dal=1960&al=2024&scala=indice');
 assert.equal(viewUrl(graph,'fonti'),'/polisrossa?view=fonti');
 assert.equal(viewUrl('/?view=teoria&knowledgeKind=concept&knowledgeId=collective-memory','notizie'),'/polisrossa');
});

test('shared-custody page has a stable direct URL and clears private-area state',()=>{
 assert.equal(viewFromUrl('https://site.example/?view=custodia'),'custodia');
 assert.equal(viewFromUrl('https://site.example/agoranode'),'custodia');
 assert.equal(viewFromUrl('https://site.example/agoranode/'),'custodia');
 assert.equal(viewUrl('https://site.example/?view=partecipa&stanza=generale&proposal=topic','custodia'),'/');
 assert.equal(viewUrl('https://site.example/agoranode','notizie'),'/polisrossa');
 assert.equal(viewUrl('https://site.example/agoranode?ref=shared','teoria'),'/polisrossa?ref=shared&view=teoria');
});

test('shared periods survive reload and invalid periods fall back to a day',()=>{
 for(const value of ['0.25','1','Infinity'])assert.equal(newsDaysFromUrl('https://site.example/?periodo='+value),value);
 assert.equal(newsDaysFromUrl('https://site.example/?periodo=6h'),'0.25');
 assert.equal(newsDaysFromUrl('https://site.example/?periodo=bad'),'1');
 assert.equal(viewUrl('https://site.example/?periodo=6h','teoria'),'/polisrossa?view=teoria');
});

test('legacy windows resolve to a visible, available collection period',()=>{assert.equal(newsDaysFromUrl('https://site.example/?periodo=0.5'),'1');for(const value of ['3','7','30'])assert.equal(newsDaysFromUrl('https://site.example/?periodo='+value),'Infinity');});
