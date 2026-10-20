import test from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from 'tsx/esm/api';
const {isNewsArticle}=await tsImport('../app/lib/news-eligibility.ts',import.meta.url);
const {SOURCE_CATALOG}=await tsImport('../app/data/catalog.ts',import.meta.url);
const {fetchSource}=await tsImport('../app/lib/feed.ts',import.meta.url);

test('radar admission depends on approved publisher, never on a socialist keyword or a matching-looking host',()=>{
 const article={sourceId:'radar:example',feedSourceId:'radar-it-core',link:'https://news.google.com/rss/articles/example',kind:'radar'};
 for(const sourceHomepage of ['https://www.vanityfair.it/','https://vanityfair.com/','https://unknown.example/','https://ilmanifesto.it.evil.example/','https://ilmanifesto.it@evil.example/'])assert.equal(isNewsArticle({...article,sourceHomepage}),false,sourceHomepage);
 assert.equal(isNewsArticle({...article,sourceHomepage:'https://ilmanifesto.it/'}),true);
 assert.equal(isNewsArticle({...article,sourceHomepage:'https://www.jungewelt.de/'}),true);
 assert.equal(isNewsArticle({...article,sourceHomepage:'https://www.thehindu.com/'}),false);
});

test('excluded publishers cannot reappear through direct feeds or stale public cache provenance',()=>{
 assert.equal(SOURCE_CATALOG.some(source=>['the-hindu','asia-times','eff','responsible-statecraft','dawn','indian-punchline'].includes(source.id)),false);
 for(const sourceId of ['the-hindu','pulse-direct-the-hindu','old-cache'])assert.equal(isNewsArticle({sourceId,sourceHomepage:'https://thehindu.com/',link:'https://thehindu.com/news/old'}),false);
 assert.ok(SOURCE_CATALOG.some(source=>source.id==='jornal-usp'));
});

test('live radar parsing drops unapproved publishers before returning articles',async()=>{
 const source=SOURCE_CATALOG.find(source=>source.id==='radar-it-core');assert.ok(source);
 const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response('<rss><channel>'+[['Vanity Fair','https://www.vanityfair.it/'],['il manifesto','https://ilmanifesto.it/']].map(([name,url],i)=>`<item><title>Socialismo: una notizia - ${name}</title><link>https://news.google.com/rss/articles/fixture-${i}</link><source url="${url}">${name}</source><pubDate>Mon, 19 Oct 2026 19:00:00 GMT</pubDate></item>`).join('')+'</channel></rss>',{headers:{'content-type':'application/rss+xml'}});
 try{const response=await fetchSource(source,24);assert.equal(response.articles.length,1);assert.equal(response.articles[0].sourceName,'il manifesto');}finally{globalThis.fetch=old;}
});
