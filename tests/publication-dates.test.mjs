import test from'node:test';import assert from'node:assert/strict';
import{tsImport}from'tsx/esm/api';const{fetchSource}=await tsImport('../app/lib/feed.ts',import.meta.url);import{rankPulse}from'../app/lib/pulse.ts';
const NOW=Date.parse('2026-10-19T20:00:00Z');
const source={id:'publication-regression',name:'Test Publisher',homepage:'https://publication.example/',feedUrls:['https://publication.example/feed'],region:'Europa',country:'Italia',language:'it',kind:'giornale',ideologies:[],tags:[],priority:1};
test('a recent update or undated time cannot turn an old publication into a six-hour story',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(`<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>old</id><title>Published three days ago</title><link href="https://publication.example/old"/><published>2026-10-16T12:00:00Z</published><updated>2026-10-19T19:55:00Z</updated></entry><entry><id>update-only</id><title>Only updated</title><link href="https://publication.example/update"/><updated>2026-10-19T19:55:00Z</updated></entry><entry><id>day-only</id><title>No time supplied</title><link href="https://publication.example/day"/><published>2026-10-19</published></entry><entry><id>new</id><title>Actual recent publication</title><link href="https://publication.example/new"/><published>2026-10-19T19:00:00Z</published></entry></feed>`,{headers:{'content-type':'application/atom+xml'}});
 try{const {articles}=await fetchSource(source,24);assert.equal(articles.length,4);assert.equal(articles.find(a=>a.link.endsWith('/update')).publishedAt,null);assert.equal(articles.find(a=>a.link.endsWith('/day')).publishedAt,null);const recent=rankPulse(articles,NOW);assert.equal(recent.length,1);assert.ok(recent[0].article.link.endsWith('/new'));}finally{globalThis.fetch=original;}
});

test('verified store sections never become news, including cached copies, but saved records remain intact',async()=>{
 const {isNewsArticle}=await import('../app/lib/news-eligibility.ts');
 const {restoreNewsSnapshot,restoreSavedArticles}=await import('../app/lib/reading.ts');
 const original=globalThis.fetch;
 const sourceWithStore={...source,id:'revista-crisis',homepage:'https://revistacrisis.com.ar/',feedUrls:['https://revistacrisis.com.ar/sitemap.rss']};
 globalThis.fetch=async()=>new Response(`<rss><channel><item><title>A subscription offer</title><link>https://revistacrisis.com.ar/tienda/suscripcion-digital-papel/</link><pubDate>Mon, 19 Oct 2026 19:59:00 GMT</pubDate></item><item><title>Reporting on shop workers</title><link>https://revistacrisis.com.ar/notas/shop-workers</link><pubDate>Mon, 19 Oct 2026 19:00:00 GMT</pubDate></item></channel></rss>`,{headers:{'content-type':'application/rss+xml'}});
 try {
  const result=await fetchSource(sourceWithStore,24);
  assert.equal(result.articles.length,1);assert.equal(result.articles[0].title,'Reporting on shop workers');
  const news=result.articles[0];const store={...news,id:'store',link:'https://revistacrisis.com.ar/tienda/ultimo-numero/'};
  assert.equal(isNewsArticle(store),false);
  assert.equal(isNewsArticle({...store,sourceId:'radar:example',feedSourceId:'revista-crisis'}),false);
  assert.equal(isNewsArticle({...store,sourceId:'other-publisher',feedSourceId:'other-publisher'}),true);
  assert.deepEqual(restoreNewsSnapshot(JSON.stringify({updatedAt:NOW,articles:[store,news]}),NOW).articles.map(a=>a.id),[news.id]);
  assert.equal(restoreSavedArticles(JSON.stringify([store])).length,1);
  assert.equal(rankPulse([store,news],NOW).length,1);
 } finally {globalThis.fetch=original;}
});
